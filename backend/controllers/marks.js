const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Marks = require('../models/Marks');
const Subject = require('../models/Subject');
const User = require('../models/User');

// ─── Helper: Recalculate & persist CGPA for a student ───────────────────────
const recalculateCGPA = async (studentId) => {
    const allMarks = await Marks.find({ student: studentId }).populate('subject', 'credits');
    if (!allMarks.length) return;

    let totalWeightedGP = 0;
    let totalCredits = 0;

    allMarks.forEach(m => {
        const credits = m.subject?.credits || 3;
        totalWeightedGP += (m.gradePoint || 0) * credits;
        totalCredits += credits;
    });

    const cgpa = totalCredits > 0 ? parseFloat((totalWeightedGP / totalCredits).toFixed(2)) : 0;

    await User.findByIdAndUpdate(studentId, {
        'studentProfile.cgpa': cgpa
    });
};
// ────────────────────────────────────────────────────────────────────────────

// @desc    Get marks for a student (all or by semester)
// @route   GET /api/marks?student=id&semester=1
// @access  Private
exports.getMarks = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.query.student) query.student = req.query.student;
    else if (req.user.role === 'Student') query.student = req.user.id;
    if (req.query.semester) query.semester = parseInt(req.query.semester);
    if (req.query.subject) query.subject = req.query.subject;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;

    const marks = await Marks.find(query)
        .populate('subject', 'code name credits type')
        .populate('student', 'name studentProfile')
        .populate('enteredBy', 'name')
        .sort({ semester: 1 });

    res.status(200).json({ success: true, count: marks.length, data: marks });
});

// @desc    Enter / update marks for a single student-subject
// @route   POST /api/marks
// @access  Private (Faculty, HOD)
exports.enterMarks = asyncHandler(async (req, res, next) => {
    const { student, subject, semester, year, academicYear, internal, external } = req.body;

    if (!student || !subject) {
        return next(new ErrorResponse('Student and Subject are required', 400));
    }

    // Check if marks already exist — update if so
    let marks = await Marks.findOne({ student, subject, academicYear: academicYear || '' });

    if (marks) {
        // Update existing
        if (internal) Object.assign(marks.internal, internal);
        if (external) Object.assign(marks.external, external);
        marks.enteredBy = req.user.id;
        marks.updatedAt = Date.now();
        await marks.save(); // triggers pre-save hook for grade calc
    } else {
        // Create new
        marks = await Marks.create({
            student,
            subject,
            semester: semester || 1,
            year: year || 1,
            academicYear: academicYear || '',
            internal: internal || {},
            external: external || {},
            enteredBy: req.user.id
        });
        // Re-save to trigger pre-save hook
        await marks.save();
    }

    // Populate for response
    marks = await Marks.findById(marks._id)
        .populate('subject', 'code name credits type')
        .populate('student', 'name');

    // Recalculate and persist CGPA
    await recalculateCGPA(student);

    res.status(200).json({ success: true, data: marks });
});

// @desc    Bulk enter marks for multiple students (same subject)
// @route   POST /api/marks/bulk
// @access  Private (Faculty, HOD)
exports.bulkEnterMarks = asyncHandler(async (req, res, next) => {
    const { subject, semester, year, academicYear, entries } = req.body;
    // entries = [{ student, internal, external }, ...]

    if (!subject || !entries || !entries.length) {
        return next(new ErrorResponse('Subject and entries are required', 400));
    }

    const results = [];
    for (const entry of entries) {
        let marks = await Marks.findOne({
            student: entry.student,
            subject,
            academicYear: academicYear || ''
        });

        if (marks) {
            if (entry.internal) Object.assign(marks.internal, entry.internal);
            if (entry.external) Object.assign(marks.external, entry.external);
            marks.enteredBy = req.user.id;
            marks.updatedAt = Date.now();
            await marks.save();
        } else {
            marks = await Marks.create({
                student: entry.student,
                subject,
                semester: semester || 1,
                year: year || 1,
                academicYear: academicYear || '',
                internal: entry.internal || {},
                external: entry.external || {},
                enteredBy: req.user.id
            });
            await marks.save();
        }
        results.push(marks);
    }

    // Recalculate CGPA for each unique student in the bulk entry
    const uniqueStudents = [...new Set(entries.map(e => e.student))];
    await Promise.all(uniqueStudents.map(recalculateCGPA));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Get CGPA for a student
// @route   GET /api/marks/cgpa/:studentId
// @access  Private
exports.getStudentCGPA = asyncHandler(async (req, res, next) => {
    const studentId = req.params.studentId || req.user.id;

    const allMarks = await Marks.find({ student: studentId })
        .populate('subject', 'credits');

    if (!allMarks.length) {
        return res.status(200).json({
            success: true,
            data: { cgpa: 0, sgpa: {}, totalCredits: 0 }
        });
    }

    // Group by semester
    const bySemester = {};
    allMarks.forEach(m => {
        const sem = m.semester;
        if (!bySemester[sem]) bySemester[sem] = [];
        bySemester[sem].push(m);
    });

    // Calculate SGPA per semester
    const sgpa = {};
    let totalWeightedGP = 0;
    let totalCredits = 0;

    Object.keys(bySemester).sort().forEach(sem => {
        const semMarks = bySemester[sem];
        let semWeighted = 0;
        let semCredits = 0;

        semMarks.forEach(m => {
            const credits = m.subject?.credits || 3;
            semWeighted += m.gradePoint * credits;
            semCredits += credits;
        });

        sgpa[sem] = semCredits > 0 ? parseFloat((semWeighted / semCredits).toFixed(2)) : 0;
        totalWeightedGP += semWeighted;
        totalCredits += semCredits;
    });

    const cgpa = totalCredits > 0 ? parseFloat((totalWeightedGP / totalCredits).toFixed(2)) : 0;

    res.status(200).json({
        success: true,
        data: { cgpa, sgpa, totalCredits, totalSubjects: allMarks.length }
    });
});
