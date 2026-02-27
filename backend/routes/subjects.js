const express = require('express');
const {
    getSubjects,
    getMySubjects,
    getSubject,
    createSubject,
    updateSubject,
    deleteSubject,
    assignSubjectToFaculty,
    unassignSubject
} = require('../controllers/subjects');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// My subjects (for logged-in faculty)
router.get('/my', getMySubjects);

router.route('/')
    .get(getSubjects)
    .post(authorize('HOD', 'Admin'), createSubject);

router.route('/:id')
    .get(getSubject)
    .put(authorize('HOD', 'Admin'), updateSubject)
    .delete(authorize('HOD', 'Admin'), deleteSubject);

// Faculty assignment routes
router.put('/:id/assign', authorize('HOD', 'Admin'), assignSubjectToFaculty);
router.put('/:id/unassign', authorize('HOD', 'Admin'), unassignSubject);

module.exports = router;
