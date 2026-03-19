const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { ENCRYPTION_ENABLED } = require('../services/crypto');

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

// Encryption status (public to authenticated users)
router.get('/encryption-status', (req, res) => {
    res.json({
        success: true,
        data: {
            enabled: ENCRYPTION_ENABLED,
            algorithm: ENCRYPTION_ENABLED ? 'AES-256-GCM' : null,
            keyConfigured: !!(process.env.IPFS_ENCRYPTION_KEY),
            message: ENCRYPTION_ENABLED
                ? '🔒 Data is encrypted at rest using AES-256-GCM'
                : '🔓 Encryption is not enabled (IPFS_ENCRYPTION_KEY not set)',
        }
    });
});

module.exports = router;
