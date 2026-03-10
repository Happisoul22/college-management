/**
 * controllers/marks.js  –  Fully decentralised (no MongoDB)
 *
 * Marks are stored as JSON blobs on IPFS; each blob's CID is indexed on-chain.
 * Key format: marks_<studentId>_<subjectId>_<academicYear>
 */

const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// ── Grade calculation helper ──────────────────────────────────────────────────
const GRADE_TABLE = [
    { min: 90, grade: 'O', gp: 10 },
    { min: 80, grade: 'A+', gp: 9 },
    { min: 70, grade: 'A', gp: 8 },
    { min: 60, grade: 'B+', gp: 7 },
    { min: 50, grade: 'B', gp: 6 },
    { min: 40, grade: 'C', gp: 5 },
    { min: 0, grade: 'F', gp: 0 },
];

const calcGrade = (total, maxMarks = 100) => {
    const pct = maxMarks > 0 ? (total / maxMarks) * 100 : 0;
    const row = GRADE_TABLE.find(r => pct >= r.min) || GRADE_TABLE[GRADE_TABLE.length - 1];
    return { grade: row.grade, gradePoint: row.gp };
};

const calcInternalTotal = (internal = {}) =>
    Object.values(internal).reduce((s, v) => s + (parseFloat(v) || 0), 0);

const calcExternalTotal = (external = {}) =>
    Object.values(external).reduce((s, v) => s + (parseFloat(v) || 0), 0);

// ── Recalculate CGPA for a student (reads all marks from chain) ───────────────
const recalculateCGPA = async (studentId) => {
    try {
        const keys = await blockchain.getUserRecordKeys(studentId, 'marks_');
        const recs = await blockchain.getRecords(keys);
        if (!recs.length) return 0;

        let totalWGP = 0, totalCredits = 0;
        for (const r of recs) {
            const credits = r.data.credits || 3;
            totalWGP += (r.data.gradePoint || 0) * credits;
            totalCredits += credits;
        }
        return totalCredits > 0 ? parseFloat((totalWGP / totalCredits).toFixed(2)) : 0;
    } catch (e) {
        console.error('recalculateCGPA error:', e.message);
        return 0;
    }
};

// Update CGPA inside user record
const updateUserCGPA = async (studentId, cgpa) => {
    try {
        const rec = await blockchain.getRecord(blockchain.keys.user(studentId));
        if (!rec) return;
        const userData = { ...rec.data };
        if (userData.studentProfile) {
            userData.studentProfile.cgpa = cgpa;
            userData.updatedAt = new Date().toISOString();
            await blockchain.storeRecord('user', blockchain.keys.user(studentId), userData, studentId);
        }
    } catch (e) { console.error('updateUserCGPA error:', e.message); }
};

// ═══════════════════════ HANDLERS ═════════════════════════════════════════════

// @desc    Get marks (student or by subject/semester)
// @route   GET /api/marks
// @access  Private
exports.getMarks = asyncHandler(async (req, res, next) => {
    const studentId = req.query.student || (req.user.role === 'Student' ? req.user.id : null);

    let results = [];

    if (studentId) {
        // Get all marks keys for this student
        const keys = await blockchain.getUserRecordKeys(studentId, 'marks_');
        const recs = await blockchain.getRecords(keys);
        results = recs.map(r => r.data);
    } else {
        // Faculty/HOD: list all marks of type
        const all = await blockchain.getAllRecordsOfType('marks');
        results = all.map(r => r.data);
    }

    // Apply filters
    if (req.query.semester) results = results.filter(m => m.semester === parseInt(req.query.semester));
    if (req.query.subject) results = results.filter(m => m.subjectId === req.query.subject);
    if (req.query.academicYear) results = results.filter(m => m.academicYear === req.query.academicYear);
    if (req.query.student && !req.query.student) results = results.filter(m => m.studentId === req.query.student);

    // Hydrate subjects to ensure charts show actual codes/names
    const allSubjects = await blockchain.getAllRecordsOfType('subject');
    const subjectMap = {};
    for (const s of allSubjects.map(r => r.data)) {
        subjectMap[s.id] = s;
    }

    results = results.map(m => ({
        ...m,
        subject: subjectMap[m.subjectId] ? { 
            id: m.subjectId, 
            code: subjectMap[m.subjectId].code, 
            name: subjectMap[m.subjectId].name 
        } : m.subject
    }));

    // Sort by semester
    results.sort((a, b) => (a.semester || 0) - (b.semester || 0));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Enter / update marks for a single student-subject
// @route   POST /api/marks
// @access  Private (Faculty, HOD)
exports.enterMarks = asyncHandler(async (req, res, next) => {
    const { student, subject, semester, year, academicYear, internal, external } = req.body;

    if (!student || !subject) {
        return next(new ErrorResponse('Student and Subject are required', 400));
    }

    const recordKey = blockchain.keys.marks(student, subject, academicYear || 'na');

    // Check if marks already exist
    const existing = await blockchain.getRecord(recordKey);
    let marksData;

    if (existing) {
        marksData = { ...existing.data };
        if (internal) Object.assign(marksData.internal, internal);
        if (external) Object.assign(marksData.external, external);
    } else {
        marksData = {
            id: recordKey,
            studentId: student,
            subjectId: subject,
            semester: semester || 1,
            year: year || 1,
            academicYear: academicYear || '',
            internal: internal || {},
            external: external || {},
            enteredBy: req.user.id,
            createdAt: new Date().toISOString(),
        };
    }

    // Recalculate totals & grade
    marksData.internalTotal = calcInternalTotal(marksData.internal);
    marksData.externalTotal = calcExternalTotal(marksData.external);
    marksData.totalMarks = marksData.internalTotal + marksData.externalTotal;
    const { grade, gradePoint } = calcGrade(marksData.totalMarks, 100);
    marksData.grade = grade;
    marksData.gradePoint = gradePoint;
    marksData.updatedAt = new Date().toISOString();

    const result = await blockchain.storeRecord('marks', recordKey, marksData, student);

    // Recalculate & persist CGPA
    const cgpa = await recalculateCGPA(student);
    await updateUserCGPA(student, cgpa);

    res.status(200).json({
        success: true,
        data: marksData,
        blockchain: result ? { txHash: result.txHash, cid: result.cid, recordKey } : null
    });
});

// @desc    Bulk enter marks for multiple students (same subject)
// @route   POST /api/marks/bulk
// @access  Private (Faculty, HOD)
exports.bulkEnterMarks = asyncHandler(async (req, res, next) => {
    const { subject, semester, year, academicYear, entries } = req.body;

    if (!subject || !entries?.length) {
        return next(new ErrorResponse('Subject and entries are required', 400));
    }

    const results = [];
    const bcResults = [];

    for (const entry of entries) {
        const recordKey = blockchain.keys.marks(entry.student, subject, academicYear || 'na');
        const existing = await blockchain.getRecord(recordKey);
        let marksData;

        if (existing) {
            marksData = { ...existing.data };
            if (entry.internal) Object.assign(marksData.internal, entry.internal);
            if (entry.external) Object.assign(marksData.external, entry.external);
        } else {
            marksData = {
                id: recordKey,
                studentId: entry.student,
                subjectId: subject,
                semester: semester || 1,
                year: year || 1,
                academicYear: academicYear || '',
                internal: entry.internal || {},
                external: entry.external || {},
                enteredBy: req.user.id,
                createdAt: new Date().toISOString(),
            };
        }

        marksData.internalTotal = calcInternalTotal(marksData.internal);
        marksData.externalTotal = calcExternalTotal(marksData.external);
        marksData.totalMarks = marksData.internalTotal + marksData.externalTotal;
        const { grade, gradePoint } = calcGrade(marksData.totalMarks, 100);
        marksData.grade = grade;
        marksData.gradePoint = gradePoint;
        marksData.updatedAt = new Date().toISOString();

        const r = await blockchain.storeRecord('marks', recordKey, marksData, entry.student);
        results.push(marksData);
        if (r) bcResults.push(r);
    }

    // Recalculate CGPA for each unique student
    const uniqueStudents = [...new Set(entries.map(e => e.student))];
    for (const sid of uniqueStudents) {
        const cgpa = await recalculateCGPA(sid);
        await updateUserCGPA(sid, cgpa);
    }

    res.status(200).json({
        success: true,
        count: results.length,
        data: results,
        blockchain: { storedCount: bcResults.length, cids: bcResults.map(r => r.cid) }
    });
});

// @desc    Get CGPA for a student
// @route   GET /api/marks/cgpa/:studentId
// @access  Private
exports.getStudentCGPA = asyncHandler(async (req, res, next) => {
    const studentId = req.params.studentId || req.user.id;
    const keys = await blockchain.getUserRecordKeys(studentId, 'marks_');
    const recs = await blockchain.getRecords(keys);

    if (!recs.length) {
        return res.status(200).json({
            success: true, data: { cgpa: 0, sgpa: {}, totalCredits: 0, totalSubjects: 0 }
        });
    }

    const bySem = {};
    recs.forEach(r => {
        const sem = r.data.semester || 1;
        if (!bySem[sem]) bySem[sem] = [];
        bySem[sem].push(r.data);
    });

    const sgpa = {};
    let totalWGP = 0, totalCredits = 0;

    Object.keys(bySem).sort().forEach(sem => {
        let sw = 0, sc = 0;
        bySem[sem].forEach(m => {
            const c = m.credits || 3;
            sw += (m.gradePoint || 0) * c;
            sc += c;
        });
        sgpa[sem] = sc > 0 ? parseFloat((sw / sc).toFixed(2)) : 0;
        totalWGP += sw;
        totalCredits += sc;
    });

    const cgpa = totalCredits > 0 ? parseFloat((totalWGP / totalCredits).toFixed(2)) : 0;

    res.status(200).json({
        success: true,
        data: { cgpa, sgpa, totalCredits, totalSubjects: recs.length }
    });
});
