const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const Otp = require('../models/Otp');
const blockchain = require('../services/blockchain');
const { sendOtpEmail } = require('../utils/emailService');

// Generate a 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// @desc    Send OTP to an email before registration
// @route   POST /api/auth/send-registration-otp
// @access  Public
exports.sendRegistrationOtp = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse('Please provide an email', 400));

    // Check if email already in use
    const existing = await User.findOne({ email });
    if (existing) return next(new ErrorResponse('Email is already registered', 400));

    const otp = generateOtp();

    // Store OTP (upsert so retries always refresh)
    await Otp.findOneAndUpdate(
        { email, purpose: 'registration' },
        { otp, verified: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(email, otp, 'registration');

    res.status(200).json({ success: true, message: 'OTP sent to email' });
});

// @desc    Send OTP to verify email during profile update
// @route   POST /api/auth/send-update-otp
// @access  Private
exports.sendUpdateOtp = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next(new ErrorResponse('Please provide the new email', 400));

    // Check if email already taken by another user
    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== req.user.id) {
        return next(new ErrorResponse('Email already in use by another account', 400));
    }

    const otp = generateOtp();

    await Otp.findOneAndUpdate(
        { email, purpose: 'profile_update' },
        { otp, verified: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(email, otp, 'profile_update');

    res.status(200).json({ success: true, message: 'OTP sent to email' });
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, otp, ...rest } = req.body;

    // Verify OTP before creating the user
    const otpRecord = await Otp.findOne({ email, purpose: 'registration' });
    if (!otpRecord || otpRecord.otp !== otp) {
        return next(new ErrorResponse('Invalid or expired OTP. Please verify your email first.', 400));
    }

    // Build user object
    const userFields = {
        name,
        email,
        password,
        role
    };

    // Add role-specific fields
    if (role === 'Student') {
        userFields.studentProfile = { ...rest };
    } else if (['Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'].includes(role)) {
        userFields.facultyProfile = { ...rest };
    }

    // Create user
    const user = await User.create(userFields);

    // Cleanup the used OTP
    await Otp.deleteOne({ email, purpose: 'registration' });

    // Store registration hash on blockchain
    await blockchain.storeRecordHash('user', user._id, user);

    sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Store login event hash on blockchain
    await blockchain.storeRecordHash('login', user._id, { user: user._id, timestamp: new Date() });

    sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update logged-in user's basic profile (editable fields only)
// @route   PUT /api/auth/updateprofile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
    const { email, phone, alternativeEmail, whatsapp, otp } = req.body;

    // If changing email, verify OTP first
    if (email) {
        const currentUser = await User.findById(req.user.id);
        if (email !== currentUser.email) {
            const otpRecord = await Otp.findOne({ email, purpose: 'profile_update' });
            if (!otpRecord || otpRecord.otp !== otp) {
                return next(new ErrorResponse('Invalid or expired OTP. Please verify the new email first.', 400));
            }
            // Cleanup
            await Otp.deleteOne({ email, purpose: 'profile_update' });
        }
    }

    // Build only allowed editable fields
    const updates = {};
    if (email) updates.email = email;

    // studentProfile sub-fields
    const profileUpdates = {};
    if (phone !== undefined) profileUpdates['studentProfile.phone'] = phone;
    if (alternativeEmail !== undefined) profileUpdates['studentProfile.alternativeEmail'] = alternativeEmail;
    if (whatsapp !== undefined) profileUpdates['studentProfile.whatsapp'] = whatsapp;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { ...updates, $set: profileUpdates },
        { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        data: {}
    });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res
        .status(statusCode)
        .json({
            success: true,
            token,
            user
        });
};
