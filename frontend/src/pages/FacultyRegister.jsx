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

    const [roles, setRoles] = useState({
        Faculty: true,
        HOD: false,
        ClassTeacher: false,
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

        // Clear password error when typing
        if (name === 'password' || name === 'confirmPassword') {
            setPasswordError('');
        }
    };

    const onRoleChange = e => {
        const { name, checked } = e.target;
        setRoles({ ...roles, [name]: checked });
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

        // At least one role must be selected
        const selectedRoles = Object.entries(roles).filter(([, v]) => v).map(([k]) => k);
        if (selectedRoles.length === 0) {
            setSubmitError('Please select at least one role');
            return;
        }

        // Use the highest-priority role
        let role = 'Faculty';
        if (roles.HOD) role = 'HOD';
        else if (roles.ClassTeacher) role = 'ClassTeacher';
        else role = 'Faculty';

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
        };

        try {
            setSubmitting(true);

            // If photo is provided, upload via FormData
            if (formData.photo) {
                const fd = new FormData();
                Object.entries(userData).forEach(([k, v]) => {
                    if (v !== undefined) fd.append(k, v);
                });
                fd.append('photo', formData.photo);
                await api.post('/auth/register', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await register(userData);
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
                            <p>Request access to the SRIT Academic Analytics System</p>
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
                                <div className="fr-field">
                                    <label>Email Address <span className="req">*</span></label>
                                    <input
                                        type="email" name="email" value={formData.email} onChange={onChange}
                                        placeholder="faculty@srit.ac.in" required className="fr-input"
                                        id="fr-email"
                                    />
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

                            {/* ── Section: Role Selection ── */}
                            <div className="fr-section fr-section--roles">
                                <div className="fr-section-label">
                                    <span>🎯</span> Role Selection
                                </div>
                                <p className="fr-roles-hint">Select your designated role(s). Higher roles take priority.</p>

                                <div className="fr-roles-grid">
                                    <label className={`fr-role-checkbox ${roles.Faculty ? 'fr-role-checkbox--checked' : ''}`} htmlFor="fr-role-faculty">
                                        <input
                                            type="checkbox" name="Faculty" checked={roles.Faculty}
                                            onChange={onRoleChange} id="fr-role-faculty"
                                        />
                                        <div className="fr-role-check-icon">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                            </svg>
                                        </div>
                                        <div className="fr-role-info">
                                            <span className="fr-role-name">Faculty</span>
                                            <span className="fr-role-desc">Standard teaching role</span>
                                        </div>
                                    </label>

                                    <label className={`fr-role-checkbox ${roles.HOD ? 'fr-role-checkbox--checked' : ''}`} htmlFor="fr-role-hod">
                                        <input
                                            type="checkbox" name="HOD" checked={roles.HOD}
                                            onChange={onRoleChange} id="fr-role-hod"
                                        />
                                        <div className="fr-role-check-icon">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                            </svg>
                                        </div>
                                        <div className="fr-role-info">
                                            <span className="fr-role-name">HOD</span>
                                            <span className="fr-role-desc">Head of Department</span>
                                        </div>
                                    </label>

                                    <label className={`fr-role-checkbox ${roles.ClassTeacher ? 'fr-role-checkbox--checked' : ''}`} htmlFor="fr-role-ct">
                                        <input
                                            type="checkbox" name="ClassTeacher" checked={roles.ClassTeacher}
                                            onChange={onRoleChange} id="fr-role-ct"
                                        />
                                        <div className="fr-role-check-icon">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                            </svg>
                                        </div>
                                        <div className="fr-role-info">
                                            <span className="fr-role-name">Class Teacher</span>
                                            <span className="fr-role-desc">Section in-charge</span>
                                        </div>
                                    </label>
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
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8H4v2H2v2h2v2h2v-2h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                        Register as Faculty
                                    </>
                                )}
                            </button>
                        </form>

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
