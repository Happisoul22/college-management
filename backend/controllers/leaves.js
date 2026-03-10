/**
 * controllers/leaves.js  –  Fully decentralised (no MongoDB)
 *
 * Leave records stored as JSON on IPFS + indexed per user on-chain.
 * Key format: leave_<uuid>
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
exports.applyLeave = asyncHandler(async (req, res, next) => {
    if (req.body.startDate && req.body.endDate) {
        if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
            return next(new ErrorResponse('End date cannot be before start date', 400));
        }
    }

    const id = uuidv4();
    const key = blockchain.keys.leave(id);

    const leaveData = {
        id,
        user: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        applicantRole: req.user.role,
        type: req.body.type || '',
        reason: req.body.reason || '',
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        status: ['HOD', 'Principal', 'Admin'].includes(req.user.role) ? 'Approved' : 'Pending',
        approvedBy: ['HOD', 'Principal', 'Admin'].includes(req.user.role) ? req.user.id : null,
        approverName: ['HOD', 'Principal', 'Admin'].includes(req.user.role) ? req.user.name : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Also store under student/faculty profile info
    if (req.user.role === 'Student') {
        leaveData.branch = req.user.studentProfile?.branch || '';
        leaveData.section = req.user.studentProfile?.section || '';
    } else {
        leaveData.department = req.user.facultyProfile?.department || '';
    }

    const result = await blockchain.storeRecord('leave', key, leaveData, req.user.id);

    res.status(201).json({
        success: true,
        data: leaveData,
        blockchain: result ? { txHash: result.txHash, cid: result.cid } : null
    });
});

// @desc    Get leaves (role-scoped)
// @route   GET /api/leaves
// @access  Private
exports.getLeaves = asyncHandler(async (req, res, next) => {
    const all = await blockchain.getAllRecordsOfType('leave');
    let results = all.map(r => r.data);

    if (req.user.role === 'Student') {
        // Own leaves only
        results = results.filter(l => l.user === req.user.id && l.applicantRole === 'Student');

    } else if (['Faculty', 'ClassTeacher'].includes(req.user.role)) {
        // Own leaves + student leaves from assigned class
        const myAssigns = (await blockchain.getAllRecordsOfType('classassign'))
            .map(r => r.data)
            .filter(a => a.faculty === req.user.id && a.isActive);

        let assignedStudentIds = new Set();
        if (myAssigns.length) {
            const allUsers = await blockchain.getAllRecordsOfType('user');
            for (const a of myAssigns) {
                allUsers
                    .map(r => r.data)
                    .filter(u =>
                        u.role === 'Student' &&
                        u.studentProfile?.branch === a.department &&
                        u.studentProfile?.section === a.section
                    )
                    .forEach(u => assignedStudentIds.add(u.id));
            }
        }

        results = results.filter(l =>
            l.user === req.user.id ||
            (assignedStudentIds.has(l.user) && l.applicantRole === 'Student')
        );

    } else if (['HOD', 'Principal', 'Admin'].includes(req.user.role)) {
        const dept = req.user.facultyProfile?.department;
        const allUsers = await blockchain.getAllRecordsOfType('user');

        let deptFacultyIds = new Set();
        if (dept) {
            allUsers
                .map(r => r.data)
                .filter(u => ['Faculty', 'ClassTeacher', 'HOD'].includes(u.role) &&
                    u.facultyProfile?.department === dept && u.id !== req.user.id)
                .forEach(u => deptFacultyIds.add(u.id));
        }

        results = results.filter(l =>
            l.applicantRole === 'Student' || deptFacultyIds.has(l.user)
        );
    }

    const allUsersData = (await blockchain.getAllRecordsOfType('user')).map(r => r.data);
    const userMap = new Map(allUsersData.map(u => [u.id, u]));

    // Attach user profile object correctly
    results = results.map(l => ({
        ...l,
        user: userMap.get(l.user) || { name: l.userName, email: l.userEmail }
    }));

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ success: true, count: results.length, data: results });
});

// @desc    Update leave status
// @route   PUT /api/leaves/:id
// @access  Private (Faculty, HOD)
exports.updateLeaveStatus = asyncHandler(async (req, res, next) => {
    const key = blockchain.keys.leave(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return next(new ErrorResponse('Leave not found', 404));

    const existing = rec.data;

    if (req.user.role === 'Student') {
        return next(new ErrorResponse('Students cannot approve leaves', 403));
    }

    if (['Faculty', 'ClassTeacher'].includes(req.user.role) && existing.applicantRole !== 'Student') {
        return next(new ErrorResponse('Only HOD can approve faculty leaves', 403));
    }

    const updated = {
        ...existing,
        status: req.body.status,
        approvedBy: req.user.id,
        approverName: req.user.name,
        updatedAt: new Date().toISOString(),
    };

    console.log(`[Leaves] Updating record ${key} to status ${updated.status}`);
    const result = await blockchain.storeRecord('leave', key, updated, existing.user);
    console.log(`[Leaves] Store result:`, result);

    res.status(200).json({
        success: true,
        data: updated,
        blockchain: result ? { txHash: result.txHash, cid: result.cid } : null
    });
});
