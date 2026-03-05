const mongoose = require('mongoose');

/**
 * Temporary OTP store for pending registrations and email changes.
 * Documents expire automatically after 10 minutes via MongoDB TTL.
 */
const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['registration', 'profile_update'],
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Automatically delete after 10 minutes 
    }
});

module.exports = mongoose.model('Otp', OtpSchema);
