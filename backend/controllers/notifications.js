const asyncHandler = require('../middleware/async');
const Notification = require('../models/Notification');

// Helper: create a notification (used internally by other controllers)
exports.createNotification = async ({ recipient, sender, type, message, link }) => {
    try {
        await Notification.create({ recipient, sender, type, message, link });
    } catch (err) {
        console.error('Notification creation failed:', err.message);
    }
};

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user.id })
        .populate('sender', 'name role')
        .sort('-createdAt')
        .limit(50);

    const unreadCount = await Notification.countDocuments({
        recipient: req.user.id,
        read: false
    });

    res.status(200).json({
        success: true,
        unreadCount,
        count: notifications.length,
        data: notifications
    });
});

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markRead = asyncHandler(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.id },
        { read: true }
    );
    res.status(200).json({ success: true });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user.id, read: false },
        { read: true }
    );
    res.status(200).json({ success: true });
});
