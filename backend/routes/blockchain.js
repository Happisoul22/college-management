const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
    verifyRecord,
    getRecordInfo,
    getStatus
} = require('../controllers/blockchain');

// All routes require authentication
router.use(protect);

router.get('/status', getStatus);
router.get('/verify/:type/:id', verifyRecord);
router.get('/record/:type/:id', getRecordInfo);

module.exports = router;
