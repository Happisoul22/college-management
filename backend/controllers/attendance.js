/**
 * controllers/attendance.js  –  Fully decentralised (no MongoDB)
 *
 * Attendance records are stored as JSON on IPFS and indexed on-chain.
 * Key format: att_<studentId>_<subjectId>_<date>_<period>
 */

const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// @desc    Mark attendance (single or bulk)
// @route   POST /api/attendance
// @access  Private (Faculty, HOD)
exports.markAttendance = asyncHandler(async (req, res, next) => {
    const { subject, date, period, entries } = req.body;

    if (!subject || !date || !entries?.length) {
        return next(new ErrorResponse('Subject, date, and entries are required', 400));
    }

    const dateStr = new Date(date).toISOString().split('T')[0];
    const results = [];
    const bcResults = [];

    for (const entry of entries) {
        const recordKey = blockchain.keys.attendance(entry.student, subject, dateStr, period || 1);

        const attData = {
            id: recordKey,
            studentId: entry.student,
            subjectId: subject,
            date: dateStr,
            period: period || 1,
            status: entry.status,
            markedBy: req.user.id,
            createdAt: new Date().toISOString(),
        };

        const r = await blockchain.storeRecord('attendance', recordKey, attData, entry.student);
        results.push(attData);
        if (r) bcResults.push(r);
    }

    // Recalculate attendance % for each unique student
    const uniqueStudents = [...new Set(entries.map(e => e.student))];
    for (const sid of uniqueStudents) {
        const pct = await calcAttendancePercentage(sid);
        await updateUserAttendance(sid, pct);
    }

    res.status(200).json({
        success: true,
        count: results.length,
        data: results,
        blockchain: { storedCount: bcResults.length, cids: bcResults.map(r => r.cid) }
    });
});

// @desc    Get attendance records (with filters)
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = asyncHandler(async (req, res, next) => {
    const studentId = req.query.student || (req.user.role === 'Student' ? req.user.id : null);

    let results = [];

    if (studentId) {
        const keys = await blockchain.getUserRecordKeys(studentId, 'att_');
        const recs = await blockchain.getRecords(keys);
        results = recs.map(r => r.data);
    } else {
        const all = await blockchain.getAllRecordsOfType('attendance');
        results = all.map(r => r.data);
    }

    // Filters
    if (req.query.subject) results = results.filter(a => a.subjectId === req.query.subject);
    if (req.query.date) results = results.filter(a => a.date === req.query.date);
    if (req.query.from && req.query.to) {
        const from = new Date(req.query.from), to = new Date(req.query.to);
        results = results.filter(a => {
            const d = new Date(a.date);
            return d >= from && d <= to;
        });
    }

    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Get attendance summary for a student
// @route   GET /api/attendance/summary/:studentId
// @access  Private
exports.getAttendanceSummary = asyncHandler(async (req, res, next) => {
    const studentId = req.params.studentId || req.user.id;

    const keys = await blockchain.getUserRecordKeys(studentId, 'att_');
    const recs = await blockchain.getRecords(keys);

    if (!recs.length) {
        return res.status(200).json({
            success: true,
            data: { subjects: [], overall: { totalClasses: 0, totalPresent: 0, percentage: 0 } }
        });
    }

    // Group by subject
    const bySubject = {};
    for (const r of recs) {
        const { subjectId, status } = r.data;
        if (!bySubject[subjectId]) bySubject[subjectId] = { total: 0, present: 0, absent: 0, subjectId };
        bySubject[subjectId].total++;
        if (['Present', 'OD'].includes(status)) bySubject[subjectId].present++;
        else bySubject[subjectId].absent++;
    }

    const subjects = Object.values(bySubject).map(s => ({
        ...s,
        percentage: s.total > 0 ? parseFloat(((s.present / s.total) * 100).toFixed(1)) : 0
    }));

    const totalClasses = subjects.reduce((s, r) => s + r.total, 0);
    const totalPresent = subjects.reduce((s, r) => s + r.present, 0);
    const overallPct = totalClasses > 0
        ? parseFloat(((totalPresent / totalClasses) * 100).toFixed(1))
        : 0;

    res.status(200).json({
        success: true,
        data: {
            subjects,
            overall: { totalClasses, totalPresent, percentage: overallPct }
        }
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcAttendancePercentage = async (studentId) => {
    try {
        const keys = await blockchain.getUserRecordKeys(studentId, 'att_');
        const recs = await blockchain.getRecords(keys);
        if (!recs.length) return 0;
        const present = recs.filter(r => ['Present', 'OD'].includes(r.data.status)).length;
        return parseFloat(((present / recs.length) * 100).toFixed(1));
    } catch (e) { return 0; }
};

const updateUserAttendance = async (studentId, percentage) => {
    try {
        const rec = await blockchain.getRecord(blockchain.keys.user(studentId));
        if (!rec) return;
        const userData = { ...rec.data };
        if (userData.studentProfile) {
            userData.studentProfile.attendance = percentage;
            userData.updatedAt = new Date().toISOString();
            await blockchain.storeRecord('user', blockchain.keys.user(studentId), userData, studentId);
        }
    } catch (e) { console.error('updateUserAttendance error:', e.message); }
};
