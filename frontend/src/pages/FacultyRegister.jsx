import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './FacultyRegister.css';

const DEPARTMENTS = [
    { value: 'CSE', label: 'Computer Science & Engineering (CSE)' },
    { value: 'CSE-AI', label: 'CSE – Artificial Intelligence & ML' },
    { value: 'CSE-DS', label: 'CSE – Data Science' },
    { value: 'CSE-CS', label: 'CSE – Cyber Security' },
    { value: 'ECE', label: 'Electronics & Communication Engineering (ECE)' },
    { value: 'EEE', label: 'Electrical & Electronics Engineering (EEE)' },
    { value: 'MECH', label: 'Mechanical Engineering (MECH)' },
    { value: 'CIVIL', label: 'Civil Engineering (CIVIL)' },
    { value: 'IT', label: 'Information Technology (IT)' },
    { value: 'CHEM', label: 'Chemical Engineering (CHEM)' },
    { value: 'MET', label: 'Metallurgical Engineering (MET)' },
    { value: 'MINING', label: 'Mining Engineering (MINING)' },
    { value: 'AERO', label: 'Aeronautical Engineering (AERO)' },
    { value: 'BIO-TECH', label: 'Bio Technology (BIO-TECH)' },
    { value: 'BIO-MED', label: 'Biomedical Engineering (BIO-MED)' },
    { value: 'AGR', label: 'Agricultural Engineering (AGR)' },
    { value: 'MARINE', label: 'Marine Engineering (MARINE)' },
    { value: 'PETRO', label: 'Petroleum Engineering (PETRO)' },
    { value: 'AUTO', label: 'Automobile Engineering (AUTO)' },
    { value: 'TEXTILE', label: 'Textile Technology (TEXTILE)' },
    { value: 'MBA', label: 'Master of Business Administration (MBA)' },
    { value: 'MCA', label: 'Master of Computer Applications (MCA)' },
    { value: 'S&H', label: 'Science & Humanities (S&H)' },
];

// Generate a simple math CAPTCHA
const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 15) + 1;
    const b = Math.floor(Math.random() * 15) + 1;
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const answer = op === '+' ? a + b : a - b;
    return { question: `${a} ${op} ${b}`, answer };
};

const FacultyRegister = () => {
    const navigate = useNavigate();
    const { register } = useContext(AuthContext);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [selectedRole, setSelectedRole] = useState('Faculty');

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [pendingSubmitData, setPendingSubmitData] = useState(null);
    const [otpCode, setOtpCode] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        facultyId: '',
        department: '',
        dateOfJoining: '',
        experience: '',
        photo: null,
    });


    const [captcha, setCaptcha] = useState(generateCaptcha());
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState('');

    const onChange = e => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setFormData({ ...formData, [name]: files[0] || null });
        } else {
            setFormData({ ...formData, [name]: value });
        }
        // Reset OTP if email changes
        if (name === 'email') {
            setOtpSent(false);
            setOtpVerified(false);
            setOtpInput('');
        }
        // Clear password error when typing
        if (name === 'password' || name === 'confirmPassword') {
            setPasswordError('');
        }
    };

    const handleSendOtp = async () => {
        if (!formData.email) { toast.error('Please enter your email first'); return; }
        try {
            setSendingOtp(true);
            await api.post('/auth/send-registration-otp', { email: formData.email });
            setOtpSent(true);
            setShowOtpModal(true);
            toast.success('OTP sent to your email!');
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to send OTP');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = () => {
        if (!otpInput || otpInput.length !== 6) { setOtpError('Enter the 6-digit OTP'); return; }
        setOtpCode(otpInput);
        setOtpVerified(true);
        setShowOtpModal(false);
        toast.success('Email verified! You can now complete registration.');
        if (pendingSubmitData) {
            doRegister(pendingSubmitData, otpInput);
            setPendingSubmitData(null);
        }
    };

    const doRegister = async (userData, otp) => {
        try {
            setSubmitting(true);
            if (userData._photo) {
                const fd = new FormData();
                Object.entries(userData).forEach(([k, v]) => {
                    if (v !== undefined && k !== '_photo') fd.append(k, v);
                });
                fd.append('photo', userData._photo);
                fd.append('otp', otp);
                await api.post('/auth/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await register({ ...userData, otp });
            }
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const refreshCaptcha = () => {
        setCaptcha(generateCaptcha());
        setCaptchaInput('');
        setCaptchaError('');
    };

    const onSubmit = async e => {
        e.preventDefault();
        if (submitting) return;
        setSubmitError('');
        setCaptchaError('');
        setPasswordError('');

        // Password match check
        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        // CAPTCHA check
        if (parseInt(captchaInput) !== captcha.answer) {
            setCaptchaError('Incorrect answer. Please try again.');
            refreshCaptcha();
            return;
        }

        // Use the role selected via checkboxes
        const role = selectedRole;

        const userData = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role,
            facultyId: formData.facultyId,
            department: formData.department,
            phone: formData.phone,
            dateOfJoining: formData.dateOfJoining || undefined,
            experience: formData.experience ? Number(formData.experience) : undefined,
            _photo: formData.photo || null,  // carry photo separately for FormData
        };

        // If not yet OTP-verified, trigger email verification
        if (!otpVerified) {
            setPendingSubmitData(userData);
            if (!otpSent) {
                await handleSendOtp();
            } else {
                setShowOtpModal(true);
            }
            return;
        }

        await doRegister(userData, otpCode);
    };

    return (
        <div className="fr-wrapper">
            {/* BG Blobs */}
            <div className="fr-bg">
                <div className="fr-blob fr-b1"></div>
                <div className="fr-blob fr-b2"></div>
            </div>

            <div className="fr-container">

                {/* ====== LEFT PANEL ====== */}
                <div className="fr-left">
                    <div className="fr-left-inner">
                        <div className="fr-emblem">
                            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="2" fill="none" />
                                <circle cx="40" cy="40" r="38" stroke="rgba(244,168,32,0.3)" strokeWidth="7" fill="none" />
                                <path d="M20 58 L40 16 L60 58 Z" fill="white" opacity="0.92" />
                                <rect x="28" y="44" width="24" height="4.5" fill="#e05c1a" rx="2.2" />
                                <circle cx="40" cy="30" r="6.5" fill="#f4a820" />
                                <path d="M14 62 L66 62" stroke="white" strokeWidth="1.8" />
                            </svg>
                        </div>
                        <div className="fr-college-name">SRIT</div>
                        <div className="fr-college-full">Srinivasa Ramanujan<br />Institute of Technology</div>
                        <div className="fr-college-loc">Ananthapuramu, AP</div>
                        <div className="fr-sep"></div>
                        <p className="fr-portal-lbl">Faculty Registration Portal</p>
                        <div className="fr-features">
                            <div className="fr-feat-item">
                                <span className="fr-feat-icon">👨‍🏫</span>
                                <span>Manage student approvals</span>
                            </div>
                            <div className="fr-feat-item">
                                <span className="fr-feat-icon">📊</span>
                                <span>View department analytics</span>
                            </div>
                            <div className="fr-feat-item">
                                <span className="fr-feat-icon">📋</span>
                                <span>Generate reports</span>
                            </div>
                            <div className="fr-feat-item">
                                <span className="fr-feat-icon">📅</span>
                                <span>Leave management</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ====== RIGHT PANEL — FORM ====== */}
                <div className="fr-right">
                    <div className="fr-form-box">

                        {/* Brand */}
                        <div className="fr-brand">
                            <div className="fr-brand-icon">
                                <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
                                    <path d="M5 22L14 5l9 17Z" fill="#fff" />
                                    <circle cx="14" cy="10" r="3" fill="#f4a820" />
                                </svg>
                            </div>
                            <span>SRIT Academic Portal</span>
                        </div>

                        <div className="fr-heading">
                            <h2>Faculty Registration</h2>
                            <p>Create your SRIT Faculty Account</p>
                        </div>

                        <form onSubmit={onSubmit} className="fr-form">

                            {/* ── Section: Account Information ── */}
                            <div className="fr-section-label fr-section-label--top">
                                <span>👤</span> Account Information
                            </div>

                            <div className="fr-row">
                                <div className="fr-field">
                                    <label>Full Name <span className="req">*</span></label>
                                    <input
                                        type="text" name="name" value={formData.name} onChange={onChange}
                                        placeholder="Enter full name" required className="fr-input"
                                        id="fr-name"
                                    />
                                </div>
                            </div>
                            <div className="fr-row">
                                <div className="fr-field">
                                    <label>Email Address <span className="req">*</span></label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="email" name="email" value={formData.email} onChange={onChange}
                                            placeholder="faculty@srit.ac.in" required className="fr-input"
                                            id="fr-email" style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={sendingOtp || otpVerified}
                                            id="fr-send-otp-btn"
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                border: 'none', cursor: otpVerified ? 'default' : 'pointer', whiteSpace: 'nowrap',
                                                background: otpVerified ? '#22c55e' : '#1a237e', color: '#fff',
                                                opacity: sendingOtp ? 0.7 : 1
                                            }}
                                        >
                                            {sendingOtp ? '⏳ Sending...' : otpVerified ? '✓ Verified' : otpSent ? '↻ Resend' : '✉ Send OTP'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="fr-row">
                                <div className="fr-field">
                                    <label>Password <span className="req">*</span></label>
                                    <input
                                        type="password" name="password" value={formData.password} onChange={onChange}
                                        placeholder="Min. 6 characters" required className="fr-input"
                                        id="fr-password"
                                    />
                                </div>
                                <div className="fr-field">
                                    <label>Confirm Password <span className="req">*</span></label>
                                    <input
                                        type="password" name="confirmPassword" value={formData.confirmPassword} onChange={onChange}
                                        placeholder="Re-enter password" required className="fr-input"
                                        id="fr-confirm-password"
                                    />
                                </div>
                            </div>

                            {passwordError && (
                                <div className="fr-inline-error">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                    {passwordError}
                                </div>
                            )}

                            <div className="fr-row">
                                <div className="fr-field">
                                    <label>Phone Number <span className="req">*</span></label>
                                    <input
                                        type="tel" name="phone" value={formData.phone} onChange={onChange}
                                        placeholder="10-digit mobile number" required className="fr-input"
                                        id="fr-phone" pattern="[0-9]{10}"
                                    />
                                </div>
                            </div>

                            {/* ── Section: Faculty Details ── */}
                            <div className="fr-section">
                                <div className="fr-section-label">
                                    <span>👨‍🏫</span> Faculty Details
                                </div>

                                {/* ── Role Selection ── */}
                                <div className="fr-field">
                                    <label>Role <span className="req">*</span></label>
                                    <div className="fr-role-group">
                                        {[
                                            { value: 'Faculty', label: 'Faculty', icon: '👨‍🏫', desc: 'Regular faculty member' },
                                            { value: 'HOD', label: 'HOD', icon: '🏛️', desc: 'Head of Department' },
                                        ].map(r => (
                                            <label
                                                key={r.value}
                                                className={`fr-role-card${selectedRole === r.value ? ' fr-role-card--active' : ''}`}
                                                htmlFor={`fr-role-${r.value}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    id={`fr-role-${r.value}`}
                                                    name="role"
                                                    checked={selectedRole === r.value}
                                                    onChange={() => setSelectedRole(r.value)}
                                                    className="fr-role-checkbox"
                                                />
                                                <span className="fr-role-icon">{r.icon}</span>
                                                <span className="fr-role-info">
                                                    <span className="fr-role-name">{r.label}</span>
                                                    <span className="fr-role-desc">{r.desc}</span>
                                                </span>
                                                {selectedRole === r.value && (
                                                    <span className="fr-role-check">✓</span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="fr-row">
                                    <div className="fr-field">
                                        <label>Faculty ID <span className="req">*</span></label>
                                        <input
                                            type="text" name="facultyId" value={formData.facultyId} onChange={onChange}
                                            placeholder="e.g. FAC001" required className="fr-input"
                                            id="fr-faculty-id"
                                        />
                                    </div>
                                    <div className="fr-field">
                                        <label>Branch / Department <span className="req">*</span></label>
                                        <select
                                            name="department" value={formData.department} onChange={onChange}
                                            className="fr-input" required id="fr-department"
                                        >
                                            <option value="">— Select Department —</option>
                                            {DEPARTMENTS.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="fr-row">
                                    <div className="fr-field">
                                        <label>Date of Joining <span className="req">*</span></label>
                                        <input
                                            type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={onChange}
                                            className="fr-input" required id="fr-doj"
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="fr-field">
                                        <label>Experience (years) <span className="req">*</span></label>
                                        <input
                                            type="number" name="experience" value={formData.experience} onChange={onChange}
                                            placeholder="e.g. 5" required className="fr-input"
                                            min="0" max="50" id="fr-experience"
                                        />
                                    </div>
                                </div>

                                <div className="fr-field">
                                    <label>Profile Photo <span className="fr-optional">(Optional)</span></label>
                                    <div className="fr-photo-upload">
                                        <input
                                            type="file" name="photo" onChange={onChange}
                                            accept="image/*" className="fr-file-input"
                                            id="fr-photo"
                                        />
                                        <div className="fr-photo-hint">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                                            </svg>
                                            <span>{formData.photo ? formData.photo.name : 'Choose a photo or drag & drop'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* ── Section: CAPTCHA ── */}
                            <div className="fr-captcha-section">
                                <div className="fr-section-label">
                                    <span>🔒</span> Verification
                                </div>
                                <div className="fr-captcha-box">
                                    <div className="fr-captcha-question">
                                        <span className="fr-captcha-label">Solve:</span>
                                        <span className="fr-captcha-math">{captcha.question} = ?</span>
                                        <button type="button" className="fr-captcha-refresh" onClick={refreshCaptcha} title="New question">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <input
                                        type="number" value={captchaInput}
                                        onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(''); }}
                                        placeholder="Your answer" required className="fr-input fr-captcha-input"
                                        id="fr-captcha"
                                    />
                                    {captchaError && (
                                        <div className="fr-inline-error fr-captcha-error">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                            </svg>
                                            {captchaError}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Error banner */}
                            {submitError && (
                                <div className="fr-error-banner">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                    {submitError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="fr-submit-btn"
                                id="fr-register-btn"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <span className="fr-spinner"></span>
                                        Registering...
                                    </>
                                ) : otpVerified ? (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8H4v2H2v2h2v2h2v-2h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        Register as Faculty
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                                        Verify Email & Register
                                    </>
                                )}
                            </button>
                        </form>

                        {/* OTP Modal */}
                        {showOtpModal && (
                            <div style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', zIndex: 9999
                            }}>
                                <div style={{
                                    background: '#fff', borderRadius: '16px', padding: '36px 32px', maxWidth: '380px',
                                    width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
                                    <h3 style={{ margin: '0 0 8px', color: '#1a237e', fontSize: '20px' }}>Verify Your Email</h3>
                                    <p style={{ margin: '0 0 20px', color: '#666', fontSize: '13px' }}>
                                        A 6-digit OTP was sent to <strong>{formData.email}</strong>.
                                    </p>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpInput}
                                        onChange={e => { setOtpInput(e.target.value); setOtpError(''); }}
                                        placeholder="Enter 6-digit OTP"
                                        id="fr-otp-input"
                                        style={{
                                            width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '22px',
                                            fontWeight: 700, textAlign: 'center', letterSpacing: '8px',
                                            border: `2px solid ${otpError ? '#ef4444' : '#c7d2fe'}`,
                                            outline: 'none', boxSizing: 'border-box', color: '#1a237e',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                    {otpError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0' }}>{otpError}</p>}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                        <button
                                            onClick={() => setShowOtpModal(false)}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px',
                                                border: '2px solid #e0e0e0', background: '#fff', cursor: 'pointer', color: '#666'
                                            }}
                                        >Cancel</button>
                                        <button
                                            onClick={handleVerifyOtp}
                                            id="fr-otp-verify-btn"
                                            style={{
                                                flex: 2, padding: '10px', borderRadius: '8px', fontSize: '14px',
                                                border: 'none', background: 'linear-gradient(135deg, #1a237e, #3f51b5)',
                                                color: '#fff', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >✓ Verify OTP</button>
                                    </div>
                                    <p style={{ marginTop: '14px', fontSize: '12px', color: '#999' }}>
                                        Didn't get it? <span
                                            style={{ color: '#3f51b5', cursor: 'pointer', fontWeight: 600 }}
                                            onClick={handleSendOtp}
                                        >Resend OTP</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        <p className="fr-login-link">
                            Already have an account? <Link to="/login">Sign In</Link>
                        </p>

                        <div className="fr-foot">
                            <p>© 2024 SRIT Ananthapuramu &nbsp;|&nbsp;
                                <a href="https://www.srit.ac.in" target="_blank" rel="noreferrer">www.srit.ac.in</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyRegister;
