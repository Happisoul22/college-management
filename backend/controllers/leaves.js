const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Leave = require('../models/Leave');
const User = require('../models/User');
const blockchain = require('../services/blockchain');

// @desc    Apply for leave (Student or Faculty)
// @route   POST /api/leaves
// @access  Private (Student, Faculty, ClassTeacher, HOD)
exports.applyLeave = asyncHandler(async (req, res, next) => {
    req.body.user = req.user.id;
    req.body.applicantRole = req.user.role;

    // Validate dates
    if (req.body.startDate && req.body.endDate) {
        if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
            return next(new ErrorResponse('End date cannot be before start date', 400));
        }
    }

    const leave = await Leave.create(req.body);

    // Store leave creation on blockchain
    await blockchain.storeRecordHash('leave', leave._id, leave);

    res.status(201).json({ success: true, data: leave });
});

// @desc    Get leaves
// @route   GET /api/leaves
// @access  Private
exports.getLeaves = asyncHandler(async (req, res, next) => {
    let query;

    if (req.user.role === 'Student') {
        // Students see only their own leaves
        query = Leave.find({ user: req.user.id, applicantRole: 'Student' })
            .populate({ path: 'approvedBy', select: 'name role' });

    } else if (['Faculty', 'ClassTeacher'].includes(req.user.role)) {
        // Faculty/ClassTeacher: own leaves + student leaves from their assigned class
        const ClassAssignment = require('../models/ClassAssignment');

        // Find active class assignments for this faculty
        const assignments = await ClassAssignment.find({
            faculty: req.user.id,
            isActive: true
        });

        let studentIds = [];
        if (assignments.length > 0) {
            // Build queries to find students matching each assignment
            const orConditions = assignments.map(a => ({
                role: 'Student',
                'studentProfile.branch': a.department,
                'studentProfile.section': a.section
            }));

            const students = await User.find({ $or: orConditions }).select('_id');
            studentIds = students.map(s => s._id);
        }

        // Return: own leaves + student leaves from assigned classes
        query = Leave.find({
            $or: [
                { user: req.user.id },  // own leaves
                ...(studentIds.length > 0
                    ? [{ user: { $in: studentIds }, applicantRole: 'Student' }]
                    : [])
            ]
        })
            .populate({ path: 'user', select: 'name email studentProfile role' })
            .populate({ path: 'approvedBy', select: 'name role' });

    } else if (['HOD', 'Principal', 'Admin'].includes(req.user.role)) {
        // HOD/Principal sees:
        //   1. All student leaves (existing behaviour)
        //   2. Faculty leaves from their own department
        const hodUser = await User.findById(req.user.id).select('facultyProfile');
        const hodDept = hodUser?.facultyProfile?.department;

        // Find all faculty in the same department
        let facultyInDept = [];
        if (hodDept) {
            const deptFaculty = await User.find({
                role: { $in: ['Faculty', 'ClassTeacher', 'HOD'] },
                'facultyProfile.department': hodDept,
                _id: { $ne: req.user.id }  // exclude self
            }).select('_id');
            facultyInDept = deptFaculty.map(f => f._id);
        }

        query = Leave.find({
            $or: [
                { applicantRole: 'Student' },
                { user: { $in: facultyInDept } }
            ]
        })
            .populate({ path: 'user', select: 'name email studentProfile facultyProfile role' })
            .populate({ path: 'approvedBy', select: 'name role' });
    } else {
        // Fallback — show all
        query = Leave.find()
            .populate({ path: 'user', select: 'name email studentProfile facultyProfile role' })
            .populate({ path: 'approvedBy', select: 'name role' });
    }

    const leaves = await query.sort('-createdAt');

    res.status(200).json({ success: true, count: leaves.length, data: leaves });
});

// @desc    Update leave status
// @route   PUT /api/leaves/:id
// @access  Private (Faculty, HOD)
exports.updateLeaveStatus = asyncHandler(async (req, res, next) => {
    let leave = await Leave.findById(req.params.id);

    if (!leave) {
        return next(new ErrorResponse(`Leave not found with id of ${req.params.id}`, 404));
    }

    if (req.user.role === 'Student') {
        return next(new ErrorResponse(`Students cannot approve leaves`, 403));
    }

    // Faculty can only approve student leaves, not other faculty leaves
    if (['Faculty', 'ClassTeacher'].includes(req.user.role) && leave.applicantRole !== 'Student') {
        return next(new ErrorResponse(`Only HOD can approve faculty leaves`, 403));
    }

    leave = await Leave.findByIdAndUpdate(req.params.id, {
        status: req.body.status,
        approvedBy: req.user.id
    }, { new: true, runValidators: true });

    // Store leave approval/rejection on blockchain
    await blockchain.storeRecordHash('leave', leave._id, leave);

    res.status(200).json({ success: true, data: leave });
});
