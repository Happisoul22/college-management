/**
 * controllers/subjects.js  –  Fully decentralised (no MongoDB)
 *
 * Subjects stored on IPFS + indexed on-chain.
 * Key format: subj_<uuid>
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// @desc    Get all subjects (with optional filters)
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = asyncHandler(async (req, res, next) => {
    const all = await blockchain.getAllRecordsOfType('subject');
    let results = all.map(r => r.data);

    if (req.query.department) results = results.filter(s => s.department === req.query.department);
    if (req.query.semester) results = results.filter(s => s.semester === parseInt(req.query.semester));
    if (req.query.year) results = results.filter(s => s.year === parseInt(req.query.year));
    if (req.query.faculty) results = results.filter(s => s.faculty === req.query.faculty);

    // Hydrate faculty user details
    const allUsers = await blockchain.getAllRecordsOfType('user');
    const userMap = {};
    for (const u of allUsers) {
        userMap[u.data.id] = {
            id: u.data.id,
            name: u.data.name,
            email: u.data.email,
            role: u.data.role
        };
    }

    results = results.map(s => {
        if (s.faculty && userMap[s.faculty]) {
            return {
                ...s,
                faculty: userMap[s.faculty]
            };
        } else if (s.faculty) {
            return {
                ...s,
                faculty: { id: s.faculty, name: 'Unknown Faculty' }
            };
        }
        return s;
    });

    results.sort((a, b) => (a.semester - b.semester) || a.name?.localeCompare(b.name));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Get subjects assigned to logged-in faculty
// @route   GET /api/subjects/my
// @access  Private (Faculty, ClassTeacher)
exports.getMySubjects = asyncHandler(async (req, res, next) => {
    const all = await blockchain.getAllRecordsOfType('subject');
    const results = all
        .map(r => r.data)
        .filter(s => {
            const facId = typeof s.faculty === 'object' ? (s.faculty?.id || s.faculty?._id) : s.faculty;
            return facId === req.user.id;
        })
        .sort((a, b) => (a.semester - b.semester) || a.name?.localeCompare(b.name));

    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.subject(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Subject not found', 404));

    const subjectData = { ...rec.data };

    // Hydrate faculty if present
    if (subjectData.faculty) {
        const facId = typeof subjectData.faculty === 'object' ? (subjectData.faculty.id || subjectData.faculty._id) : subjectData.faculty;
        if (facId) {
            const facRec = await blockchain.getRecord(blockchain.keys.user(facId));
            if (facRec) {
                subjectData.faculty = {
                    id: facRec.data.id,
                    name: facRec.data.name,
                    email: facRec.data.email,
                    role: facRec.data.role,
                    facultyProfile: facRec.data.facultyProfile
                };
            }
        }
    }

    res.status(200).json({ success: true, data: subjectData });
});

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private (HOD, Admin)
exports.createSubject = asyncHandler(async (req, res, next) => {
    const id = uuidv4();
    const key = blockchain.keys.subject(id);
    const subjData = {
        id,
        code: req.body.code || '',
        name: req.body.name || '',
        department: req.body.department || '',
        semester: req.body.semester ? parseInt(req.body.semester) : 1,
        year: req.body.year ? parseInt(req.body.year) : 1,
        credits: req.body.credits ? parseInt(req.body.credits) : 3,
        type: req.body.type || 'Theory',
        faculty: req.body.faculty || null,
        section: req.body.section || '',
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('subject', key, subjData, req.user.id);
    res.status(201).json({ success: true, data: subjData });
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (HOD, Admin)
exports.updateSubject = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.subject(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Subject not found', 404));

    const updated = { ...rec.data, ...req.body, updatedAt: new Date().toISOString() };
    await blockchain.storeRecord('subject', key, updated, rec.data.createdBy || req.user.id);

    res.status(200).json({ success: true, data: updated });
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (HOD, Admin)
exports.deleteSubject = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.subject(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Subject not found', 404));

    await blockchain.deleteRecord(key);
    res.status(200).json({ success: true, data: {} });
});

// @desc    Assign a faculty to a subject
// @route   PUT /api/subjects/:id/assign
// @access  Private (HOD, Admin)
exports.assignSubjectToFaculty = asyncHandler(async (req, res, next) => {
    const { faculty, section } = req.body;
    if (!faculty) return next(new ErrorResponse('Faculty ID is required', 400));

    const key = blockchain.keys.subject(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Subject not found', 404));

    const updated = { ...rec.data, faculty, section: section || '', updatedAt: new Date().toISOString() };
    await blockchain.storeRecord('subject', key, updated, rec.data.createdBy || req.user.id);

    res.status(200).json({ success: true, data: updated });
});

// @desc    Unassign faculty from a subject
// @route   PUT /api/subjects/:id/unassign
// @access  Private (HOD, Admin)
exports.unassignSubject = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.subject(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Subject not found', 404));

    const updated = { ...rec.data, faculty: null, section: '', updatedAt: new Date().toISOString() };
    await blockchain.storeRecord('subject', key, updated, rec.data.createdBy || req.user.id);

    res.status(200).json({ success: true, data: updated });
});
