/**
 * middleware/auth.js  –  Fully decentralised (no MongoDB)
 *
 * Validates JWT, then fetches user data from IPFS/blockchain.
 * req.user is a plain JS object (same shape as before).
 */

const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const blockchain = require('../services/blockchain');

// ── Protect routes ────────────────────────────────────────────────────────────

exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Decode JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`[AUTH] Verifying token for user: ${decoded.id}`);

        // Fetch user data from IPFS via blockchain index
        const rec = await blockchain.getRecord(blockchain.keys.user(decoded.id));

        if (!rec || !rec.data) {
            console.warn(`[AUTH] User no longer exists on chain/fallback. rec: ${!!rec}`);
            return next(new ErrorResponse('User no longer exists on chain', 401));
        }

        const userData = { ...rec.data };
        delete userData.passwordHash;

        // Compute semester/year virtuals for students
        if (userData.role === 'Student' && userData.studentProfile?.admissionYear) {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            const yearDiff = year - userData.studentProfile.admissionYear;
            const semester = month >= 7 ? yearDiff * 2 + 1 : yearDiff * 2;
            let currentYear = month >= 7 ? yearDiff + 1 : yearDiff;
            currentYear = Math.min(Math.max(currentYear, 1), 4);
            userData.semester = semester > 0 ? semester : 1;
            userData.currentYear = currentYear;
        }

        req.user = userData;
        next();
    } catch (err) {
        console.error(`[AUTH] Token verification failed:`, err.message);
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// ── Authorize roles ───────────────────────────────────────────────────────────

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};
