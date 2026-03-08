const asyncHandler = require('../middleware/async');
const blockchain = require('../services/blockchain');
const { generateStudentReport, generateClassReport } = require('../utils/pdfGenerator');

// @desc    Download Student Profile PDF
// @route   GET /api/reports/student/:id
// @access  Private
exports.downloadStudentReport = asyncHandler(async (req, res, next) => {
    // Fetch student profile using ID
    const userRec = await blockchain.getRecord(blockchain.keys.user(req.params.id));
    if (!userRec || userRec.data.role !== 'Student') {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = userRec.data;

    // Fetch achievements related to the student
    const allAchievements = await blockchain.getAllRecordsOfType('achievement');
    const achievements = allAchievements.map(r => r.data).filter(a => a.user === req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${student.name}.pdf`);

    generateStudentReport(student, achievements, res);
});

// @desc    Download Class Report PDF
// @route   GET /api/reports/class
// @access  Private (Faculty, etc)
exports.downloadClassReport = asyncHandler(async (req, res, next) => {
    const { branch, year } = req.query;

    const allUsers = await blockchain.getAllRecordsOfType('user');

    // Find students matching branch and year roughly
    const students = allUsers.map(r => r.data).filter(u => {
        if (u.role !== 'Student') return false;
        if (branch && u.studentProfile?.branch !== branch) return false;
        if (year) {
            const now = new Date();
            const month = now.getMonth() + 1;
            const curYear = now.getFullYear();
            const y = parseInt(year);
            const admYear = month >= 7 ? curYear - y + 1 : curYear - y;
            if (u.studentProfile?.admissionYear !== admYear) return false;
        }
        return true;
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=class-report-${branch || 'all'}.pdf`);

    generateClassReport(students, branch, year, res);
});
