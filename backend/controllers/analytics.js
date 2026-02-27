const asyncHandler = require('../middleware/async');
const Achievement = require('../models/Achievement');
const User = require('../models/User');

// @desc    Get overall analytics (department-scoped for HOD)
// @route   GET /api/analytics/overall
// @access  Private (Principal, Admin, HOD)
exports.getOverallAnalytics = asyncHandler(async (req, res, next) => {

    // ── Determine scope: HOD → own department, Principal/Admin → all ──
    let userMatchFilter = {};
    if (req.user.role === 'HOD') {
        const dept = req.user.facultyProfile?.department;
        if (dept) {
            // Get all student IDs in this department
            const deptStudents = await User.find({
                role: 'Student',
                'studentProfile.branch': dept
            }).select('_id');
            const studentIds = deptStudents.map(s => s._id);
            userMatchFilter = { user: { $in: studentIds } };
        }
    }

    // 1. Achievements by Type
    const achievementsByType = await Achievement.aggregate([
        { $match: userMatchFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // 2. Achievements by Status
    const achievementsByStatus = await Achievement.aggregate([
        { $match: userMatchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Total count
    const total = await Achievement.countDocuments(userMatchFilter);

    // 4. Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const achievementsByMonth = await Achievement.aggregate([
        { $match: { ...userMatchFilter, createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            total,
            byType: achievementsByType,
            byStatus: achievementsByStatus,
            byMonth: achievementsByMonth,
            department: req.user.role === 'HOD' ? req.user.facultyProfile?.department : 'All'
        }
    });
});


// @desc    Get department analytics
// @route   GET /api/analytics/department
// @access  Private (HOD, Principal, Admin)
exports.getDepartmentAnalytics = asyncHandler(async (req, res, next) => {
    // Requires lookup to User to check department (branch)
    // If HOD, filter by their department. If Principal, can pass ?department=CSE

    let matchStage = {};
    if (req.query.year) matchStage.year = parseInt(req.query.year);
    if (req.query.semester) matchStage.semester = parseInt(req.query.semester);

    const pipeline = [
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: '$userDetails'
        },
        // Filter by Department if provided or if HOD
        ...(req.query.department ? [{
            $match: {
                'userDetails.studentProfile.branch': req.query.department
            }
        }] : []),
        // Match other filters
        {
            $match: matchStage
        },
        {
            $group: {
                _id: {
                    type: '$type',
                    status: '$status'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.type',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }
        }
    ];

    const departmentStats = await Achievement.aggregate(pipeline);

    res.status(200).json({
        success: true,
        data: departmentStats
    });
});

// @desc    Get department users (students + faculty) for HOD
// @route   GET /api/analytics/department-users
// @access  Private (HOD, Principal, Admin)
exports.getDepartmentUsers = asyncHandler(async (req, res, next) => {
    const { type } = req.query; // 'Student' or 'Faculty'
    const user = req.user;

    // Department isolation:
    // - HOD is ALWAYS locked to their own department (cannot query other departments)
    // - Principal / Admin can optionally pass ?department= to filter any department
    let department;
    if (user.role === 'HOD') {
        // Force HOD's own department — ignore any ?department= query param
        department = user.facultyProfile?.department;
    } else {
        // Principal / Admin: use query param if provided, otherwise no filter (all departments)
        department = req.query.department || null;
    }

    let query = {};
    let selectFields = 'name email role createdAt';

    if (type === 'Student') {
        query.role = 'Student';
        if (department) {
            query['studentProfile.branch'] = department;
        }
        selectFields += ' studentProfile';
    } else if (type === 'Faculty') {
        query.role = { $in: ['Faculty', 'ClassTeacher', 'HOD'] };
        if (department) {
            query['facultyProfile.department'] = department;
        }
        selectFields += ' facultyProfile';
    } else {
        // Return counts for both
        const studentCount = await User.countDocuments({
            role: 'Student',
            ...(department ? { 'studentProfile.branch': department } : {})
        });
        const facultyCount = await User.countDocuments({
            role: { $in: ['Faculty', 'ClassTeacher', 'HOD'] },
            ...(department ? { 'facultyProfile.department': department } : {})
        });

        return res.status(200).json({
            success: true,
            data: {
                department: department || 'All',
                studentCount,
                facultyCount
            }
        });
    }

    const users = await User.find(query).select(selectFields).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

// @desc    Get full profile of a single faculty member
// @route   GET /api/analytics/faculty/:id
// @access  Private (HOD, Principal, Admin)
exports.getFacultyProfile = asyncHandler(async (req, res, next) => {
    const ClassAssignment = require('../models/ClassAssignment');
    const Subject = require('../models/Subject');

    const faculty = await User.findById(req.params.id)
        .select('name email role facultyProfile createdAt');

    if (!faculty || !['Faculty', 'ClassTeacher', 'HOD'].includes(faculty.role)) {
        return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    // HOD department isolation: HOD can only view faculty in their own department
    if (req.user.role === 'HOD') {
        const hodDept = req.user.facultyProfile?.department;
        if (hodDept && faculty.facultyProfile?.department !== hodDept) {
            return res.status(403).json({
                success: false,
                message: `Access denied: This faculty belongs to a different department (${faculty.facultyProfile?.department}).`
            });
        }
    }

    // Class Teacher assignment (if any)
    const classAssignment = await ClassAssignment.findOne({ faculty: faculty._id, isActive: true })
        .select('department year semester section academicYear');

    // Subjects this faculty teaches
    const subjects = await Subject.find({ faculty: faculty._id })
        .select('code name department semester year credits type section')
        .sort({ semester: 1, code: 1 });

    res.status(200).json({
        success: true,
        data: {
            faculty,
            classAssignment: classAssignment || null,
            subjects
        }
    });
});

