import { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import NotificationBell from './NotificationBell';

/* Inline SVCET Logo for the header */
const SVCETHeaderLogo = () => (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <circle cx="18" cy="18" r="17" stroke="#f4a820" strokeWidth="1.5" fill="none" />
        <path d="M9 25 L18 7 L27 25 Z" fill="white" opacity="0.9" />
        <rect x="13" y="19" width="10" height="2" fill="#0d2b5e" rx="1" />
        <circle cx="18" cy="13" r="3" fill="#f4a820" />
        <path d="M6 27 L30 27" stroke="white" strokeWidth="1.2" />
    </svg>
);

/* ── Profile Edit Drawer ── */
const ProfileDrawer = ({ user, onClose, onSaved }) => {
    const [form, setForm] = useState({
        email: user?.email || '',
        phone: user?.studentProfile?.phone || '',
        alternativeEmail: user?.studentProfile?.alternativeEmail || '',
        whatsapp: user?.studentProfile?.whatsapp || '',
    });
    const [saving, setSaving] = useState(false);

    const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put('/auth/updateprofile', form);
            toast.success('Profile updated successfully!');
            onSaved(res.data.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Update failed');
        } finally {
            setSaving(false);
        }
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    return (
        <>
            {/* Backdrop */}
            <div className="pd-backdrop" onClick={onClose} />

            {/* Drawer */}
            <div className="pd-drawer">
                <div className="pd-header">
                    <h3>Edit Profile</h3>
                    <button className="pd-close-btn" onClick={onClose} title="Close">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* Avatar + name display */}
                <div className="pd-avatar-section">
                    <div className="pd-avatar">{initials}</div>
                    <div>
                        <div className="pd-fullname">{user?.name}</div>
                        <div className="pd-meta">
                            {user?.studentProfile?.rollNumber && (
                                <span className="pd-chip">{user.studentProfile.rollNumber}</span>
                            )}
                            <span className="pd-chip pd-chip--role">{user?.role}</span>
                        </div>
                    </div>
                </div>

                {/* Read-only academic info */}
                {user?.role === 'Student' && (
                    <div className="pd-readonly-section">
                        <div className="pd-readonly-label">Academic Info (read-only)</div>
                        <div className="pd-readonly-grid">
                            <div className="pd-readonly-item">
                                <span className="pd-readonly-key">Branch</span>
                                <span className="pd-readonly-val">{user?.studentProfile?.branch || '—'}</span>
                            </div>
                            <div className="pd-readonly-item">
                                <span className="pd-readonly-key">Section</span>
                                <span className="pd-readonly-val">{user?.studentProfile?.section || '—'}</span>
                            </div>
                            <div className="pd-readonly-item">
                                <span className="pd-readonly-key">Semester</span>
                                <span className="pd-readonly-val">{user?.semester || '—'}</span>
                            </div>
                            <div className="pd-readonly-item">
                                <span className="pd-readonly-key">CGPA</span>
                                <span className="pd-readonly-val">{user?.studentProfile?.cgpa || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editable form */}
                <form onSubmit={onSubmit} className="pd-form">
                    <div className="pd-section-label">Contact Details</div>

                    <div className="pd-field">
                        <label>Email Address</label>
                        <input
                            type="email" name="email" value={form.email}
                            onChange={onChange} className="pd-input"
                            placeholder="your@email.com" required
                        />
                    </div>

                    <div className="pd-field">
                        <label>Alternative Email</label>
                        <input
                            type="email" name="alternativeEmail" value={form.alternativeEmail}
                            onChange={onChange} className="pd-input"
                            placeholder="personal@gmail.com (optional)"
                        />
                    </div>

                    <div className="pd-field">
                        <label>Phone Number</label>
                        <input
                            type="tel" name="phone" value={form.phone}
                            onChange={onChange} className="pd-input"
                            placeholder="10-digit mobile number"
                        />
                    </div>

                    <div className="pd-field">
                        <label>WhatsApp Number</label>
                        <input
                            type="tel" name="whatsapp" value={form.whatsapp}
                            onChange={onChange} className="pd-input"
                            placeholder="WhatsApp (if different)"
                        />
                    </div>

                    <div className="pd-form-actions">
                        <button type="button" className="pd-cancel-btn" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="pd-save-btn" disabled={saving}>
                            {saving ? (
                                <><span className="pd-spinner" /> Saving…</>
                            ) : (
                                <><svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                                    <path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z" />
                                </svg> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

/* ── Main Layout ── */
const Layout = ({ children }) => {
    const { user, setUser } = useContext(AuthContext);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '?';

    const handleSaved = (updatedUser) => {
        if (setUser) setUser(updatedUser);
    };

    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                {/* ---- Top Header ---- */}
                <header className="top-header">
                    <div className="header-left">
                        <SVCETHeaderLogo />
                        <div>
                            <h3>Welcome, <span>{user?.name}</span></h3>
                        </div>
                        <span className="header-srit-badge">SVCET Portal</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Notification Bell */}
                        <NotificationBell />
                        <div
                            className="user-profile user-profile--clickable"
                            onClick={() => setDrawerOpen(true)}
                            title="Click to edit profile"
                        >
                            <span className="user-role-badge">{user?.role}</span>
                            <div className="user-avatar">{initials}</div>
                            <span className="user-name-label">{user?.name?.split(' ')[0]}</span>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"
                                style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                            </svg>
                        </div>
                    </div>
                </header>

                {/* Profile edit drawer */}
                {drawerOpen && (
                    <ProfileDrawer
                        user={user}
                        onClose={() => setDrawerOpen(false)}
                        onSaved={handleSaved}
                    />
                )}

                {/* ---- Page Content ---- */}
                <main className="dashboard-container">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
