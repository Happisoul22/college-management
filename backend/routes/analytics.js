const express = require('express');
const {
    getOverallAnalytics,
    getDepartmentAnalytics,
    getDepartmentUsers,
    getFacultyProfile,
    getUserProfile
} = require('../controllers/analytics');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Students can view their own analytics
router.get('/overall', authorize('Student', 'Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'), getOverallAnalytics);

// Faculty+ endpoints
router.get('/department', authorize('Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'), getDepartmentAnalytics);
router.get('/department-users', authorize('Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'), getDepartmentUsers);

// HOD: get detailed faculty profile by ID
router.get('/faculty/:id', authorize('HOD', 'Principal', 'Admin'), getFacultyProfile);

// Get any user profile
router.get('/user/:id', authorize('Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'), getUserProfile);

module.exports = router;

