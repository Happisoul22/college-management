const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const { createNotification } = require('./notifications');
const blockchain = require('../services/blockchain');

// @desc    Create new achievement
// @route   POST /api/achievements
// @access  Private (Student)
exports.createAchievement = asyncHandler(async (req, res, next) => {
    req.body.user = req.user.id;
    req.body.submittedByRole = req.user.role; // stamp the submitter's role

    // Check if file uploaded — store as a proper accessible URL
    if (req.file) {
        req.body.proofUrl = `/uploads/${req.file.filename}`;
        req.body.proofFileName = req.file.originalname;
    }

    const achievement = await Achievement.create(req.body);

    // ── Notify class teacher of new achievement submission ──
    try {
        const ClassAssignment = require('../models/ClassAssignment');
        const student = await User.findById(req.user.id).select('name studentProfile');
        const dept = student?.studentProfile?.branch;
        const section = student?.studentProfile?.section;

        if (dept) {
            // Find active class teacher for this student's section
            const assignQuery = { isActive: true, department: dept };
            if (section) assignQuery.section = section;
            const assignments = await ClassAssignment.find(assignQuery).select('faculty');
            for (const a of assignments) {
                await createNotification({
                    recipient: a.faculty,
                    sender: req.user.id,
                    type: 'achievement_submitted',
                    message: `${student.name} submitted a new achievement: "${achievement.title}"`,
                    link: '/approvals'
                });
            }
        }
    } catch (e) { console.error('Notify faculty error:', e.message); }

    // Store hash on blockchain for tamper-proof verification
    const blockchainResult = await blockchain.storeRecordHash('achievement', achievement._id, achievement);

    res.status(201).json({
        success: true,
        data: achievement,
        blockchain: blockchainResult ? {
            txHash: blockchainResult.txHash,
            recordKey: blockchainResult.recordKey,
            blockNumber: blockchainResult.blockNumber
        } : null
    });
});

// @desc    Get all achievements (with filters)
// @route   GET /api/achievements
// @access  Private
exports.getAchievements = asyncHandler(async (req, res, next) => {

    // ── Students: only their own achievements ──────────────────────────
    if (req.user.role === 'Student') {
        const query = { user: req.user.id };
        if (req.query.status) query.status = req.query.status;
        const achievements = await Achievement.find(query).sort('-createdAt');
        return res.status(200).json({ success: true, count: achievements.length, data: achievements });
    }

    // ── Build base filter (strip empty strings so "All" truly = no filter) ──
    const filter = {};
    if (req.query.status && req.query.status.trim() !== '') {
        filter.status = req.query.status.trim();
    }
    if (req.query.type && req.query.type.trim() !== '') {
        filter.type = req.query.type.trim();
    }

    // ── Scope ClassTeacher / Faculty to their assigned class ──────────
    // If they have an active ClassAssignment, restrict to students of that class.
    // HOD / Principal / Admin see the whole department.
    const isFacultyRole = ['Faculty', 'ClassTeacher'].includes(req.user.role);
    if (isFacultyRole) {
        const ClassAssignment = require('../models/ClassAssignment');
        const assignment = await ClassAssignment.findOne({ faculty: req.user.id, isActive: true });

        if (assignment) {
            const dept = assignment.department;
            const section = assignment.section;
            const year = assignment.year;

            const now = new Date();
            const currentCalYear = now.getFullYear();
            const admYear1 = currentCalYear - year;
            const admYear2 = currentCalYear - year + 1;

            const studentQuery = {
                role: 'Student',
                'studentProfile.branch': dept,
                ...(section ? { 'studentProfile.section': section } : {}),
                'studentProfile.admissionYear': { $in: [admYear1, admYear2] }
            };

            const students = await User.find(studentQuery).select('_id');
            filter.user = { $in: students.map(s => s._id) };
        }
    }

    // ── HOD: scope to their own department ────────────────────────────────
    if (req.user.role === 'HOD') {
        const dept = req.user.facultyProfile?.department;
        if (dept) {
            const deptStudents = await User.find({
                role: 'Student',
                'studentProfile.branch': dept
            }).select('_id');
            filter.user = { $in: deptStudents.map(s => s._id) };
        }
    }

    // ── Year filter: derive from student's admissionYear ──────────────
    // ?year=1|2|3|4  → match students whose computed year equals this
    if (req.query.year && req.query.year.trim() !== '') {
        const yr = parseInt(req.query.year);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentCalYear = now.getFullYear();
        // A student in year Y was admitted (yr-1) or yr years ago
        const admYear1 = currentCalYear - yr;
        const admYear2 = currentCalYear - yr + 1;
        // Find matching students
        const matchStudents = await User.find({
            role: 'Student',
            'studentProfile.admissionYear': { $in: [admYear1, admYear2] }
        }).select('_id');
        const matchIds = matchStudents.map(s => s._id);
        // Merge with any existing user filter
        if (filter.user && filter.user.$in) {
            // Intersect
            const existingSet = new Set(filter.user.$in.map(id => id.toString()));
            filter.user = { $in: matchIds.filter(id => existingSet.has(id.toString())) };
        } else {
            filter.user = { $in: matchIds };
        }
    }

    // ── ownerRole filter: ?ownerRole=Student|Faculty etc. ──
    if (req.query.ownerRole && req.query.ownerRole.trim() !== '') {
        filter.submittedByRole = req.query.ownerRole.trim();
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const achievements = await Achievement.find(filter)
        .populate({ path: 'user', select: 'name email studentProfile facultyProfile role' })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit);

    res.status(200).json({
        success: true,
        count: achievements.length,
        data: achievements
    });
});


// @desc    Get single achievement
// @route   GET /api/achievements/:id
// @access  Private
exports.getAchievement = asyncHandler(async (req, res, next) => {
    const achievement = await Achievement.findById(req.params.id).populate({
        path: 'user',
        select: 'name email studentProfile'
    });

    if (!achievement) {
        return next(new ErrorResponse(`Achievement not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is achievement owner or faculty/admin
    if (req.user.role === 'Student' && achievement.user.id !== req.user.id) {
        return next(new ErrorResponse(`User not authorized to access this achievement`, 401));
    }

    res.status(200).json({
        success: true,
        data: achievement
    });
});

// @desc    Update achievement (Student updates details, Faculty updates Status)
// @route   PUT /api/achievements/:id
// @access  Private
exports.updateAchievement = asyncHandler(async (req, res, next) => {
    let achievement = await Achievement.findById(req.params.id);

    if (!achievement) {
        return next(new ErrorResponse(`Achievement not found with id of ${req.params.id}`, 404));
    }

    // If Student, can only update if Pending
    if (req.user.role === 'Student') {
        if (achievement.user.toString() !== req.user.id) {
            return next(new ErrorResponse(`User not authorized to update this achievement`, 401));
        }
        if (achievement.status !== 'Pending') {
            return next(new ErrorResponse(`Cannot update achievement after it has been reviewed`, 400));
        }
    }

    // If Faculty/HOD/Principal, can update status
    if (['Faculty', 'HOD', 'Principal', 'Admin'].includes(req.user.role)) {
        // If updating status, ensure it's provided
        if (req.body.status) {
            req.body.reviewedBy = req.user.id;
        }
    }

    achievement = await Achievement.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    // ── Notify student when their achievement is reviewed ──
    if (req.body.status && ['Approved', 'Rejected'].includes(req.body.status)) {
        try {
            const emoji = req.body.status === 'Approved' ? '✅' : '❌';
            await createNotification({
                recipient: achievement.user,
                sender: req.user.id,
                type: req.body.status === 'Approved' ? 'achievement_approved' : 'achievement_rejected',
                message: `${emoji} Your achievement "${achievement.title}" has been ${req.body.status.toLowerCase()} by ${req.user.name || 'faculty'}.`,
                link: '/achievements'
            });
        } catch (e) { console.error('Notify student error:', e.message); }
    }

    // Update blockchain hash after status change
    const blockchainResult = await blockchain.storeRecordHash('achievement', achievement._id, achievement);

    res.status(200).json({
        success: true,
        data: achievement,
        blockchain: blockchainResult ? {
            txHash: blockchainResult.txHash,
            recordKey: blockchainResult.recordKey,
            blockNumber: blockchainResult.blockNumber
        } : null
    });
});

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private
exports.deleteAchievement = asyncHandler(async (req, res, next) => {
    const achievement = await Achievement.findById(req.params.id);

    if (!achievement) {
        return next(new ErrorResponse(`Achievement not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is achievement owner or Admin
    if (req.user.role !== 'Admin' && achievement.user.toString() !== req.user.id) {
        return next(new ErrorResponse(`User not authorized to delete this achievement`, 401));
    }

    await achievement.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});
