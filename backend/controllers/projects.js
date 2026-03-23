/**
 * controllers/projects.js  –  Project Management
 *
 * Stores all project data via IPFS+blockchain (same pattern as other controllers).
 * Record types:
 *   - 'project'    → proj_<id>
 *   - 'projrole'   → projrole_<id>   (faculty project-role assignments)
 *   - 'projsched'  → projsched_<id>  (review schedules / deadlines)
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');
const { createNotification } = require('./notifications');

// ── Key builders ──────────────────────────────────────────────────────────────
const k = {
    project : (id)  => `proj_${id}`,
    projRole: (id)  => `projrole_${id}`,
    projSched: (id) => `projsched_${id}`,
};

// ── Helper: get all records of a given key prefix by scanning local store ─────
const getAllByPrefix = async (prefix, recordType) => {
    const recs = await blockchain.getAllRecordsOfType(recordType);
    return recs.map(r => r.data).filter(Boolean);
};

// ── Helper: get all users from IPFS store ─────────────────────────────────────
const getAllUsers = async () => {
    const recs = await blockchain.getAllRecordsOfType('user');
    return recs.map(r => r.data).filter(Boolean);
};

// ── Helper: check if requester has a project role ─────────────────────────────
const getProjectRole = async (userId) => {
    const roles = await getAllByPrefix('projrole_', 'projrole');
    return roles.find(r => r.facultyId === userId && r.active) || null;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PROJECT ROLE MANAGEMENT
//  HOD  → assigns Coordinator or IDC Member only
//  Coordinator → assigns Guide only
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Assign a faculty project role
// @route POST /api/projects/roles/assign
// @access HOD (coordinator/idc_member only) | Coordinator (guide only)
exports.assignProjectRole = asyncHandler(async (req, res, next) => {
    const { facultyId, projectRole, department } = req.body;

    const hodRoles = ['HOD', 'Principal', 'Admin'];
    const myProjectRole = await getProjectRole(req.user.id);
    const isHOD = hodRoles.includes(req.user.role);
    const isCoordinator = myProjectRole?.projectRole === 'coordinator';

    if (!isHOD && !isCoordinator) {
        return next(new ErrorResponse('Not authorized to assign project roles', 403));
    }

    // HOD can only assign coordinator or idc_member
    if (isHOD && !isCoordinator && projectRole === 'guide') {
        return next(new ErrorResponse('HOD can only assign Coordinator or IDC Member roles. Assign a Guide via the Coordinator.', 403));
    }

    // Coordinator no longer assigns general 'guide' role. Guides are assigned dynamically when a project is created.
    if (isCoordinator) {
        return next(new ErrorResponse('Coordinators assign guides directly during project creation, not from this menu.', 403));
    }

    if (!facultyId || !projectRole) {
        return next(new ErrorResponse('facultyId and projectRole are required', 400));
    }

    const hodAllowed  = ['coordinator', 'idc_member'];
    const validRoles  = ['coordinator', 'idc_member', 'guide'];
    if (!validRoles.includes(projectRole)) {
        return next(new ErrorResponse(`projectRole must be one of: ${validRoles.join(', ')}`, 400));
    }

    // Deactivate existing role for this faculty (one role at a time)
    const existing = await getAllByPrefix('projrole_', 'projrole');
    for (const r of existing) {
        if (r.facultyId === facultyId && r.active) {
            const updated = { ...r, active: false, updatedAt: new Date().toISOString() };
            await blockchain.storeRecord('projrole', k.projRole(r.id), updated, facultyId);
        }
    }

    const id = uuidv4();
    const roleData = {
        id,
        facultyId,
        projectRole,
        department: department || req.user.facultyProfile?.department || '',
        assignedBy: req.user.id,
        assignedByRole: req.user.role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('projrole', k.projRole(id), roleData, facultyId);

    // Notify the faculty member
    const users = await getAllUsers();
    const faculty = users.find(u => u.id === facultyId);
    if (faculty) {
        await createNotification({
            recipient: facultyId,
            sender: req.user.id,
            type: 'project_role',
            message: `You have been assigned as ${projectRole.replace('_', ' ')} by ${req.user.name}.`,
            link: projectRole === 'guide' ? '/guide-projects' : projectRole === 'idc_member' ? '/idc-review' : '/project-management',
        });
    }

    res.status(200).json({ success: true, data: roleData });
});

// @desc  Remove a project role from a faculty member
// @route DELETE /api/projects/roles/:facultyId
// @access HOD/Principal/Admin or Coordinator (for guides only)
exports.removeProjectRole = asyncHandler(async (req, res, next) => {
    const { facultyId } = req.params;
    const allowedRoles = ['HOD', 'Principal', 'Admin'];
    const myProjectRole = await getProjectRole(req.user.id);
    const isCoordinator = myProjectRole?.projectRole === 'coordinator';

    if (!allowedRoles.includes(req.user.role) && !isCoordinator) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    const existing = await getAllByPrefix('projrole_', 'projrole');
    for (const r of existing) {
        if (r.facultyId === facultyId && r.active) {
            if (isCoordinator) {
                return next(new ErrorResponse('Coordinators cannot remove project roles from this menu.', 403));
            }
            const updated = { ...r, active: false, updatedAt: new Date().toISOString() };
            await blockchain.storeRecord('projrole', k.projRole(r.id), updated, facultyId);
        }
    }

    res.status(200).json({ success: true, message: 'Role removed' });
});

// @desc  Get all active project role assignments
// @route GET /api/projects/roles
// @access Faculty+
exports.getProjectRoles = asyncHandler(async (req, res, next) => {
    const roles = await getAllByPrefix('projrole_', 'projrole');
    const active = roles.filter(r => r.active);

    // Attach user info
    const users = await getAllUsers();
    const enriched = active.map(r => {
        const faculty = users.find(u => u.id === r.facultyId);
        return {
            ...r,
            faculty: faculty ? {
                id: faculty.id,
                name: faculty.name,
                email: faculty.email,
                facultyId: faculty.facultyProfile?.facultyId,
                department: faculty.facultyProfile?.department,
            } : null,
        };
    });

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
});

// @desc  Get my project role (if any)
// @route GET /api/projects/roles/me
// @access Faculty
exports.getMyProjectRole = asyncHandler(async (req, res, next) => {
    const role = await getProjectRole(req.user.id);
    res.status(200).json({ success: true, data: role });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PROJECT CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// @desc  Create a new project (Coordinator)
// @route POST /api/projects
// @access Coordinator or HOD
exports.createProject = asyncHandler(async (req, res, next) => {
    const myRole = await getProjectRole(req.user.id);
    const isCoordinator = myRole?.projectRole === 'coordinator';

    if (!isCoordinator) {
        return next(new ErrorResponse('Only Coordinators can create projects', 403));
    }

    const {
        title, description, type, students, guideId,
        year, department, batch, githubLink, researchPapers,
    } = req.body;

    if (!title || !type) {
        return next(new ErrorResponse('title and type are required', 400));
    }

    const id = uuidv4();
    const projectData = {
        id,
        title,
        description: description || '',
        type: type || 'individual', // 'individual' | 'group'
        students: students || [],   // array of userId
        guideId: guideId || null,
        coordinatorId: req.user.id,
        year: year || null,
        department: department || req.user.facultyProfile?.department || '',
        batch: batch || '',
        status: 'Pending',          // Pending | Ongoing | Completed | Rejected
        reviewStatus: 0,            // 0, 1, 2
        feedback: [],
        score: null,
        proofUrl: null,
        githubLink: githubLink || '',
        researchPapers: researchPapers || [],
        submittedAt: null,
        deadline: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('project', k.project(id), projectData, req.user.id);

    // Notify students
    for (const studentId of (students || [])) {
        await createNotification({
            recipient: studentId,
            sender: req.user.id,
            type: 'project_assigned',
            message: `You have been assigned to project: "${title}"`,
            link: '/my-project',
        });
    }

    // Notify guide
    if (guideId) {
        await createNotification({
            recipient: guideId,
            sender: req.user.id,
            type: 'project_guide',
            message: `You have been assigned as guide for project: "${title}"`,
            link: '/guide-projects',
        });
    }

    res.status(201).json({ success: true, data: projectData });
});

// @desc  Get all projects (HOD/Coordinator/IDC sees all; Guide sees own; Student sees own)
// @route GET /api/projects
exports.getAllProjects = asyncHandler(async (req, res, next) => {
    const projects = await getAllByPrefix('proj_', 'project');
    const myRole = await getProjectRole(req.user.id);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(req.user.role);
    const isCoordinator = myRole?.projectRole === 'coordinator';
    const isIDC = myRole?.projectRole === 'idc_member';
    const isGuide = myRole?.projectRole === 'guide';
    const isStudent = req.user.role === 'Student';

    let filtered = projects;

    if (isIDC) {
        // IDC sees only final year (year 4) projects
        filtered = projects.filter(p => Number(p.year) === 4);
    } else if (isGuide && !isHOD && !isCoordinator) {
        filtered = projects.filter(p => p.guideId === req.user.id);
    } else if (isStudent) {
        filtered = projects.filter(p => (p.students || []).includes(req.user.id));
    }

    // Enrich with user info
    const users = await getAllUsers();
    const enriched = filtered.map(p => enrichProject(p, users));

    // Apply filters from query
    const { status, year, department } = req.query;
    let result = enriched;
    if (status) result = result.filter(p => p.status === status);
    if (year) result = result.filter(p => String(p.year) === String(year));
    if (department) result = result.filter(p => p.department === department);

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, count: result.length, data: result });
});

// @desc  Get single project
// @route GET /api/projects/:id
exports.getProject = asyncHandler(async (req, res, next) => {
    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(rec.data, users) });
});

// @desc  Update project (Coordinator or Guide)
// @route PUT /api/projects/:id
exports.updateProject = asyncHandler(async (req, res, next) => {
    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));

    const p = rec.data;
    const myRole = await getProjectRole(req.user.id);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(req.user.role);
    const isCoordinator = myRole?.projectRole === 'coordinator';
    const isGuide = p.guideId === req.user.id;
    const canEdit = isHOD || isCoordinator || isGuide;

    if (!canEdit) {
        return next(new ErrorResponse('Not authorized to update this project', 403));
    }

    const allowedFields = ['title', 'description', 'status', 'reviewStatus', 'guideId',
        'students', 'githubLink', 'researchPapers', 'proofUrl', 'deadline', 'year',
        'department', 'batch', 'type'];

    const updated = { ...p };
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) updated[field] = req.body[field];
    }
    updated.updatedAt = new Date().toISOString();

    await blockchain.storeRecord('project', k.project(p.id), updated, req.user.id);

    // Notify students of status change
    if (req.body.status && req.body.status !== p.status) {
        for (const studentId of (p.students || [])) {
            await createNotification({
                recipient: studentId,
                sender: req.user.id,
                type: 'project_status',
                message: `Your project "${p.title}" status updated to: ${req.body.status}`,
                link: '/my-project',
            });
        }
    }

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(updated, users) });
});

// @desc  Add feedback/comment to a project
// @route POST /api/projects/:id/feedback
exports.addFeedback = asyncHandler(async (req, res, next) => {
    const { comment } = req.body;
    if (!comment) return next(new ErrorResponse('Comment is required', 400));

    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));

    const p = rec.data;
    const myRole = await getProjectRole(req.user.id);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(req.user.role);
    const isGuide = p.guideId === req.user.id;
    const isIDC = myRole?.projectRole === 'idc_member';
    const isCoordinator = myRole?.projectRole === 'coordinator';

    if (!isHOD && !isGuide && !isIDC && !isCoordinator) {
        return next(new ErrorResponse('Not authorized to add feedback', 403));
    }

    const feedbackEntry = {
        id: uuidv4(),
        userId: req.user.id,
        name: req.user.name,
        role: isGuide && !isCoordinator && !isIDC ? 'guide' : (myRole?.projectRole || req.user.role),
        comment,
        createdAt: new Date().toISOString(),
    };

    const updated = {
        ...p,
        feedback: [...(p.feedback || []), feedbackEntry],
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('project', k.project(p.id), updated, req.user.id);

    // Notify all students
    for (const studentId of (p.students || [])) {
        await createNotification({
            recipient: studentId,
            sender: req.user.id,
            type: 'project_feedback',
            message: `New feedback on your project "${p.title}" from ${req.user.name}.`,
            link: '/my-project',
        });
    }
    // Notify guide if feedback from coordinator/IDC
    if ((isCoordinator || isIDC || isHOD) && p.guideId && p.guideId !== req.user.id) {
        await createNotification({
            recipient: p.guideId,
            sender: req.user.id,
            type: 'project_feedback',
            message: `${req.user.name} added feedback to project "${p.title}".`,
            link: '/guide-projects',
        });
    }

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(updated, users) });
});

// @desc  Student submits their project (proof URL / GitHub link)
// @route POST /api/projects/:id/submit
exports.submitProject = asyncHandler(async (req, res, next) => {
    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));

    const p = rec.data;
    if (!p.students.includes(req.user.id)) {
        return next(new ErrorResponse('You are not a member of this project', 403));
    }

    const { proofUrl, githubLink, description } = req.body;

    const updated = {
        ...p,
        proofUrl: proofUrl || p.proofUrl,
        githubLink: githubLink || p.githubLink,
        description: description || p.description,
        status: 'Ongoing', // moving to ongoing on submission
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('project', k.project(p.id), updated, req.user.id);

    // Notify guide
    if (p.guideId) {
        await createNotification({
            recipient: p.guideId,
            sender: req.user.id,
            type: 'project_submission',
            message: `Students submitted project "${p.title}". Please review.`,
            link: '/guide-projects',
        });
    }

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(updated, users) });
});

// @desc  Guide approves/rejects submission and updates review status
// @route PUT /api/projects/:id/review
exports.reviewProject = asyncHandler(async (req, res, next) => {
    const { action, reviewStatus, comment } = req.body;
    // action: 'approve' | 'reject'
    const myRole = await getProjectRole(req.user.id);
    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));
    
    const p = rec.data;
    const isGuide = p.guideId === req.user.id;
    const isCoordinator = myRole?.projectRole === 'coordinator';
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(req.user.role);

    if (!isGuide && !isCoordinator && !isHOD) {
        return next(new ErrorResponse('Only guides/coordinators can review', 403));
    }

    const newStatus = action === 'approve' ? 'Completed' : action === 'reject' ? 'Rejected' : p.status;

    const feedbackEntries = [...(p.feedback || [])];
    if (comment) {
        feedbackEntries.push({
            id: uuidv4(),
            userId: req.user.id,
            name: req.user.name,
            role: isGuide && !isCoordinator && !isHOD ? 'guide' : (myRole?.projectRole || req.user.role),
            comment,
            createdAt: new Date().toISOString(),
        });
    }

    const updated = {
        ...p,
        status: newStatus,
        reviewStatus: reviewStatus !== undefined ? reviewStatus : p.reviewStatus,
        feedback: feedbackEntries,
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('project', k.project(p.id), updated, req.user.id);

    for (const studentId of (p.students || [])) {
        await createNotification({
            recipient: studentId,
            sender: req.user.id,
            type: 'project_review',
            message: `Your project "${p.title}" was ${action}d by the guide.`,
            link: '/my-project',
        });
    }

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(updated, users) });
});

// @desc  IDC Member scores a project
// @route PUT /api/projects/:id/score
exports.scoreProject = asyncHandler(async (req, res, next) => {
    const myRole = await getProjectRole(req.user.id);
    if (myRole?.projectRole !== 'idc_member') {
        return next(new ErrorResponse('Only IDC Members can score projects', 403));
    }

    const { innovation, implementation, documentation, presentation, comment } = req.body;
    const rec = await blockchain.getRecord(k.project(req.params.id));
    if (!rec) return next(new ErrorResponse('Project not found', 404));

    const p = rec.data;
    if (Number(p.year) !== 4) {
        return next(new ErrorResponse('IDC can only score final year (Year 4) projects', 400));
    }

    const scoreEntry = {
        scoredBy: req.user.id,
        scorerName: req.user.name,
        innovation: Number(innovation) || 0,
        implementation: Number(implementation) || 0,
        documentation: Number(documentation) || 0,
        presentation: Number(presentation) || 0,
        total: (Number(innovation) + Number(implementation) + Number(documentation) + Number(presentation)),
        scoredAt: new Date().toISOString(),
    };

    const feedbackEntries = [...(p.feedback || [])];
    if (comment) {
        feedbackEntries.push({
            id: uuidv4(),
            userId: req.user.id,
            name: req.user.name,
            role: 'idc_member',
            comment,
            createdAt: new Date().toISOString(),
        });
    }

    const updated = {
        ...p,
        score: scoreEntry,
        feedback: feedbackEntries,
        updatedAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('project', k.project(p.id), updated, req.user.id);

    for (const studentId of (p.students || [])) {
        await createNotification({
            recipient: studentId,
            sender: req.user.id,
            type: 'project_score',
            message: `Your project "${p.title}" has been scored by IDC. Total: ${scoreEntry.total}/40`,
            link: '/my-project',
        });
    }

    const users = await getAllUsers();
    res.status(200).json({ success: true, data: enrichProject(updated, users) });
});

// @desc  Set review schedule (Coordinator ONLY)
// @route POST /api/projects/schedule
exports.setReviewSchedule = asyncHandler(async (req, res, next) => {
    const myRole = await getProjectRole(req.user.id);
    const isCoordinator = myRole?.projectRole === 'coordinator';

    if (!isCoordinator) {
        return next(new ErrorResponse('Only the Project Coordinator can set review schedules', 403));
    }

    const { review0, review1, review2, department } = req.body;
    const id = uuidv4();
    const schedData = {
        id,
        type: 'review_schedule',
        review0: review0 || null,
        review1: review1 || null,
        review2: review2 || null,
        department: department || req.user.facultyProfile?.department || '',
        setBy: req.user.id,
        createdAt: new Date().toISOString(),
    };

    await blockchain.storeRecord('projsched', k.projSched(id), schedData, req.user.id);
    res.status(200).json({ success: true, data: schedData });
});

// @desc  Set submission deadline (Coordinator ONLY)
// @route POST /api/projects/deadline
exports.setDeadline = asyncHandler(async (req, res, next) => {
    const myRole = await getProjectRole(req.user.id);
    const isCoordinator = myRole?.projectRole === 'coordinator';

    if (!isCoordinator) {
        return next(new ErrorResponse('Only the Project Coordinator can set deadlines', 403));
    }

    const { deadline, department, projectId } = req.body;
    if (!deadline) return next(new ErrorResponse('deadline is required', 400));

    if (projectId) {
        // Set for a specific project
        const rec = await blockchain.getRecord(k.project(projectId));
        if (!rec) return next(new ErrorResponse('Project not found', 404));
        const updated = { ...rec.data, deadline, updatedAt: new Date().toISOString() };
        await blockchain.storeRecord('project', k.project(projectId), updated, req.user.id);

        // Notify students
        for (const studentId of (rec.data.students || [])) {
            await createNotification({
                recipient: studentId,
                sender: req.user.id,
                type: 'project_deadline',
                message: `Submission deadline set for "${rec.data.title}": ${new Date(deadline).toLocaleDateString()}`,
                link: '/my-project',
            });
        }

        return res.status(200).json({ success: true, data: updated });
    }

    // Global deadline stored as a schedule record
    const id = uuidv4();
    const deadlineData = {
        id,
        type: 'global_deadline',
        deadline,
        department: department || req.user.facultyProfile?.department || '',
        setBy: req.user.id,
        createdAt: new Date().toISOString(),
    };
    await blockchain.storeRecord('projsched', k.projSched(id), deadlineData, req.user.id);
    res.status(200).json({ success: true, data: deadlineData });
});

// @desc  Get review schedules/deadlines
// @route GET /api/projects/schedule
exports.getSchedules = asyncHandler(async (req, res, next) => {
    const scheds = await getAllByPrefix('projsched_', 'projsched');
    scheds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ success: true, count: scheds.length, data: scheds });
});

// @desc  Get projects for the logged-in student
// @route GET /api/projects/my
exports.getMyProject = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'Student') {
        return next(new ErrorResponse('Only students can access this endpoint', 403));
    }
    const projects = await getAllByPrefix('proj_', 'project');
    const mine = projects.filter(p => (p.students || []).includes(req.user.id));
    const users = await getAllUsers();
    res.status(200).json({ success: true, count: mine.length, data: mine.map(p => enrichProject(p, users)) });
});

// @desc  Get projects for the logged-in guide
// @route GET /api/projects/guide
exports.getGuideProjects = asyncHandler(async (req, res, next) => {
    // A user is a guide if they are listed as guideId on any project
    const projects = await getAllByPrefix('proj_', 'project');
    const mine = projects.filter(p => p.guideId === req.user.id);
    const users = await getAllUsers();
    res.status(200).json({ success: true, count: mine.length, data: mine.map(p => enrichProject(p, users)) });
});

// @desc  Project analytics summary
// @route GET /api/projects/analytics
exports.getProjectAnalytics = asyncHandler(async (req, res, next) => {
    const projects = await getAllByPrefix('proj_', 'project');
    const myRole = await getProjectRole(req.user.id);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(req.user.role);
    const isCoordinator = myRole?.projectRole === 'coordinator';
    const isIDC = myRole?.projectRole === 'idc_member';

    if (!isHOD && !isCoordinator && !isIDC) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    const now = new Date();
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const ongoing = projects.filter(p => p.status === 'Ongoing').length;
    const pending = projects.filter(p => p.status === 'Pending').length;
    const rejected = projects.filter(p => p.status === 'Rejected').length;

    const late = projects.filter(p => {
        if (!p.deadline || p.status === 'Completed') return false;
        return new Date(p.deadline) < now;
    }).length;

    const byReviewStatus = [0, 1, 2].map(rs => ({
        review: rs,
        count: projects.filter(p => p.reviewStatus === rs).length,
    }));

    const byYear = {};
    projects.forEach(p => {
        const y = p.year || 'Unknown';
        byYear[y] = (byYear[y] || 0) + 1;
    });

    const scored = projects.filter(p => p.score);
    const avgScores = scored.length > 0 ? {
        innovation: scored.reduce((s, p) => s + (p.score.innovation || 0), 0) / scored.length,
        implementation: scored.reduce((s, p) => s + (p.score.implementation || 0), 0) / scored.length,
        documentation: scored.reduce((s, p) => s + (p.score.documentation || 0), 0) / scored.length,
        presentation: scored.reduce((s, p) => s + (p.score.presentation || 0), 0) / scored.length,
    } : null;

    res.status(200).json({
        success: true,
        data: { total, completed, ongoing, pending, rejected, late, byReviewStatus, byYear, avgScores }
    });
});

// ── Util: enrich a project with user details ──────────────────────────────────
function enrichProject(p, users) {
    const findUser = (id) => {
        if (!id) return null;
        const u = users.find(u => u.id === id);
        if (!u) return null;
        return {
            id: u.id, name: u.name, email: u.email,
            studentProfile: u.studentProfile,
            facultyProfile: u.facultyProfile,
            role: u.role,
        };
    };

    return {
        ...p,
        guide: findUser(p.guideId),
        coordinator: findUser(p.coordinatorId),
        studentDetails: (p.students || []).map(sid => findUser(sid)).filter(Boolean),
    };
}
