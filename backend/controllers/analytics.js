/**
 * controllers/analytics.js  –  Fully decentralised (no MongoDB)
 *
 * All analytics computed in-memory from IPFS/blockchain data.
 * Queries use getAllRecordsOfType() to fetch all records then filter.
 */

const asyncHandler = require('../middleware/async');
const blockchain = require('../services/blockchain');

// ── Helpers ────────────────────────────────────────────────────────────────

const getStudentIds = async (filter = {}) => {
    const all = await blockchain.getAllRecordsOfType('user');
    return all
        .map(r => r.data)
        .filter(u => {
            if (u.role !== 'Student') return false;
            if (filter.branch && u.studentProfile?.branch !== filter.branch) return false;
            if (filter.section && u.studentProfile?.section !== filter.section) return false;
            if (filter.admissionYear && u.studentProfile?.admissionYear !== filter.admissionYear) return false;
            return true;
        });
};

const getAllAchievements = async () => {
    const all = await blockchain.getAllRecordsOfType('achievement');
    return all.map(r => r.data);
};

// ── Route Handlers ────────────────────────────────────────────────────────────

// @desc    Overall analytics
// @route   GET /api/analytics/overall
exports.getOverallAnalytics = asyncHandler(async (req, res, next) => {
    let achievements = await getAllAchievements();

    // HOD → filter by own department
    if (req.user.role === 'HOD') {
        const dept = req.user.facultyProfile?.department;
        const deptStudIds = new Set((await getStudentIds({ branch: dept })).map(u => u.id));
        achievements = achievements.filter(a => deptStudIds.has(a.user));
    }

    // 1. By type
    const byTypeMap = {};
    achievements.forEach(a => { byTypeMap[a.type] = (byTypeMap[a.type] || 0) + 1; });
    const byType = Object.entries(byTypeMap).map(([_id, count]) => ({ _id, count })).sort((a, b) => b.count - a.count);

    // 2. By status
    const byStatusMap = {};
    achievements.forEach(a => { byStatusMap[a.status] = (byStatusMap[a.status] || 0) + 1; });
    const byStatus = Object.entries(byStatusMap).map(([_id, count]) => ({ _id, count }));

    // 3. Total
    const total = achievements.length;

    // 4. Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const byMonthMap = {};
    achievements
        .filter(a => new Date(a.createdAt) >= sixMonthsAgo)
        .forEach(a => {
            const key = a.createdAt?.substring(0, 7) || 'unknown';
            byMonthMap[key] = (byMonthMap[key] || 0) + 1;
        });
    const byMonth = Object.entries(byMonthMap)
        .map(([_id, count]) => ({ _id, count }))
        .sort((a, b) => a._id.localeCompare(b._id));

    res.status(200).json({
        success: true,
        data: {
            total, byType, byStatus, byMonth,
            department: req.user.role === 'HOD' ? req.user.facultyProfile?.department : 'All'
        }
    });
});

// @desc    Department analytics
// @route   GET /api/analytics/department
exports.getDepartmentAnalytics = asyncHandler(async (req, res, next) => {
    let achievements = await getAllAchievements();

    if (req.query.department) {
        const deptStudIds = new Set((await getStudentIds({ branch: req.query.department })).map(u => u.id));
        achievements = achievements.filter(a => deptStudIds.has(a.user));
    }

    // Group by type + status
    const grouped = {};
    achievements.forEach(a => {
        if (!grouped[a.type]) grouped[a.type] = { _id: a.type, total: 0, statuses: {} };
        grouped[a.type].total++;
        grouped[a.type].statuses[a.status] = (grouped[a.type].statuses[a.status] || 0) + 1;
    });

    const departmentStats = Object.values(grouped).map(g => ({
        _id: g._id,
        total: g.total,
        statuses: Object.entries(g.statuses).map(([status, count]) => ({ status, count }))
    }));

    res.status(200).json({ success: true, data: departmentStats });
});

// @desc    Department users (students + faculty)
// @route   GET /api/analytics/department-users
exports.getDepartmentUsers = asyncHandler(async (req, res, next) => {
    const { type } = req.query;

    let department;
    if (req.user.role === 'HOD') {
        department = req.user.facultyProfile?.department;
    } else {
        department = req.query.department || null;
    }

    const all = await blockchain.getAllRecordsOfType('user');
    let users = all.map(r => r.data);

    if (type === 'Student') {
        users = users.filter(u => {
            if (u.role !== 'Student') return false;
            if (department && u.studentProfile?.branch !== department) return false;
            if (req.query.section && u.studentProfile?.section !== req.query.section.toUpperCase()) return false;
            if (req.query.year) {
                const now = new Date();
                const month = now.getMonth() + 1;
                const curYear = now.getFullYear();
                const yr = parseInt(req.query.year);
                const admYear = month >= 7 ? curYear - yr + 1 : curYear - yr;
                if (u.studentProfile?.admissionYear !== admYear) return false;
            }
            return true;
        });
        users = users.map(u => {
            const { passwordHash, ...pub } = u;
            return pub;
        });

    } else if (type === 'Faculty') {
        users = users.filter(u => {
            if (!['Faculty', 'ClassTeacher', 'HOD'].includes(u.role)) return false;
            if (department && u.facultyProfile?.department !== department) return false;
            return true;
        });
        users = users.map(u => { const { passwordHash, ...pub } = u; return pub; });

    } else {
        // Return counts
        const studentCount = all.map(r => r.data).filter(u =>
            u.role === 'Student' && (!department || u.studentProfile?.branch === department)
        ).length;
        const facultyCount = all.map(r => r.data).filter(u =>
            ['Faculty', 'ClassTeacher', 'HOD'].includes(u.role) &&
            (!department || u.facultyProfile?.department === department)
        ).length;

        return res.status(200).json({
            success: true,
            data: { department: department || 'All', studentCount, facultyCount }
        });
    }

    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get a single user profile (Student/Faculty) by ID
// @route   GET /api/analytics/user/:id
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res, next) => {
    const rec = await blockchain.getRecord(blockchain.keys.user(req.params.id));
    if (!rec) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { passwordHash, ...pubUser } = rec.data;

    res.status(200).json({
        success: true,
        data: pubUser
    });
});

// @desc    Full faculty profile
// @route   GET /api/analytics/faculty/:id
exports.getFacultyProfile = asyncHandler(async (req, res, next) => {
    const rec = await blockchain.getRecord(blockchain.keys.user(req.params.id));
    if (!rec || !['Faculty', 'ClassTeacher', 'HOD'].includes(rec.data.role)) {
        return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = rec.data;

    if (req.user.role === 'HOD') {
        const hodDept = req.user.facultyProfile?.department;
        if (hodDept && faculty.facultyProfile?.department !== hodDept) {
            return res.status(403).json({ success: false, message: 'Access denied: different department' });
        }
    }

    // Class assignment
    const allCA = await blockchain.getAllRecordsOfType('classassign');
    const classAssign = allCA.map(r => r.data).find(a => a.faculty === faculty.id && a.isActive !== false) || null;

    // Subjects taught
    const allSubj = await blockchain.getAllRecordsOfType('subject');
    const subjects = allSubj.map(r => r.data).filter(s => s.faculty === faculty.id);

    const { passwordHash, ...pubFaculty } = faculty;

    res.status(200).json({
        success: true,
        data: { faculty: pubFaculty, classAssignment: classAssign, subjects }
    });
});
