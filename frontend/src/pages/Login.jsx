import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useContext(AuthContext);

    const { email, password } = formData;
    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = e => {
        e.preventDefault();
        login({ email, password });
    };

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setFormData({ email: '', password: '' });
    };

    return (
        <div className="srit-login-wrapper">
            {/* Animated BG */}
            <div className="srit-bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            <div className="srit-login-container">

                {/* ====== LEFT PANEL ====== */}
                <div className="srit-left-panel">
                    <div className="srit-left-content">
                        {/* Logo */}
                        <div className="srit-emblem-wrap">
                            <svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="45" cy="45" r="43" stroke="white" strokeWidth="2" fill="none" />
                                <circle cx="45" cy="45" r="43" stroke="rgba(244,168,32,0.3)" strokeWidth="8" fill="none" />
                                <path d="M22 63 L45 18 L68 63 Z" fill="white" opacity="0.92" />
                                <rect x="32" y="49" width="26" height="5" fill="#e05c1a" rx="2.5" />
                                <circle cx="45" cy="34" r="7" fill="#f4a820" />
                                <path d="M16 67 L74 67" stroke="white" strokeWidth="2" />
                                <path d="M10 74 L80 74" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                            </svg>
                        </div>

                        <h1 className="srit-short-name">SRIT</h1>
                        <h2 className="srit-full-name">Srinivasa Ramanujan Institute<br />of Technology</h2>
                        <p className="srit-location">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            Ananthapuramu, Andhra Pradesh
                        </p>

                        <div className="srit-divider-line"></div>
                        <p className="srit-portal-label">Academic Analytics &amp; Management Portal</p>

                        {/* Stats */}
                        <div className="srit-stats-row">
                            <div className="s-stat"><span className="s-num">5000+</span><span className="s-lbl">Students</span></div>
                            <div className="s-divider"></div>
                            <div className="s-stat"><span className="s-num">200+</span><span className="s-lbl">Faculty</span></div>
                            <div className="s-divider"></div>
                            <div className="s-stat"><span className="s-num">15+</span><span className="s-lbl">Depts</span></div>
                        </div>

                        {/* Accreditation */}
                        <div className="srit-badges-row">
                            <span className="s-badge">JNTUA Affiliated</span>
                            <span className="s-badge">Autonomous</span>
                            <span className="s-badge">NAAC A+</span>
                        </div>
                    </div>
                </div>

                {/* ====== RIGHT PANEL ====== */}
                <div className="srit-right-panel">
                    <div className="srit-form-box">

                        {/* SRIT mini header on form side */}
                        <div className="srit-form-brand">
                            <div className="srit-form-brand-icon">
                                <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                                    <path d="M6 22 L15 5 L24 22 Z" fill="#e05c1a" />
                                    <circle cx="15" cy="11" r="3" fill="#f4a820" />
                                </svg>
                            </div>
                            <span className="srit-form-brand-text">SRIT Academic Portal</span>
                        </div>

                        {/* === ROLE SELECTION === */}
                        {!selectedRole && (
                            <div className="srit-role-screen">
                                <div className="srit-form-heading">
                                    <h3>Welcome Back</h3>
                                    <p>Select your role to sign in</p>
                                </div>

                                <div className="srit-role-cards">
                                    <button className="srit-role-card" onClick={() => handleRoleSelect('student')} id="role-student-btn">
                                        <div className="rc-icon rc-student">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
                                                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                                            </svg>
                                        </div>
                                        <div className="rc-text">
                                            <span className="rc-title">Student</span>
                                            <span className="rc-desc">Access records, achievements &amp; leaves</span>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="rc-arrow">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                                        </svg>
                                    </button>

                                    <button className="srit-role-card" onClick={() => handleRoleSelect('faculty')} id="role-faculty-btn">
                                        <div className="rc-icon rc-faculty">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
                                                <path d="M20 6h-1v8c0 .55-.45 1-1 1H6v1c0 1.1.9 2 2 2h10l4 4V8c0-1.1-.9-2-2-2z" />
                                                <path d="M18 4H6a2 2 0 00-2 2v10l4-4h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
                                            </svg>
                                        </div>
                                        <div className="rc-text">
                                            <span className="rc-title">Faculty / Staff</span>
                                            <span className="rc-desc">Manage students, approvals &amp; reports</span>
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="rc-arrow">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                                        </svg>
                                    </button>
                                </div>

                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>New here? Register as:</p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Link
                                            to="/register"
                                            id="student-register-link"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                                background: '#fff5f0', color: '#e05c1a', border: '1.5px solid #f4c09a',
                                                textDecoration: 'none', transition: 'all 0.2s'
                                            }}
                                        >
                                            🎓 Student
                                        </Link>
                                        <Link
                                            to="/faculty-register"
                                            id="faculty-register-link"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                                background: '#f0f4ff', color: '#3b5bdb', border: '1.5px solid #a5b4fc',
                                                textDecoration: 'none', transition: 'all 0.2s'
                                            }}
                                        >
                                            👨‍🏫 Faculty
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === LOGIN FORM === */}
                        {selectedRole && (
                            <div className="srit-login-screen">
                                <button className="srit-back-btn" onClick={() => setSelectedRole(null)} id="back-btn">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                                    Back
                                </button>

                                <div className={`srit-role-pill ${selectedRole === 'student' ? 'pill-student' : 'pill-faculty'}`}>
                                    {selectedRole === 'student' ? '🎓 Student Login' : '👨‍🏫 Faculty Login'}
                                </div>

                                <div className="srit-form-heading">
                                    <h3>{selectedRole === 'student' ? 'Student Portal' : 'Faculty Portal'}</h3>
                                    <p>Enter your SRIT credentials to continue</p>
                                </div>

                                <form onSubmit={onSubmit} className="srit-form">
                                    <div className="srit-field">
                                        <label>Email Address</label>
                                        <div className="srit-input-wrap">
                                            <span className="srit-icon">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                                            </span>
                                            <input
                                                type="email" name="email" value={email} onChange={onChange}
                                                placeholder={selectedRole === 'student' ? 'student@srit.ac.in' : 'faculty@srit.ac.in'}
                                                className="srit-inp" required id="login-email"
                                            />
                                        </div>
                                    </div>

                                    <div className="srit-field">
                                        <label>Password</label>
                                        <div className="srit-input-wrap">
                                            <span className="srit-icon">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                                            </span>
                                            <input
                                                type={showPassword ? 'text' : 'password'} name="password" value={password} onChange={onChange}
                                                placeholder="Enter your password" className="srit-inp" required id="login-password"
                                            />
                                            <button type="button" className="srit-eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                                {showPassword
                                                    ? <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z" /></svg>
                                                    : <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                                                }
                                            </button>
                                        </div>
                                    </div>

                                    <div className="srit-form-opts">
                                        <label className="srit-remember"><input type="checkbox" /><span>Remember me</span></label>
                                        <a href="#" className="srit-forgot">Forgot Password?</a>
                                    </div>

                                    <button type="submit" className={`srit-submit-btn ${selectedRole === 'student' ? 'submit-student' : 'submit-faculty'}`} id="login-submit-btn">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" /></svg>
                                        Sign In as {selectedRole === 'student' ? 'Student' : 'Faculty'}
                                    </button>
                                </form>


                                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' }}>
                                    New here?{' '}
                                    <Link
                                        to={selectedRole === 'student' ? '/register?role=Student' : '/faculty-register'}
                                        style={{ color: '#e05c1a', fontWeight: 600, textDecoration: 'none' }}
                                        id="register-link"
                                    >
                                        {selectedRole === 'student' ? 'Create Student Account' : 'Register as Faculty'}
                                    </Link>
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="srit-form-foot">
                            <p>© 2025 SRIT Ananthapuramu &nbsp;|&nbsp; <a href="https://www.srit.ac.in" target="_blank" rel="noreferrer">www.srit.ac.in</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
