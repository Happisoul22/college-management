import { useState, useContext, useEffect, useRef } from 'react';
import AuthContext from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './Register.css';

const ENGINEERING_BRANCHES = [
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
];

const Register = () => {
    // Role is always Student on this form
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [captchaText, setCaptchaText] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState('');
    const canvasRef = useRef(null);

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpError, setOtpError] = useState('');
    const [sendingOtp, setSendingOtp] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [pendingSubmitData, setPendingSubmitData] = useState(null);
    const [otpCode, setOtpCode] = useState(''); // The OTP returned from backend (stored to pass to register)

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        setCaptchaText(code);
        setCaptchaInput('');
        setCaptchaError('');
    };

    useEffect(() => { generateCaptcha(); }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !captchaText) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Background
        ctx.fillStyle = '#f0f4ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Noise lines
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `hsl(${Math.random() * 360},60%,70%)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
        // Text
        ctx.font = 'bold 22px monospace';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < captchaText.length; i++) {
            ctx.save();
            ctx.fillStyle = `hsl(${Math.random() * 360},60%,30%)`;
            ctx.translate(14 + i * 22, canvas.height / 2 + (Math.random() * 6 - 3));
            ctx.rotate((Math.random() - 0.5) * 0.4);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }
        // Noise dots
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = `hsl(${Math.random() * 360},50%,60%)`;
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [captchaText]);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        alternativeEmail: '',
        password: '',
        gender: '',
        role: 'Student',
        rollNumber: '',
        phone: '',
        branch: '',
        admissionYear: new Date().getFullYear(),
        section: '',
        dob: '',
        fatherName: '',
        motherName: '',
        fatherPhone: '',
        motherPhone: '',
    });

    const { register } = useContext(AuthContext);
    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // If email changes, reset verification state
        if (e.target.name === 'email') {
            setOtpSent(false);
            setOtpVerified(false);
            setOtpInput('');
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

    const handleVerifyOtp = async () => {
        if (!otpInput || otpInput.length !== 6) { setOtpError('Enter the 6-digit OTP'); return; }
        // We don't verify separately — OTP is passed with the registration request
        // Just mark as verified here for UX flow
        setOtpCode(otpInput);
        setOtpVerified(true);
        setShowOtpModal(false);
        toast.success('Email verified! You can now complete registration.');
        // If we have pending submit data, submit now
        if (pendingSubmitData) {
            doRegister(pendingSubmitData, otpInput);
            setPendingSubmitData(null);
        }
    };

    const doRegister = async (userData, otp) => {
        try {
            setSubmitting(true);
            await register({ ...userData, otp });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmit = async e => {
        e.preventDefault();
        if (submitting) return;
        setSubmitError('');

        // Confirm password check
        if (formData.password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match.');
            return;
        }
        setConfirmPasswordError('');

        // CAPTCHA check
        if (captchaInput.trim() !== captchaText) {
            setCaptchaError('Incorrect CAPTCHA. Please try again.');
            generateCaptcha();
            return;
        }
        setCaptchaError('');

        const {
            name, email, password, gender,
            rollNumber, phone, branch, admissionYear, section, dob,
            fatherName, motherName, fatherPhone, motherPhone, alternativeEmail,
        } = formData;

        const userData = {
            name, email, password, gender,
            role: 'Student',
            rollNumber, phone, branch, admissionYear, section,
            dob: dob || undefined,
            fatherName, motherName, fatherPhone, motherPhone,
            alternativeEmail: alternativeEmail || undefined,
        };

        // If not yet verified via OTP, trigger OTP flow
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

    // Always student form

    return (
        <div className="reg-wrapper">
            {/* BG */}
            <div className="reg-bg">
                <div className="reg-blob rb1"></div>
                <div className="reg-blob rb2"></div>
            </div>

            <div className="reg-container">

                {/* Left strip */}
                <div className="reg-left">
                    <div className="reg-left-inner">
                        <div className="reg-emblem">
                            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="2" fill="none" />
                                <circle cx="40" cy="40" r="38" stroke="rgba(244,168,32,0.3)" strokeWidth="7" fill="none" />
                                <path d="M20 58 L40 16 L60 58 Z" fill="white" opacity="0.92" />
                                <rect x="28" y="44" width="24" height="4.5" fill="#e05c1a" rx="2.2" />
                                <circle cx="40" cy="30" r="6.5" fill="#f4a820" />
                                <path d="M14 62 L66 62" stroke="white" strokeWidth="1.8" />
                            </svg>
                        </div>
                        <div className="reg-college-name">SRIT</div>
                        <div className="reg-college-full">Srinivasa Ramanujan<br />Institute of Technology</div>
                        <div className="reg-college-loc">Ananthapuramu, AP</div>
                        <div className="reg-sep"></div>
                        <p className="reg-portal-lbl">Student Registration Portal</p>
                        <div className="reg-why">
                            <div className="reg-why-item">
                                <span className="reg-why-icon">🎓</span>
                                <span>Access student records</span>
                            </div>
                            <div className="reg-why-item">
                                <span className="reg-why-icon">📋</span>
                                <span>Manage achievements</span>
                            </div>
                            <div className="reg-why-item">
                                <span className="reg-why-icon">📊</span>
                                <span>Track analytics</span>
                            </div>
                            <div className="reg-why-item">
                                <span className="reg-why-icon">📅</span>
                                <span>Leave management</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right — Form */}
                <div className="reg-right">
                    <div className="reg-form-box">

                        {/* Brand */}
                        <div className="reg-brand">
                            <div className="reg-brand-icon">
                                <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
                                    <path d="M5 22L14 5l9 17Z" fill="#fff" />
                                    <circle cx="14" cy="10" r="3" fill="#f4a820" />
                                </svg>
                            </div>
                            <span>SRIT Academic Portal</span>
                        </div>

                        <div className="reg-heading">
                            <h2>Student Registration</h2>
                            <p>Create your SRIT Student Account</p>
                        </div>

                        <form onSubmit={onSubmit} className="reg-form">

                            {/* ── Section: Account Info ── */}
                            <div className="reg-section-label reg-section-label--top">
                                <span>👤</span> Account Information
                            </div>

                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Full Name <span className="req">*</span></label>
                                    <input
                                        type="text" name="name" value={formData.name} onChange={onChange}
                                        placeholder="Enter full name" required className="reg-input"
                                        id="reg-fullname"
                                    />
                                </div>
                                <div className="reg-field">
                                    <label>Gender <span className="req">*</span></label>
                                    <select name="gender" value={formData.gender} onChange={onChange} className="reg-input" required id="reg-gender">
                                        <option value="">— Select Gender —</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Email Address <span className="req">*</span></label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="email" name="email" value={formData.email} onChange={onChange}
                                            placeholder="student@srit.ac.in"
                                            required className="reg-input" id="reg-email"
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={sendingOtp || otpVerified}
                                            id="reg-send-otp-btn"
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                border: 'none', cursor: otpVerified ? 'default' : 'pointer', whiteSpace: 'nowrap',
                                                background: otpVerified ? '#22c55e' : '#1a237e', color: '#fff',
                                                opacity: sendingOtp ? 0.7 : 1
                                            }}
                                        >
                                            {sendingOtp ? '⏳ Sending...' : otpVerified ? '✓ Verified' : otpSent ? '↻ Resend OTP' : '✉ Send OTP'}
                                        </button>
                                    </div>
                                </div>
                                <div className="reg-field">
                                    <label>Alternative Email</label>
                                    <input
                                        type="email" name="alternativeEmail" value={formData.alternativeEmail} onChange={onChange}
                                        placeholder="personal@gmail.com"
                                        className="reg-input" id="reg-alt-email"
                                    />
                                </div>
                            </div>

                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Password <span className="req">*</span></label>
                                    <input
                                        type="password" name="password" value={formData.password} onChange={onChange}
                                        placeholder="Min. 6 characters" required className="reg-input"
                                        id="reg-password"
                                    />
                                </div>
                                <div className="reg-field">
                                    <label>Confirm Password <span className="req">*</span></label>
                                    <input
                                        type="password" value={confirmPassword}
                                        onChange={e => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                                        placeholder="Re-enter password" required className={`reg-input${confirmPasswordError ? ' reg-input--error' : ''}`}
                                        id="reg-confirm-password"
                                    />
                                    {confirmPasswordError && <span className="reg-field-error">{confirmPasswordError}</span>}
                                </div>
                            </div>

                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Phone Number <span className="req">*</span></label>
                                    <input
                                        type="tel" name="phone" value={formData.phone} onChange={onChange}
                                        placeholder="10-digit mobile number"
                                        required className="reg-input"
                                        id="reg-phone"
                                    />
                                </div>
                            </div>

                            {/* ── Student Academic Details ── */}
                            <>
                                {/* Academic Details */}
                                <div className="reg-section">
                                    <div className="reg-section-label">
                                        <span>🎓</span> Academic Details
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Roll Number <span className="req">*</span></label>
                                            <input
                                                type="text" name="rollNumber" value={formData.rollNumber} onChange={onChange}
                                                placeholder="e.g. 20B01A0501" required className="reg-input"
                                                id="reg-rollnumber"
                                            />
                                        </div>
                                        <div className="reg-field">
                                            <label>Branch <span className="req">*</span></label>
                                            <select
                                                name="branch" value={formData.branch} onChange={onChange}
                                                className="reg-input" required id="reg-branch"
                                            >
                                                <option value="">— Select Branch —</option>
                                                {ENGINEERING_BRANCHES.map(b => (
                                                    <option key={b.value} value={b.value}>{b.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Year of Admission <span className="req">*</span></label>
                                            <input
                                                type="number" name="admissionYear" value={formData.admissionYear}
                                                onChange={onChange} className="reg-input" required
                                                min="2000" max={new Date().getFullYear()}
                                                id="reg-admission-year"
                                            />
                                        </div>
                                        <div className="reg-field">
                                            <label>Section <span className="req">*</span></label>
                                            <select
                                                name="section" value={formData.section} onChange={onChange}
                                                className="reg-input" required id="reg-section"
                                            >
                                                <option value="">— Select Section —</option>
                                                {['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                                                    <option key={s} value={s}>Section {s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Date of Birth <span className="req">*</span></label>
                                            <input
                                                type="date" name="dob" value={formData.dob} onChange={onChange}
                                                className="reg-input" required id="reg-dob"
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Parent/Guardian Details */}
                                <div className="reg-section">
                                    <div className="reg-section-label">
                                        <span>👨‍👩‍👧</span> Parent / Guardian Details
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Father's Name <span className="req">*</span></label>
                                            <input
                                                type="text" name="fatherName" value={formData.fatherName} onChange={onChange}
                                                placeholder="Father's full name" required className="reg-input"
                                                id="reg-father-name"
                                            />
                                        </div>
                                        <div className="reg-field">
                                            <label>Father's Phone</label>
                                            <input
                                                type="tel" name="fatherPhone" value={formData.fatherPhone} onChange={onChange}
                                                placeholder="Father's mobile number"
                                                className="reg-input" id="reg-father-phone"
                                            />
                                        </div>
                                    </div>

                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Mother's Name <span className="req">*</span></label>
                                            <input
                                                type="text" name="motherName" value={formData.motherName} onChange={onChange}
                                                placeholder="Mother's full name" required className="reg-input"
                                                id="reg-mother-name"
                                            />
                                        </div>
                                        <div className="reg-field">
                                            <label>Mother's Phone</label>
                                            <input
                                                type="tel" name="motherPhone" value={formData.motherPhone} onChange={onChange}
                                                placeholder="Mother's mobile number"
                                                className="reg-input" id="reg-mother-phone"
                                            />
                                        </div>
                                    </div>

                                    <p className="reg-parent-note">
                                        ℹ️ At least one parent phone number (father or mother) is recommended for emergency contact.
                                    </p>
                                </div>
                            </>



                            {/* ── CAPTCHA ── */}
                            <div className="reg-captcha-section">
                                <label className="reg-captcha-label">CAPTCHA Verification <span className="req">*</span></label>
                                <div className="reg-captcha-row">
                                    <canvas ref={canvasRef} width={160} height={48} className="reg-captcha-canvas" />
                                    <button type="button" className="reg-captcha-refresh" onClick={generateCaptcha} title="Refresh CAPTCHA">
                                        🔄
                                    </button>
                                </div>
                                <input
                                    type="text" value={captchaInput}
                                    onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(''); }}
                                    placeholder="Enter the characters above"
                                    className={`reg-input reg-captcha-input${captchaError ? ' reg-input--error' : ''}`}
                                    id="reg-captcha" autoComplete="off"
                                />
                                {captchaError && <span className="reg-field-error">{captchaError}</span>}
                            </div>

                            {submitError && (
                                <div className="reg-error-banner">
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                    </svg>
                                    {submitError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="reg-submit-btn"
                                id="register-btn"
                                disabled={submitting}
                                style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                            >
                                {submitting ? (
                                    <>
                                        <span className="reg-spinner"></span>
                                        Registering...
                                    </>
                                ) : otpVerified ? (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8H4v2H2v2h2v2h2v-2h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        Create My Account
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
                                        A 6-digit OTP was sent to <strong>{formData.email}</strong>. Please check your inbox.
                                    </p>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpInput}
                                        onChange={e => { setOtpInput(e.target.value); setOtpError(''); }}
                                        placeholder="Enter 6-digit OTP"
                                        id="reg-otp-input"
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
                                            id="reg-otp-verify-btn"
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

                        <p className="reg-login-link">
                            Already have an account? <Link to="/login">Sign In</Link>
                        </p>

                        <div className="reg-foot">
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

export default Register;
