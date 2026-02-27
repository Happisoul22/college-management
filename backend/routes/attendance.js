const express = require('express');
const {
    markAttendance,
    getAttendance,
    getAttendanceSummary
} = require('../controllers/attendance');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getAttendance)
    .post(authorize('Faculty', 'ClassTeacher', 'HOD', 'Admin'), markAttendance);

router.get('/summary/:studentId', getAttendanceSummary);

module.exports = router;
