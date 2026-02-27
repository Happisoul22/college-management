const express = require('express');
const {
    getMarks,
    enterMarks,
    bulkEnterMarks,
    getStudentCGPA
} = require('../controllers/marks');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getMarks)
    .post(authorize('Faculty', 'ClassTeacher', 'HOD', 'Admin'), enterMarks);

router.post('/bulk', authorize('Faculty', 'ClassTeacher', 'HOD', 'Admin'), bulkEnterMarks);
router.get('/cgpa/:studentId', getStudentCGPA);

module.exports = router;
