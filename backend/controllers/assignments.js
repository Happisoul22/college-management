/**
 * controllers/assignments.js  –  Fully decentralised (no MongoDB)
 *
 * Class & counsellor assignments stored on IPFS + indexed on-chain.
 * The "classassign" type index is used across controllers.
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// Helper: fetch all class assignments from chain
const getAllClassAssignments = async () => {
    const all = await blockchain.getAllRecordsOfType('classassign');
    return all.map(r => r.data);
};

// Helper: fetch all counsellor assignments from chain
const getAllCounselAssignments = async () => {
    const all = await blockchain.getAllRecordsOfType('counselassign');
    return all.map(r => r.data);
};

// ═══════════ CLASS TEACHER ASSIGNMENTS ═══════════════════════════════════════

// @route   GET /api/assignments/class
exports.getClassAssignments = asyncHandler(async (req, res, next) => {
    let results = await getAllClassAssignments();

    const activeOnly = req.query.active !== 'false'; // default true
    if (activeOnly) results = results.filter(a => a.isActive !== false);
    if (req.query.department) results = results.filter(a => a.department === req.query.department);
    if (req.query.faculty) results = results.filter(a => a.faculty === req.query.faculty);
    if (req.query.academicYear) results = results.filter(a => a.academicYear === req.query.academicYear);

    results.sort((a, b) => (a.year - b.year) || a.section?.localeCompare(b.section));
    res.status(200).json({ success: true, count: results.length, data: results });
});

// @route   GET /api/assignments/class/my
exports.getMyClassAssignment = asyncHandler(async (req, res, next) => {
    let results = (await getAllClassAssignments())
        .filter(a => a.faculty === req.user.id && a.isActive !== false)
        .sort((a, b) => (a.year - b.year) || a.section?.localeCompare(b.section));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @route   GET /api/assignments/my-class-teacher
exports.getMyClassTeacher = asyncHandler(async (req, res, next) => {
    const student = req.user;
    if (!student?.studentProfile) return res.status(200).json({ success: true, data: null });

    const { branch, section, admissionYear } = student.studentProfile;
    if (!branch || !section || !admissionYear) return res.status(200).json({ success: true, data: null });

    const now = new Date();
    const yearDiff = now.getMonth() + 1 >= 7 ? now.getFullYear() - admissionYear + 1 : now.getFullYear() - admissionYear;
    const currentYear = Math.min(Math.max(yearDiff, 1), 4);

    const all = await getAllClassAssignments();
    const assignment = all.find(a =>
        a.department === branch && a.section === section &&
        a.year === currentYear && a.isActive !== false
    );

    if (!assignment) return res.status(200).json({ success: true, data: null });

    // Fetch faculty user data
    const facRec = await blockchain.getRecord(blockchain.keys.user(assignment.faculty));
    const faculty = facRec ? { ...facRec.data, passwordHash: undefined } : null;
    res.status(200).json({ success: true, data: { ...assignment, facultyData: faculty } });
});

// @route   POST /api/assignments/class
exports.assignClassTeacher = asyncHandler(async (req, res, next) => {
    const { faculty, department, year, semester, section, academicYear } = req.body;

    if (!faculty || !department || !year || !semester || !section || !academicYear) {
        return next(new ErrorResponse('All fields are required', 400));
    }

    // Verify faculty exists on chain
    const facRec = await blockchain.getRecord(blockchain.keys.user(faculty));
    if (!facRec || !['Faculty', 'ClassTeacher', 'HOD'].includes(facRec.data.role)) {
        return next(new ErrorResponse('Invalid faculty member', 400));
    }

    // Use deterministic key so we can upsert
    const key = blockchain.keys.classAssign(department, year, semester, section, academicYear);
    const existing = await blockchain.getRecord(key);
    const now = new Date().toISOString();

    const assignmentData = {
        id: key,
        faculty,
        facultyName: facRec.data.name,
        department,
        year: parseInt(year),
        semester: parseInt(semester),
        section,
        academicYear,
        assignedBy: req.user.id,
        isActive: true,
        createdAt: existing?.data?.createdAt || now,
        updatedAt: now,
    };

    await blockchain.storeRecord('classassign', key, assignmentData, faculty);

    // Promote faculty to ClassTeacher if they were Faculty
    if (facRec.data.role === 'Faculty') {
        const updated = { ...facRec.data, role: 'ClassTeacher', updatedAt: now };
        await blockchain.storeRecord('user', blockchain.keys.user(faculty), updated, faculty);
    }

    res.status(201).json({ success: true, data: assignmentData });
});

// @route   DELETE /api/assignments/class/:id
exports.removeClassAssignment = asyncHandler(async (req, res, next) => {
    const key = req.params.id; // key is the same composite key used to create
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Assignment not found', 404));

    const updated = { ...rec.data, isActive: false, updatedAt: new Date().toISOString() };
    await blockchain.storeRecord('classassign', key, updated, rec.data.faculty);

    // Revert faculty role if no other active class assignments
    const allAssign = await getAllClassAssignments();
    const hasOther = allAssign.some(a => a.faculty === rec.data.faculty && a.isActive && a.id !== key);
    if (!hasOther) {
        const facRec = await blockchain.getRecord(blockchain.keys.user(rec.data.faculty));
        if (facRec && facRec.data.role === 'ClassTeacher') {
            const updFac = { ...facRec.data, role: 'Faculty', updatedAt: new Date().toISOString() };
            await blockchain.storeRecord('user', blockchain.keys.user(rec.data.faculty), updFac, rec.data.faculty);
        }
    }

    res.status(200).json({ success: true, data: {} });
});

// ═══════════ COUNSELLOR ASSIGNMENTS ══════════════════════════════════════════

// @route   GET /api/assignments/counsellor
exports.getCounsellorAssignments = asyncHandler(async (req, res, next) => {
    let results = await getAllCounselAssignments();

    const activeOnly = req.query.active !== 'false';
    if (activeOnly) results = results.filter(a => a.isActive !== false);
    if (req.query.department) results = results.filter(a => a.department === req.query.department);
    if (req.query.faculty) results = results.filter(a => a.faculty === req.query.faculty);

    // Hydrate students
    for (let a of results) {
        // Hydrate faculty name if missing or stale
        const facId = typeof a.faculty === 'object' ? (a.faculty.id || a.faculty._id) : a.faculty;
        if (facId) {
            const facRec = await blockchain.getRecord(blockchain.keys.user(facId));
            if (facRec && facRec.data && facRec.data.name) {
                a.facultyName = facRec.data.name;
            }
        }

        if (a.students && a.students.length > 0) {
            const studentObjects = [];
            for (let sId of a.students) {
                const sRec = await blockchain.getRecord(blockchain.keys.user(sId));
                if (sRec) {
                    const { passwordHash, ...safeStudent } = sRec.data;
                    studentObjects.push(safeStudent);
                }
            }
            a.students = studentObjects;
        }
    }

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @route   GET /api/assignments/counsellor/my
exports.getMyCounsellorAssignment = asyncHandler(async (req, res, next) => {
    const results = (await getAllCounselAssignments())
        .filter(a => {
            const facId = typeof a.faculty === 'object' ? (a.faculty?.id || a.faculty?._id) : a.faculty;
            return facId === req.user.id && a.isActive !== false;
        });

    // Hydrate students
    for (let a of results) {
        if (a.students && a.students.length > 0) {
            const studentObjects = [];
            for (let sId of a.students) {
                const sRec = await blockchain.getRecord(blockchain.keys.user(sId));
                if (sRec) {
                    const { passwordHash, ...safeStudent } = sRec.data;
                    studentObjects.push(safeStudent);
                }
            }
            a.students = studentObjects;
        }
    }

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @route   GET /api/assignments/my-counsellor
exports.getMyCounsellor = asyncHandler(async (req, res, next) => {
    const all = await getAllCounselAssignments();
    const assignment = all.find(a => a.students?.includes(req.user.id) && a.isActive !== false);
    if (!assignment) return res.status(200).json({ success: true, data: null });

    const facRec = await blockchain.getRecord(blockchain.keys.user(assignment.faculty));
    const faculty = facRec ? { ...facRec.data, passwordHash: undefined } : null;
    res.status(200).json({ success: true, data: faculty });
});

// @route   POST /api/assignments/counsellor
exports.assignCounsellor = asyncHandler(async (req, res, next) => {
    const { faculty, students, department, academicYear } = req.body;

    if (!faculty || !students?.length || !department || !academicYear) {
        return next(new ErrorResponse('Faculty, students, department, and academic year are required', 400));
    }

    // Find existing assignment for this faculty + year
    const all = await getAllCounselAssignments();
    const existing = all.find(a =>
        a.faculty === faculty && a.academicYear === academicYear && a.isActive !== false
    );

    // Get faculty name for standardisation
    const facRec = await blockchain.getRecord(blockchain.keys.user(faculty));
    const facultyName = facRec ? facRec.data.name : 'Unknown Faculty';

    let assignmentData;
    let key;
    const now = new Date().toISOString();

    if (existing) {
        key = blockchain.keys.counselAssign(existing.id);
        const merged = [...new Set([...(existing.students || []), ...students])];
        assignmentData = { ...existing, students: merged, updatedAt: now };
    } else {
        const id = uuidv4();
        key = blockchain.keys.counselAssign(id);
        assignmentData = { id, faculty, facultyName, students, department, academicYear, assignedBy: req.user.id, isActive: true, createdAt: now, updatedAt: now };
    }

    await blockchain.storeRecord('counselassign', key, assignmentData, faculty);
    res.status(201).json({ success: true, data: assignmentData });
});

// @route   DELETE /api/assignments/counsellor/:id
exports.removeCounsellorAssignment = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.counselAssign(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Assignment not found', 404));

    const updated = { ...rec.data, isActive: false, updatedAt: new Date().toISOString() };
    await blockchain.storeRecord('counselassign', key, updated, rec.data.faculty);

    res.status(200).json({ success: true, data: {} });
});
