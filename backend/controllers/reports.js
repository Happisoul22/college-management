const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const { generateStudentReport, generateClassReport } = require('../utils/pdfGenerator');

// @desc    Download Student Profile PDF
// @route   GET /api/reports/student/:id
// @access  Private
exports.downloadStudentReport = asyncHandler(async (req, res, next) => {
    const student = await User.findById(req.params.id);
    const achievements = await Achievement.find({ user: req.params.id });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${student.name}.pdf`);

    generateStudentReport(student, achievements, res);
});

// @desc    Download Class Report PDF
// @route   GET /api/reports/class
// @access  Private (Faculty, etc)
exports.downloadClassReport = asyncHandler(async (req, res, next) => {
    const { branch, year } = req.query;

    // Find students matching branch and admissionYear (approx for year)
    // This is simplified. Real logic needs accurate year calculation.
    const students = await User.find({
        role: 'Student',
        'studentProfile.branch': branch
        // 'studentProfile.admissionYear': year 
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=class-report-${branch}.pdf`);

    generateClassReport(students, branch, year, res);
});
