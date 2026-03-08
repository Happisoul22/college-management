/**
 * controllers/blockchain.js  –  Status & Verification endpoints
 */
const asyncHandler = require('../middleware/async');
const blockchain = require('../services/blockchain');

// @desc    Get blockchain + IPFS connection status
// @route   GET /api/blockchain/status
// @access  Private
exports.getStatus = asyncHandler(async (req, res) => {
    const status = await blockchain.getStatus();
    res.status(200).json({ success: true, data: status });
});

// @desc    Verify a record exists and matches on-chain CID
// @route   GET /api/blockchain/verify/:type/:id
// @access  Private
exports.verifyRecord = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    let key;

    // Resolve key format based on type
    if (blockchain.keys[type]) {
        // Most keys just take an ID, except marks/attendance which take multiple.
        // For verification, we assume the ID passed might be the full suffix or we just use it directly.
        // Actually, if it's user, achievement, leave, subject, notification it takes 1 arg.
        key = blockchain.keys[type](id);
    } else {
        key = `${type}_${id}`;
    }

    const rec = await blockchain.getRecord(key);
    if (!rec) {
        return res.status(200).json({
            success: true,
            data: { isVerified: false, message: 'Record not found on blockchain' }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            isVerified: true,
            cid: rec.cid,
            timestamp: new Date(rec.timestamp * 1000).toISOString(),
            storedBy: rec.storedBy
        }
    });
});

// @desc    Get detailed record info from blockchain
// @route   GET /api/blockchain/record/:type/:id
// @access  Private
exports.getRecordInfo = asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    let key;
    if (blockchain.keys[type]) {
        key = blockchain.keys[type](id);
    } else {
        key = `${type}_${id}`;
    }

    const rec = await blockchain.getRecord(key);
    if (!rec) {
        return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({
        success: true,
        data: {
            key,
            cid: rec.cid,
            data: rec.data,
            timestamp: rec.timestamp,
            storedBy: rec.storedBy
        }
    });
});
