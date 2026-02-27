const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Subject = require('../models/Subject');

// @desc    Get all subjects (with optional filters)
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.semester) query.semester = parseInt(req.query.semester);
    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.faculty) query.faculty = req.query.faculty;

    const subjects = await Subject.find(query)
        .populate('faculty', 'name email facultyProfile')
        .sort({ semester: 1, name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
});

// @desc    Get subjects assigned to logged-in faculty
// @route   GET /api/subjects/my
// @access  Private (Faculty, ClassTeacher)
exports.getMySubjects = asyncHandler(async (req, res, next) => {
    const subjects = await Subject.find({ faculty: req.user.id })
        .sort({ semester: 1, name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = asyncHandler(async (req, res, next) => {
    const subject = await Subject.findById(req.params.id)
        .populate('faculty', 'name email');
    if (!subject) return next(new ErrorResponse('Subject not found', 404));
    res.status(200).json({ success: true, data: subject });
});

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private (HOD, Admin)
exports.createSubject = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user.id;
    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, data: subject });
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (HOD, Admin)
exports.updateSubject = asyncHandler(async (req, res, next) => {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
        new: true, runValidators: true
    });
    if (!subject) return next(new ErrorResponse('Subject not found', 404));
    res.status(200).json({ success: true, data: subject });
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (HOD, Admin)
exports.deleteSubject = asyncHandler(async (req, res, next) => {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return next(new ErrorResponse('Subject not found', 404));
    res.status(200).json({ success: true, data: {} });
});

// @desc    Assign a faculty to a subject
// @route   PUT /api/subjects/:id/assign
// @access  Private (HOD, Admin)
exports.assignSubjectToFaculty = asyncHandler(async (req, res, next) => {
    const { faculty, section } = req.body;
    if (!faculty) return next(new ErrorResponse('Faculty ID is required', 400));

    const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        { faculty, section: section || '' },
        { new: true, runValidators: true }
    ).populate('faculty', 'name email facultyProfile');

    if (!subject) return next(new ErrorResponse('Subject not found', 404));
    res.status(200).json({ success: true, data: subject });
});

// @desc    Unassign faculty from a subject
// @route   PUT /api/subjects/:id/unassign
// @access  Private (HOD, Admin)
exports.unassignSubject = asyncHandler(async (req, res, next) => {
    const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        { faculty: null, section: '' },
        { new: true }
    );
    if (!subject) return next(new ErrorResponse('Subject not found', 404));
    res.status(200).json({ success: true, data: subject });
});
