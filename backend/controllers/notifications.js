/**
 * controllers/notifications.js  –  Fully decentralised (no MongoDB)
 *
 * Notifications stored as JSON on IPFS, indexed per recipient on-chain.
 */

const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../middleware/async');
const blockchain = require('../services/blockchain');

// ── Internal helper used by other controllers ─────────────────────────────────
exports.createNotification = async ({ recipient, sender, type, message, link }) => {
    try {
        const id = uuidv4();
        const key = blockchain.keys.notification(id);
        const notifData = {
            id,
            recipient,
            sender: sender || null,
            type,
            message,
            link: link || null,
            read: false,
            createdAt: new Date().toISOString(),
        };
        await blockchain.storeRecord('notification', key, notifData, recipient);
    } catch (err) {
        console.error('Notification creation failed:', err.message);
    }
};

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
    const keys = await blockchain.getUserRecordKeys(req.user.id, 'notif_');
    const recs = await blockchain.getRecords(keys);

    let notifications = recs
        .map(r => r.data)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);

    const unreadCount = notifications.filter(n => !n.read).length;

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
    const key = blockchain.keys.notification(req.params.id);
    const rec = await blockchain.getRecord(key);
    if (!rec) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (rec.data.recipient !== req.user.id) return res.status(403).json({ success: false });

    const updated = { ...rec.data, read: true };
    await blockchain.storeRecord('notification', key, updated, req.user.id);

    res.status(200).json({ success: true });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = asyncHandler(async (req, res) => {
    const keys = await blockchain.getUserRecordKeys(req.user.id, 'notif_');
    const recs = await blockchain.getRecords(keys);

    for (const r of recs) {
        if (!r.data.read) {
            const updated = { ...r.data, read: true };
            await blockchain.storeRecord('notification', r.key, updated, req.user.id);
        }
    }

    res.status(200).json({ success: true });
});
