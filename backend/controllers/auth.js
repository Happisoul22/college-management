const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, role, ...rest } = req.body;

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
    } else if (role === 'Faculty') {
        userFields.facultyProfile = { ...rest };
    }

    // Create user
    const user = await User.create(userFields);

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
    const { email, phone, alternativeEmail, whatsapp } = req.body;

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
