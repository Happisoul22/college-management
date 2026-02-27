const express = require('express');
const { downloadStudentReport, downloadClassReport } = require('../controllers/reports');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/student/:id', downloadStudentReport);
router.get('/class', authorize('Faculty', 'ClassTeacher', 'HOD', 'Principal'), downloadClassReport);

module.exports = router;
