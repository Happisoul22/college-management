const express = require('express');
const {
    createAchievement,
    getAchievements,
    getAchievement,
    updateAchievement,
    deleteAchievement
} = require('../controllers/achievements');

const upload = require('../middleware/upload');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
    .route('/')
    .get(getAchievements)
    .post(authorize('Student'), upload.single('proof'), createAchievement);

router
    .route('/:id')
    .get(getAchievement)
    .put(updateAchievement)
    .delete(deleteAchievement);

module.exports = router;
