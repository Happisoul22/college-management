const express = require('express');
const {
    applyLeave,
    getLeaves,
    updateLeaveStatus
} = require('../controllers/leaves');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getLeaves)
    .post(authorize('Student', 'Faculty', 'ClassTeacher'), applyLeave);

router.route('/:id')
    .put(authorize('Faculty', 'ClassTeacher', 'HOD', 'Principal'), updateLeaveStatus);

module.exports = router;
