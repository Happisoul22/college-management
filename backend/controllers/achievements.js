/**
 * controllers/achievements.js  –  Fully decentralised (no MongoDB)
 *
 * Achievements stored as JSON on IPFS + indexed on-chain per user.
 * Key format: ach_<uuid>
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');
const { createNotification } = require('./notifications');

// @desc    Create new achievement
// @route   POST /api/achievements
// @access  Private (Student)
exports.createAchievement = asyncHandler(async (req, res, next) => {
    const id = uuidv4();
    const key = blockchain.keys.achievement(id);

    const achievementData = {
        id,
        user: req.user.id,
        userName: req.user.name,
        submittedByRole: req.user.role,
        type: req.body.type || '',
        title: req.body.title || '',
        description: req.body.description || '',
        year: req.body.year || new Date().getFullYear(),
        semester: req.body.semester || '',
        organization: req.body.organization || '',
        domain: req.body.domain || '',
        startDate: req.body.startDate || '',
        endDate: req.body.endDate || '',
        weeks: req.body.weeks || '',
        nptelCourseType: req.body.nptelCourseType || '',
        nptelDuration: req.body.nptelDuration || '',
        score: req.body.score || '',
        instructor: req.body.instructor || '',
        workType: req.body.workType || '',
        projectRole: req.body.projectRole || '',
        contribution: req.body.contribution || '',
        githubLink: req.body.githubLink || '',
        teamMembers: req.body.teamMembers || '',
        proofUrl: req.file ? `/uploads/${req.file.filename}` : (req.body.proofUrl || ''),
        proofFileName: req.file ? req.file.originalname : (req.body.proofFileName || ''),
        status: (req.user.role !== 'Student' && req.user.role === 'HOD') ? 'Approved' : 'Pending',
        reviewedBy: (req.user.role !== 'Student' && req.user.role === 'HOD') ? req.user.id : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const result = await blockchain.storeRecord('achievement', key, achievementData, req.user.id);

    // Notify class teacher
    // Notify the correct approver
    try {
        if (req.user.role === 'Student') {
            const userRec = await blockchain.getRecord(blockchain.keys.user(req.user.id));
            const student = userRec?.data;
            const dept = student?.studentProfile?.branch;
            if (dept) {
                const allAssign = await blockchain.getAllRecordsOfType('classassign');
                for (const a of allAssign.map(r => r.data)) {
                    if (a.department === dept && a.section === student.studentProfile?.section && a.isActive) {
                        await createNotification({
                            recipient: a.faculty,
                            sender: req.user.id,
                            type: 'achievement_submitted',
                            message: `${student.name} submitted a new achievement: "${achievementData.title}"`,
                            link: '/approvals'
                        });
                    }
                }
            }
        } else if (['Faculty', 'ClassTeacher'].includes(req.user.role)) {
            const userRec = await blockchain.getRecord(blockchain.keys.user(req.user.id));
            const faculty = userRec?.data;
            const dept = faculty?.facultyProfile?.department;
            if (dept) {
                const allUsers = await blockchain.getAllRecordsOfType('user');
                const hods = allUsers.map(r => r.data).filter(u => u.role === 'HOD' && u.facultyProfile?.department === dept);
                for (const hod of hods) {
                    await createNotification({
                        recipient: hod.id,
                        sender: req.user.id,
                        type: 'achievement_submitted',
                        message: `${faculty.name} submitted a new achievement: "${achievementData.title}"`,
                        link: '/approvals'
                    });
                }
            }
        }
    } catch (e) { console.error('Notify approver error:', e.message); }

    res.status(201).json({
        success: true,
        data: achievementData,
        blockchain: result ? { txHash: result.txHash, cid: result.cid } : null
    });
});

// @desc    Get achievements (with filters & role-based scoping)
// @route   GET /api/achievements
// @access  Private
exports.getAchievements = asyncHandler(async (req, res, next) => {
    const all = await blockchain.getAllRecordsOfType('achievement');
    let results = all.map(r => r.data);

    // ── Role-based filter ──────────────────────────────────────────────────────
    if (req.query.me === 'true' || req.user.role === 'Student') {
        results = results.filter(a => a.user === req.user.id);
    } else if (['Faculty', 'ClassTeacher'].includes(req.user.role)) {
        // Filter to assigned class's students
        const myAssigns = (await blockchain.getAllRecordsOfType('classassign'))
            .map(r => r.data)
            .filter(a => a.faculty === req.user.id && a.isActive);

        if (myAssigns.length) {
            const a = myAssigns[0];
            const allUsers = await blockchain.getAllRecordsOfType('user');
            const classStudentIds = new Set(
                allUsers
                    .map(r => r.data)
                    .filter(u =>
                        u.role === 'Student' &&
                        u.studentProfile?.branch === a.department &&
                        u.studentProfile?.section === a.section
                    )
                    .map(u => u.id)
            );
            results = results.filter(r => classStudentIds.has(r.user));
        }
    } else if (req.user.role === 'HOD') {
        const dept = req.user.facultyProfile?.department;
        const allUsers = await blockchain.getAllRecordsOfType('user');
        const deptUserIds = new Set(
            allUsers.map(r => r.data)
                .filter(u => 
                    (u.role === 'Student' && u.studentProfile?.branch === dept) ||
                    (['Faculty', 'ClassTeacher', 'HOD'].includes(u.role) && u.facultyProfile?.department === dept)
                )
                .map(u => u.id)
        );
        results = results.filter(r => deptUserIds.has(r.user));
    }

    // ── Query filters ──────────────────────────────────────────────────────────
    if (req.query.student?.trim()) results = results.filter(a => a.user === req.query.student.trim());
    if (req.query.status?.trim()) results = results.filter(a => a.status === req.query.status.trim());
    if (req.query.type?.trim()) results = results.filter(a => a.type === req.query.type.trim());
    if (req.query.ownerRole?.trim()) {
        const queryRole = req.query.ownerRole.trim();
        if (queryRole === 'Faculty') {
            results = results.filter(a => ['Faculty', 'ClassTeacher', 'HOD'].includes(a.submittedByRole));
        } else {
            results = results.filter(a => a.submittedByRole === queryRole);
        }
    }

    // Year filter (Only applies to student achievements)
    if (req.query.year?.trim() && req.query.ownerRole !== 'Faculty') {
        const yr = parseInt(req.query.year);
        const now = new Date();
        const month = now.getMonth() + 1;
        const curYear = now.getFullYear();
        const admYear1 = month >= 7 ? curYear - yr + 1 : curYear - yr;
        const admYear2 = admYear1 + 1;
        const allUsers = await blockchain.getAllRecordsOfType('user');
        const yearIds = new Set(
            allUsers.map(r => r.data)
                .filter(u => u.role === 'Student' &&
                    [admYear1, admYear2].includes(u.studentProfile?.admissionYear))
                .map(u => u.id)
        );
        results = results.filter(r => yearIds.has(r.user));
    }

    // Fetch users for hydration
    const allUsersList = await blockchain.getAllRecordsOfType('user');
    const userMap = {};
    for (const u of allUsersList) {
        userMap[u.data.id] = u.data;
    }

    // Hydrate
    results = results.map(r => ({
        ...r,
        user: userMap[r.user] || { id: r.user, name: r.userName || 'Unknown User' },
        reviewer: r.reviewedBy ? {
            id: r.reviewedBy,
            name: userMap[r.reviewedBy]?.name || 'Unknown',
            role: userMap[r.reviewedBy]?.role || 'Unknown'
        } : null
    }));

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    results = results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(skip, skip + limit);

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Get single achievement
// @route   GET /api/achievements/:id
// @access  Private
exports.getAchievement = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.achievement(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse(`Achievement not found`, 404));

    if (req.user.role === 'Student' && rec.data.user !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 401));
    }

    res.status(200).json({ success: true, data: rec.data });
});

// @desc    Update achievement
// @route   PUT /api/achievements/:id
// @access  Private
exports.updateAchievement = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.achievement(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Achievement not found', 404));

    const existing = rec.data;

    if (req.user.role === 'Student') {
        if (existing.user !== req.user.id) return next(new ErrorResponse('Not authorized', 401));
        if (existing.status !== 'Pending') return next(new ErrorResponse('Cannot update after review', 400));
    }

    const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        user: existing.user,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
    };

    if (req.body.status && ['Faculty', 'HOD', 'Principal', 'Admin', 'ClassTeacher'].includes(req.user.role)) {
        updated.reviewedBy = req.user.id;
    }

    const result = await blockchain.storeRecord('achievement', key, updated, existing.user);

    // Notify student if reviewed
    if (req.body.status && ['Approved', 'Rejected'].includes(req.body.status)) {
        try {
            const emoji = req.body.status === 'Approved' ? '✅' : '❌';
            await createNotification({
                recipient: existing.user,
                sender: req.user.id,
                type: req.body.status === 'Approved' ? 'achievement_approved' : 'achievement_rejected',
                message: `${emoji} Your achievement "${existing.title}" has been ${req.body.status.toLowerCase()}.`,
                link: '/achievements'
            });
        } catch (e) { console.error('Notify student error:', e.message); }
    }

    res.status(200).json({
        success: true,
        data: updated,
        blockchain: result ? { txHash: result.txHash, cid: result.cid } : null
    });
});

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private
exports.deleteAchievement = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.achievement(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Achievement not found', 404));

    if (req.user.role !== 'Admin' && rec.data.user !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 401));
    }

    await blockchain.deleteRecord(key);
    res.status(200).json({ success: true, data: {} });
});
