/**
 * controllers/blockchain.js
 *
 * Blockchain verification endpoints.
 * Allows verifying the integrity of marks, achievements, and attendance
 * records against their on-chain hashes.
 */
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// Models
const Marks = require('../models/Marks');
const Achievement = require('../models/Achievement');
const Attendance = require('../models/Attendance');

// Model map for dynamic lookup
const MODEL_MAP = {
    marks: Marks,
    achievement: Achievement,
    attendance: Attendance
};

// @desc    Verify a record against the blockchain
// @route   GET /api/blockchain/verify/:type/:id
// @access  Private
exports.verifyRecord = asyncHandler(async (req, res, next) => {
    const { type, id } = req.params;

    if (!MODEL_MAP[type]) {
        return next(new ErrorResponse(`Invalid record type: ${type}. Use: marks, achievement, attendance`, 400));
    }

    // Fetch the record from MongoDB
    const record = await MODEL_MAP[type].findById(id);
    if (!record) {
        return next(new ErrorResponse(`${type} record not found with id ${id}`, 404));
    }

    // Verify against blockchain
    const result = await blockchain.verifyRecordHash(type, id, record);

    res.status(200).json({
        success: true,
        data: {
            type,
            recordId: id,
            ...result
        }
    });
});

// @desc    Get blockchain record info (without verification)
// @route   GET /api/blockchain/record/:type/:id
// @access  Private
exports.getRecordInfo = asyncHandler(async (req, res, next) => {
    const { type, id } = req.params;

    const info = await blockchain.getRecordInfo(type, id);

    res.status(200).json({
        success: true,
        data: {
            type,
            recordId: id,
            ...info
        }
    });
});

// @desc    Get blockchain connection status
// @route   GET /api/blockchain/status
// @access  Private
exports.getBlockchainStatus = asyncHandler(async (req, res, next) => {
    const status = await blockchain.getStatus();

    res.status(200).json({
        success: true,
        data: status
    });
});
