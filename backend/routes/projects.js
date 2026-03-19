const express = require('express');
const { protect } = require('../middleware/auth');
const {
    assignProjectRole,
    removeProjectRole,
    getProjectRoles,
    getMyProjectRole,
    createProject,
    getAllProjects,
    getProject,
    updateProject,
    addFeedback,
    submitProject,
    reviewProject,
    scoreProject,
    setReviewSchedule,
    setDeadline,
    getSchedules,
    getMyProject,
    getGuideProjects,
    getProjectAnalytics,
} = require('../controllers/projects');

const router = express.Router();
router.use(protect);

// Role management
router.get('/roles', getProjectRoles);
router.get('/roles/me', getMyProjectRole);
router.post('/roles/assign', assignProjectRole);
router.delete('/roles/:facultyId', removeProjectRole);

// Schedules & deadlines
router.get('/schedule', getSchedules);
router.post('/schedule', setReviewSchedule);
router.post('/deadline', setDeadline);

// Analytics
router.get('/analytics', getProjectAnalytics);

// Student & Guide views
router.get('/my', getMyProject);
router.get('/guide', getGuideProjects);

// Main CRUD
router.get('/', getAllProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);

// Sub-actions
router.post('/:id/feedback', addFeedback);
router.post('/:id/submit', submitProject);
router.put('/:id/review', reviewProject);
router.put('/:id/score', scoreProject);

module.exports = router;
