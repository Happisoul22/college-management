const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Leave = require('../models/Leave');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private (Student)
exports.applyLeave = asyncHandler(async (req, res, next) => {
    req.body.user = req.user.id;

    // Validate: end date must be >= start date
    if (req.body.startDate && req.body.endDate) {
        if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
            return next(new ErrorResponse('End date cannot be before start date', 400));
        }
    }

    const leave = await Leave.create(req.body);

    res.status(201).json({
        success: true,
        data: leave
    });
});

// @desc    Get leaves
// @route   GET /api/leaves
// @access  Private
exports.getLeaves = asyncHandler(async (req, res, next) => {
    let query;

    if (req.user.role === 'Student') {
        query = Leave.find({ user: req.user.id })
            .populate({ path: 'approvedBy', select: 'name role' });
    } else {
        query = Leave.find().populate({
            path: 'user',
            select: 'name email studentProfile'
        }).populate({ path: 'approvedBy', select: 'name role' });
    }

    const leaves = await query.sort('-createdAt');

    res.status(200).json({
        success: true,
        count: leaves.length,
        data: leaves
    });
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

    leave = await Leave.findByIdAndUpdate(req.params.id, {
        status: req.body.status,
        approvedBy: req.user.id
    }, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: leave
    });
});
