const express = require('express');
const { generateDescription, generateAchievementInsight } = require('../controllers/ai');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/describe', generateDescription);
router.post('/achievement-insight', generateAchievementInsight);

module.exports = router;
