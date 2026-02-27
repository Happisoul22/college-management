const express = require('express');
const {
    getClassAssignments,
    getMyClassAssignment,
    getMyClassTeacher,
    assignClassTeacher,
    removeClassAssignment,
    getCounsellorAssignments,
    getMyCounsellorAssignment,
    assignCounsellor,
    removeCounsellorAssignment
} = require('../controllers/assignments');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Class Teacher assignments
router.get('/class', authorize('HOD', 'Principal', 'Admin'), getClassAssignments);
router.get('/class/my', getMyClassAssignment);
router.get('/my-class-teacher', getMyClassTeacher);
router.post('/class', authorize('HOD', 'Admin'), assignClassTeacher);
router.delete('/class/:id', authorize('HOD', 'Admin'), removeClassAssignment);

// Counsellor assignments
router.get('/counsellor', authorize('HOD', 'Principal', 'Admin'), getCounsellorAssignments);
router.get('/counsellor/my', getMyCounsellorAssignment);
router.post('/counsellor', authorize('HOD', 'Admin'), assignCounsellor);
router.delete('/counsellor/:id', authorize('HOD', 'Admin'), removeCounsellorAssignment);

module.exports = router;
