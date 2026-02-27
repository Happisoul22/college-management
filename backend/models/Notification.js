const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'achievement_submitted',   // student submits → notify faculty
            'achievement_approved',    // faculty approves → notify student
            'achievement_rejected',    // faculty rejects  → notify student
            'role_assigned',           // HOD assigns role → notify faculty
        ],
        required: true
    },
    message: { type: String, required: true },
    link: { type: String },          // frontend URL to navigate to on click
    read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// Auto-expire notifications older than 60 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
