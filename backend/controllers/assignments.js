const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const ClassAssignment = require('../models/ClassAssignment');
const CounsellorAssignment = require('../models/CounsellorAssignment');
const User = require('../models/User');
const blockchain = require('../services/blockchain');

// ═══════════ CLASS TEACHER ASSIGNMENTS ═══════════

// @desc    Get all class assignments (filter by department / faculty)
// @route   GET /api/assignments/class
// @access  Private (HOD, Admin)
exports.getClassAssignments = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.faculty) query.faculty = req.query.faculty;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;
    if (req.query.active !== undefined) {
        query.isActive = req.query.active === 'true';
    } else {
        query.isActive = true; // default: only show active assignments
    }

    const assignments = await ClassAssignment.find(query)
        .populate('faculty', 'name email facultyProfile')
        .populate('assignedBy', 'name')
        .sort({ year: 1, section: 1 });

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
});

// @desc    Get class assignment for logged-in faculty
// @route   GET /api/assignments/class/my
// @access  Private (Faculty)
exports.getMyClassAssignment = asyncHandler(async (req, res, next) => {
    const assignments = await ClassAssignment.find({
        faculty: req.user.id,
        isActive: true
    }).sort({ year: 1, section: 1 });

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
});

// @desc    Get class teacher for logged-in STUDENT
// @route   GET /api/assignments/my-class-teacher
// @access  Private (Student)
exports.getMyClassTeacher = asyncHandler(async (req, res, next) => {
    const student = await User.findById(req.user.id).select('studentProfile');
    if (!student || !student.studentProfile) {
        return res.status(200).json({ success: true, data: null });
    }
    const { branch, section, admissionYear } = student.studentProfile;
    if (!branch || !section || !admissionYear) {
        return res.status(200).json({ success: true, data: null });
    }
    const now = new Date();
    const yearDiff = now.getMonth() + 1 >= 7
        ? now.getFullYear() - admissionYear + 1
        : now.getFullYear() - admissionYear;
    const currentYear = Math.min(Math.max(yearDiff, 1), 4);
    const assignment = await ClassAssignment.findOne({
        department: branch, section, year: currentYear, isActive: true
    }).populate('faculty', 'name email facultyProfile');
    res.status(200).json({ success: true, data: assignment || null });
});

// @desc    Assign class teacher
// @route   POST /api/assignments/class
// @access  Private (HOD)
exports.assignClassTeacher = asyncHandler(async (req, res, next) => {
    const { faculty, department, year, semester, section, academicYear } = req.body;

    if (!faculty || !department || !year || !semester || !section || !academicYear) {
        return next(new ErrorResponse('All fields are required', 400));
    }

    // Verify faculty exists and is in the right role
    const facultyUser = await User.findById(faculty);
    if (!facultyUser || !['Faculty', 'ClassTeacher', 'HOD'].includes(facultyUser.role)) {
        return next(new ErrorResponse('Invalid faculty member', 400));
    }

    // Create or update
    const assignment = await ClassAssignment.findOneAndUpdate(
        { department, year, semester, section, academicYear },
        { faculty, department, year, semester, section, academicYear, assignedBy: req.user.id, isActive: true },
        { upsert: true, new: true, runValidators: true }
    );

    // Update faculty role to ClassTeacher if currently Faculty
    if (facultyUser.role === 'Faculty') {
        facultyUser.role = 'ClassTeacher';
        await facultyUser.save();
    }

    const populated = await ClassAssignment.findById(assignment._id)
        .populate('faculty', 'name email');

    // Store assignment on blockchain
    await blockchain.storeRecordHash('assignment', assignment._id, assignment);

    res.status(201).json({ success: true, data: populated });
});

// @desc    Remove class teacher assignment
// @route   DELETE /api/assignments/class/:id
// @access  Private (HOD)
exports.removeClassAssignment = asyncHandler(async (req, res, next) => {
    const assignment = await ClassAssignment.findById(req.params.id);
    if (!assignment) return next(new ErrorResponse('Assignment not found', 404));

    // Also revert faculty role back to 'Faculty' if they have no other class assignments
    const facultyUser = await User.findById(assignment.faculty);
    if (facultyUser && facultyUser.role === 'ClassTeacher') {
        const otherAssignments = await ClassAssignment.countDocuments({
            faculty: assignment.faculty,
            _id: { $ne: assignment._id },
            isActive: true
        });
        if (otherAssignments === 0) {
            facultyUser.role = 'Faculty';
            await facultyUser.save();
        }
    }

    await assignment.deleteOne();

    res.status(200).json({ success: true, data: {} });
});

// ═══════════ COUNSELLOR ASSIGNMENTS ═══════════

// @desc    Get counsellor assignments
// @route   GET /api/assignments/counsellor
// @access  Private (HOD, Admin)
exports.getCounsellorAssignments = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.query.department) query.department = req.query.department;
    if (req.query.faculty) query.faculty = req.query.faculty;
    if (req.query.active !== undefined) {
        query.isActive = req.query.active === 'true';
    } else {
        query.isActive = true; // default: only show active assignments
    }

    const assignments = await CounsellorAssignment.find(query)
        .populate('faculty', 'name email facultyProfile')
        .populate('students', 'name email studentProfile')
        .populate('assignedBy', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
});

// @desc    Get counsellor assignment for logged-in faculty
// @route   GET /api/assignments/counsellor/my
// @access  Private (Faculty)
exports.getMyCounsellorAssignment = asyncHandler(async (req, res, next) => {
    const assignments = await CounsellorAssignment.find({
        faculty: req.user.id,
        isActive: true
    }).populate('students', 'name email studentProfile').sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: assignments.length, data: assignments });
});

// @desc    Get MY counsellor (for logged-in student)
// @route   GET /api/assignments/my-counsellor
// @access  Private (any)
exports.getMyCounsellor = asyncHandler(async (req, res, next) => {
    const assignment = await CounsellorAssignment.findOne({
        students: req.user.id,
        isActive: true
    }).populate('faculty', 'name email facultyProfile').sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: assignment ? assignment.faculty : null });
});

// @desc    Assign counsellor
// @route   POST /api/assignments/counsellor
// @access  Private (HOD)
exports.assignCounsellor = asyncHandler(async (req, res, next) => {
    const { faculty, students, department, academicYear } = req.body;

    if (!faculty || !students || !students.length || !department || !academicYear) {
        return next(new ErrorResponse('Faculty, students, department, and academic year are required', 400));
    }

    // Check if faculty already has a counsellor assignment — merge students
    let assignment = await CounsellorAssignment.findOne({
        faculty,
        academicYear,
        isActive: true
    });

    if (assignment) {
        // Merge new students
        const existing = assignment.students.map(s => s.toString());
        const newStudents = students.filter(s => !existing.includes(s));
        assignment.students.push(...newStudents);
        await assignment.save();
    } else {
        assignment = await CounsellorAssignment.create({
            faculty,
            students,
            department,
            academicYear,
            assignedBy: req.user.id
        });
    }

    const populated = await CounsellorAssignment.findById(assignment._id)
        .populate('faculty', 'name email')
        .populate('students', 'name email studentProfile');

    // Store assignment on blockchain
    await blockchain.storeRecordHash('assignment', assignment._id, assignment);

    res.status(201).json({ success: true, data: populated });
});

// @desc    Remove counsellor assignment
// @route   DELETE /api/assignments/counsellor/:id
// @access  Private (HOD)
exports.removeCounsellorAssignment = asyncHandler(async (req, res, next) => {
    const assignment = await CounsellorAssignment.findById(req.params.id);
    if (!assignment) return next(new ErrorResponse('Assignment not found', 404));

    await assignment.deleteOne();

    res.status(200).json({ success: true, data: {} });
});
