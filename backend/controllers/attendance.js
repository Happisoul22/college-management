const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Attendance = require('../models/Attendance');
const blockchain = require('../services/blockchain');

// @desc    Mark attendance (single or bulk)
// @route   POST /api/attendance
// @access  Private (Faculty, HOD)
exports.markAttendance = asyncHandler(async (req, res, next) => {
    const { subject, date, period, entries } = req.body;
    // entries = [{ student, status }, ...]

    if (!subject || !date || !entries || !entries.length) {
        return next(new ErrorResponse('Subject, date, and entries are required', 400));
    }

    const results = [];
    for (const entry of entries) {
        const filter = {
            student: entry.student,
            subject,
            date: new Date(date),
            period: period || 1
        };

        // Upsert — update if exists, create if not
        const doc = await Attendance.findOneAndUpdate(
            filter,
            {
                ...filter,
                status: entry.status,
                markedBy: req.user.id
            },
            { upsert: true, new: true, runValidators: true }
        );
        results.push(doc);
    }

    // Store hashes on blockchain for tamper-proof verification
    const blockchainResults = [];
    for (const doc of results) {
        const bcResult = await blockchain.storeRecordHash('attendance', doc._id, doc);
        if (bcResult) blockchainResults.push(bcResult);
    }

    res.status(200).json({
        success: true,
        count: results.length,
        data: results,
        blockchain: {
            storedCount: blockchainResults.length,
            transactions: blockchainResults.map(r => r.txHash)
        }
    });
});

// @desc    Get attendance records (with filters)
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = asyncHandler(async (req, res, next) => {
    const query = {};
    if (req.query.student) query.student = req.query.student;
    else if (req.user.role === 'Student') query.student = req.user.id;
    if (req.query.subject) query.subject = req.query.subject;
    if (req.query.date) query.date = new Date(req.query.date);
    if (req.query.from && req.query.to) {
        query.date = { $gte: new Date(req.query.from), $lte: new Date(req.query.to) };
    }

    const attendance = await Attendance.find(query)
        .populate('student', 'name studentProfile')
        .populate('subject', 'code name')
        .populate('markedBy', 'name')
        .sort({ date: -1 });

    res.status(200).json({ success: true, count: attendance.length, data: attendance });
});

// @desc    Get attendance summary for a student
// @route   GET /api/attendance/summary/:studentId
// @access  Private
exports.getAttendanceSummary = asyncHandler(async (req, res, next) => {
    const studentId = req.params.studentId || req.user.id;

    const pipeline = [
        { $match: { student: new (require('mongoose').Types.ObjectId)(studentId) } },
        {
            $group: {
                _id: '$subject',
                total: { $sum: 1 },
                present: {
                    $sum: { $cond: [{ $in: ['$status', ['Present', 'OD']] }, 1, 0] }
                },
                absent: {
                    $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
                }
            }
        },
        {
            $lookup: {
                from: 'subjects',
                localField: '_id',
                foreignField: '_id',
                as: 'subjectInfo'
            }
        },
        { $unwind: '$subjectInfo' },
        {
            $project: {
                subject: '$subjectInfo.name',
                subjectCode: '$subjectInfo.code',
                total: 1,
                present: 1,
                absent: 1,
                percentage: {
                    $round: [
                        { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
                        1
                    ]
                }
            }
        },
        { $sort: { subject: 1 } }
    ];

    const summary = await Attendance.aggregate(pipeline);

    // Overall
    const totalClasses = summary.reduce((s, r) => s + r.total, 0);
    const totalPresent = summary.reduce((s, r) => s + r.present, 0);
    const overallPercentage = totalClasses > 0
        ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
        : 0;

    res.status(200).json({
        success: true,
        data: {
            subjects: summary,
            overall: { totalClasses, totalPresent, percentage: overallPercentage }
        }
    });
});
