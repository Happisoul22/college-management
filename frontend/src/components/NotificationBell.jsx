import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import api from '../api/axios';
import AuthContext from '../context/AuthContext';
import './NotificationBell.css';

const ICON_MAP = {
    achievement_submitted: '📝',
    achievement_approved: '✅',
    achievement_rejected: '❌',
    role_assigned: '🎓',
};

const NotificationBell = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Poll every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get('/notifications');
            setUnread(res.data.unreadCount || 0);
            setNotifications(res.data.data || []);
        } catch (err) {
            console.error('Notification fetch error:', err);
        }
    };

    const handleBellClick = async () => {
        setOpen(prev => !prev);
        if (!open) {
            setLoading(true);
            await fetchUnreadCount();
            setLoading(false);
        }
    };

    const handleNotifClick = async (notif) => {
        // Mark as read
        if (!notif.read) {
            try {
                await api.put(`/notifications/${notif._id}/read`);
                setNotifications(prev =>
                    prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
                );
                setUnread(prev => Math.max(0, prev - 1));
            } catch (err) { /* ignore */ }
        }
        setOpen(false);
        if (notif.link) navigate(notif.link);
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnread(0);
        } catch (err) { /* ignore */ }
    };

    const timeAgo = (date) => {
        const diff = (Date.now() - new Date(date)) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="nb-wrap" ref={dropdownRef}>
            <button className="nb-bell" onClick={handleBellClick} title="Notifications">
                <FaBell />
                {unread > 0 && (
                    <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>
                )}
            </button>

            {open && (
                <div className="nb-dropdown">
                    <div className="nb-header">
                        <span className="nb-title">Notifications</span>
                        {unread > 0 && (
                            <button className="nb-mark-all" onClick={handleMarkAllRead} title="Mark all as read">
                                <FaCheckDouble /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="nb-list">
                        {loading ? (
                            <div className="nb-empty">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="nb-empty">No notifications yet</div>
                        ) : (
                            notifications.slice(0, 20).map(notif => (
                                <div
                                    key={notif._id}
                                    className={`nb-item ${!notif.read ? 'nb-item--unread' : ''}`}
                                    onClick={() => handleNotifClick(notif)}
                                >
                                    <div className="nb-item-icon">
                                        {ICON_MAP[notif.type] || '🔔'}
                                    </div>
                                    <div className="nb-item-body">
                                        <div className="nb-item-msg">{notif.message}</div>
                                        <div className="nb-item-time">{timeAgo(notif.createdAt)}</div>
                                    </div>
                                    {!notif.read && <div className="nb-dot" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
