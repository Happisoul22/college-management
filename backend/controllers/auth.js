/**
 * controllers/auth.js  –  Fully decentralised (no MongoDB)
 *
 * Users are stored as JSON on IPFS.
 * The CID is indexed on-chain by userId and by keccak256(email).
 * JWT tokens embed { id, role } for stateless auth.
 * OTP is kept in a short-lived in-memory Map (no Mongo required).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const blockchain = require('../services/blockchain');
const ipfs = require('../services/ipfs');
const { sendOtpEmail } = require('../utils/emailService');

// ── In-memory OTP store (no Mongo) ───────────────────────────────────────────
// Map key: `${email}::${purpose}`  →  { otp, expiresAt }
const otpStore = new Map();
const OTP_TTL = 10 * 60 * 1000; // 10 minutes

const fs = require('fs');
const path = require('path');
const DEBUG_LOG_PATH = path.join(__dirname, '..', 'otp_debug.log');

function debugLog(msg, obj = '') {
    const text = `[${new Date().toISOString()}] ${msg} ${obj ? JSON.stringify(obj) : ''}\n`;
    fs.appendFileSync(DEBUG_LOG_PATH, text);
}

// ── Disk-persisted fallback email index ───────────────────────────────────────
// Survives backend restarts when blockchain is unavailable.
// Stored at: backend/ipfs_local_store/local_email_index.json
const LOCAL_INDEX_PATH = path.join(__dirname, '..', 'ipfs_local_store', 'local_email_index.json');

const loadLocalIndex = () => {
    try {
        if (fs.existsSync(LOCAL_INDEX_PATH)) {
            return JSON.parse(fs.readFileSync(LOCAL_INDEX_PATH, 'utf-8'));
        }
    } catch (e) { console.warn('Could not load local email index:', e.message); }
    return {};
};

const saveLocalIndex = (index) => {
    try {
        const dir = path.dirname(LOCAL_INDEX_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LOCAL_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
    } catch (e) { console.warn('Could not save local email index:', e.message); }
};

const getLocalUserId = (email) => {
    const index = loadLocalIndex();
    return index[email.toLowerCase()] || null;
};

const setLocalUserId = (email, userId, cid) => {
    const index = loadLocalIndex();
    index[email.toLowerCase()] = { userId, cid };
    saveLocalIndex(index);
};

// ── Pre-verified emails (email verified via OTP, ready to register)
const preVerifiedEmails = new Set();  // email.toLowerCase()

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOtp = (email, purpose, otp) => {
    otpStore.set(`${email}::${purpose}`, { otp, expiresAt: Date.now() + OTP_TTL });
};

const verifyOtp = (email, purpose, otp, keep = false) => {
    const key = `${email}::${purpose}`;
    const record = otpStore.get(key);
    console.log(`[AUTH VERIFY] Email: ${email}, OTP Got: ${otp}, Record:`, record);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
        console.log(`[AUTH VERIFY] Expired`);
        otpStore.delete(key);
        return false;
    }
    if (record.otp !== otp) {
        console.log(`[AUTH VERIFY] Mismatch`);
        return false;
    }
    if (!keep) {
        otpStore.delete(key);
    }
    return true;
};

const consumeOtp = (email, purpose) => {
    otpStore.delete(`${email}::${purpose}`);
};

// ── JWT helper ────────────────────────────────────────────────────────────────

const signToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

const sendTokenResponse = (userData, statusCode, res) => {
    const token = signToken(userData.id, userData.role);
    res.status(statusCode).json({ success: true, token, user: userData });
};

// ── Compute semester & year (replaces Mongoose virtuals) ─────────────────────
const computeSemesterAndYear = (admissionYear) => {
    if (!admissionYear) return { semester: 1, currentYear: 1 };
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const yearDiff = year - admissionYear;
    const semester = month >= 7 ? yearDiff * 2 + 1 : yearDiff * 2;
    let currentYear = month >= 7 ? yearDiff + 1 : yearDiff;
    currentYear = Math.min(Math.max(currentYear, 1), 4);
    return { semester: semester > 0 ? semester : 1, currentYear };
};

// ═════════════════════ ROUTE HANDLERS ═════════════════════════════════════════

// @route   POST /api/auth/send-registration-otp
exports.sendRegistrationOtp = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse('Please provide an email', 400));

    // Check email uniqueness on-chain + disk index
    const existingId = await blockchain.getUserIdByEmail(email) || getLocalUserId(email);
    if (existingId) return next(new ErrorResponse('Email is already registered', 400));

    const otp = generateOtp();
    saveOtp(email, 'registration', otp);
    
    // TEMPORARY DEBUG LOG
    console.log(`[DEBUG] OTP for ${email} is ${otp}`);

    // Make email sending non-blocking so the frontend doesn't hang
    sendOtpEmail(email, otp, 'registration').catch(err => {
        console.warn(`[EMAIL] Failed to send OTP to ${email}:`, err.message);
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
});

// @route   POST /api/auth/verify-registration-otp
// Verifies the OTP and marks the email as pre-verified for registration.
// Registration then checks this set instead of re-verifying OTP.
exports.verifyRegistrationOtp = asyncHandler(async (req, res, next) => {
    const { email, otp } = req.body;
    if (!email || !otp) return next(new ErrorResponse('Email and OTP are required', 400));

    // Keep the OTP in the store so it can be re-verified if registration fails midway
    if (!verifyOtp(email, 'registration', otp, true)) {
        return next(new ErrorResponse('Invalid or expired OTP', 400));
    }

    preVerifiedEmails.add(email.toLowerCase());
    // Auto-expire pre-verification after 30 minutes
    setTimeout(() => preVerifiedEmails.delete(email.toLowerCase()), 30 * 60 * 1000);

    res.status(200).json({ success: true, message: 'Email verified successfully' });
});

// @route   POST /api/auth/send-update-otp
exports.sendUpdateOtp = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse('Please provide the new email', 400));

    // Check if email is already taken by someone else
    const existingId = await blockchain.getUserIdByEmail(email);
    if (existingId && existingId !== req.user.id) {
        return next(new ErrorResponse('Email already in use by another account', 400));
    }

    const otp = generateOtp();
    saveOtp(email, 'profile_update', otp);
    // Make email sending non-blocking
    sendOtpEmail(email, otp, 'profile_update').catch(err => {
        console.warn(`[EMAIL] Failed to send update OTP to ${email}:`, err.message);
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
});

// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, otp, ...rest } = req.body;

    if (!name || !email || !password || !role) {
        return next(new ErrorResponse('Name, email, password, and role are required', 400));
    }

    // Check if email was pre-verified via /verify-registration-otp
    const isPreVerified = preVerifiedEmails.has(email.toLowerCase());

    // Fall back to OTP in request body (legacy / direct flow)
    if (!isPreVerified) {
        if (!otp || !verifyOtp(email, 'registration', otp, true)) {
            return next(new ErrorResponse('Invalid or expired OTP. Please verify your email first.', 400));
        }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    const now = new Date().toISOString();

    // Build the user object
    const userData = {
        id: userId,
        name,
        email,
        passwordHash,
        role,
        createdAt: now,
        updatedAt: now,
    };

    if (role === 'Student') {
        userData.studentProfile = {
            rollNumber: rest.rollNumber || '',
            phone: rest.phone || '',
            whatsapp: rest.whatsapp || '',
            branch: rest.branch || '',
            admissionYear: rest.admissionYear ? parseInt(rest.admissionYear) : null,
            section: rest.section || '',
            gender: rest.gender || '',
            dob: rest.dob || null,
            fatherName: rest.fatherName || '',
            fatherPhone: rest.fatherPhone || '',
            motherName: rest.motherName || '',
            motherPhone: rest.motherPhone || '',
            areaOfInterest: rest.areaOfInterest || '',
            cgpa: 0,
            attendance: 0,
        };
    } else {
        userData.facultyProfile = {
            facultyId: rest.facultyId || '',
            phone: rest.phone || '',
            qualification: rest.qualification || '',
            experience: rest.experience ? parseInt(rest.experience) : 0,
            pan: rest.pan || '',
            aadhaar: rest.aadhaar || '',
            dateOfJoining: rest.dateOfJoining || null,
            department: rest.department || '',
            photo: rest.photo || '',
        };
    }

    // Store on IPFS + blockchain (graceful degradation: works even without blockchain)
    const result = await blockchain.storeRecord(
        'user',
        blockchain.keys.user(userId),
        userData,
        userId
    );

    // If IPFS+blockchain both failed, registration cannot proceed reliably
    if (!result) {
        console.error('IPFS store also failed – cannot save user data');
        return next(new ErrorResponse('Storage service unavailable. Please try again.', 500));
    }

    // Always save email index to disk (survives restarts when blockchain is down)
    setLocalUserId(email, userId, result.cid);

    // Also index email on-chain (best-effort, silently skips if not connected)
    await blockchain.setEmailIndex(email, userId);

    // Successfully registered: consume the OTP and pre-verified state now
    preVerifiedEmails.delete(email.toLowerCase());
    consumeOtp(email, 'registration');

    // Return public user object (no passwordHash)
    const publicUser = buildPublicUser(userData);
    sendTokenResponse(publicUser, 200, res);
});

// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Get userId from email index on-chain (fallback: disk-persisted local index)
    let userId = await blockchain.getUserIdByEmail(email);
    if (!userId) {
        const localEntry = getLocalUserId(email);
        userId = localEntry ? (localEntry.userId || localEntry) : null;
    }
    if (!userId) return next(new ErrorResponse('Invalid credentials', 401));

    // Fetch user data from IPFS blockchain record (fallback: IPFS local store by CID)
    let userData = null;
    const rec = await blockchain.getRecord(blockchain.keys.user(userId));
    if (rec) {
        userData = rec.data;
    } else {
        // Read directly from IPFS local store using CID from disk index
        const localEntry = getLocalUserId(email);
        if (localEntry && localEntry.cid) {
            try { userData = await ipfs.fetchJSON(localEntry.cid); } catch (_) {}
        }
    }
    if (!userData) return next(new ErrorResponse('Invalid credentials', 401));

    // Check password
    const isMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!isMatch) return next(new ErrorResponse('Invalid credentials', 401));

    const publicUser = buildPublicUser(userData);
    sendTokenResponse(publicUser, 200, res);
});

// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, data: req.user });
});

// @route   PUT /api/auth/updateprofile
exports.updateProfile = asyncHandler(async (req, res, next) => {
    const { email, phone, alternativeEmail, whatsapp, otp } = req.body;

    // Fetch current user
    const rec = await blockchain.getRecord(blockchain.keys.user(req.user.id));
    if (!rec) return next(new ErrorResponse('User not found', 404));
    const userData = { ...rec.data };

    // Email change → verify OTP
    if (email && email !== userData.email) {
        // Keep OTP in case blockchain storage fails below
        if (!verifyOtp(email, 'profile_update', otp, true)) {
            return next(new ErrorResponse('Invalid or expired OTP. Please verify the new email first.', 400));
        }
        // Update email index
        await blockchain.removeEmailIndex(userData.email);
        await blockchain.setEmailIndex(email, userData.id);
        userData.email = email;
    }

    // Update student profile fields
    if (userData.studentProfile) {
        if (phone !== undefined) userData.studentProfile.phone = phone;
        if (alternativeEmail !== undefined) userData.studentProfile.alternativeEmail = alternativeEmail;
        if (whatsapp !== undefined) userData.studentProfile.whatsapp = whatsapp;
    }

    userData.updatedAt = new Date().toISOString();

    await blockchain.storeRecord('user', blockchain.keys.user(userData.id), userData, userData.id);

    // Only consume OTP after successful storage
    if (email && email !== rec.data.email) {
        consumeOtp(email, 'profile_update');
    }

    res.status(200).json({ success: true, data: buildPublicUser(userData) });
});

// @route   GET /api/auth/logout
exports.logout = asyncHandler(async (req, res, next) => {
    res.status(200).json({ success: true, data: {} });
});

// ── Util: strip password hash from user object ────────────────────────────────
const buildPublicUser = (userData) => {
    const u = { ...userData };
    delete u.passwordHash;

    // Compute virtuals for students
    if (u.role === 'Student' && u.studentProfile?.admissionYear) {
        const { semester, currentYear } = computeSemesterAndYear(u.studentProfile.admissionYear);
        u.semester = semester;
        u.currentYear = currentYear;
    }
    return u;
};

module.exports.buildPublicUser = buildPublicUser;
