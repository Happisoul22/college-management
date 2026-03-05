const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
    verifyRecord,
    getRecordInfo,
    getBlockchainStatus
} = require('../controllers/blockchain');

// All routes require authentication
router.use(protect);

router.get('/status', getBlockchainStatus);
router.get('/verify/:type/:id', verifyRecord);
router.get('/record/:type/:id', getRecordInfo);

module.exports = router;
