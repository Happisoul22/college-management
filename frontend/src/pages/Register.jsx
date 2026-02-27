import { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
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
    const [searchParams] = useSearchParams();
    // Pre-select role from query param (e.g., /register?role=Student)
    const defaultRole = searchParams.get('role') || 'Student';
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [formData, setFormData] = useState({
        // Common
        name: '',
        email: '',
        alternativeEmail: '',
        password: '',
        role: defaultRole,
        // Student specific
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
        // Faculty specific
        facultyId: '',
        department: '',
    });

    const { register } = useContext(AuthContext);
    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        if (submitting) return; // prevent double-submit
        setSubmitError('');

        const {
            name, email, password, role,
            rollNumber, phone, branch, admissionYear, section, dob,
            fatherName, motherName, fatherPhone, motherPhone, alternativeEmail,
            facultyId, department
        } = formData;

        const userData = { name, email, password, role };

        if (role === 'Student') {
            Object.assign(userData, {
                rollNumber, phone, branch, admissionYear, section,
                dob: dob || undefined,
                fatherName, motherName, fatherPhone, motherPhone,
                alternativeEmail: alternativeEmail || undefined,
            });
        }
        if (role === 'Faculty' || role === 'ClassTeacher' || role === 'HOD') {
            Object.assign(userData, { facultyId, department });
        }

        try {
            setSubmitting(true);
            await register(userData);
        } catch (err) {
            const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const isStudent = formData.role === 'Student';

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
                        <p className="reg-portal-lbl">Academic Portal — Registration</p>
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
                            <h2>Create Account</h2>
                            <p>Join the SRIT Academic Analytics System</p>
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
                                    <label>Role <span className="req">*</span></label>
                                    <select name="role" value={formData.role} onChange={onChange} className="reg-input" id="reg-role">
                                        <option value="Student">Student</option>
                                        <option value="Faculty">Faculty</option>
                                        <option value="ClassTeacher">Class Teacher</option>
                                        <option value="HOD">HOD</option>
                                        <option value="Principal">Principal</option>
                                    </select>
                                </div>
                            </div>

                            <div className="reg-row">
                                <div className="reg-field">
                                    <label>Email Address <span className="req">*</span></label>
                                    <input
                                        type="email" name="email" value={formData.email} onChange={onChange}
                                        placeholder={isStudent ? 'student@srit.ac.in' : 'faculty@srit.ac.in'}
                                        required className="reg-input" id="reg-email"
                                    />
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
                                    <label>Phone Number <span className="req">*</span></label>
                                    <input
                                        type="tel" name="phone" value={formData.phone} onChange={onChange}
                                        placeholder="10-digit mobile number"
                                        required={isStudent} className="reg-input"
                                        id="reg-phone"
                                    />
                                </div>
                            </div>

                            {/* ── Student-specific section ── */}
                            {isStudent && (
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
                            )}

                            {/* Faculty-specific */}
                            {(formData.role === 'Faculty' || formData.role === 'ClassTeacher' || formData.role === 'HOD') && (
                                <div className="reg-section">
                                    <div className="reg-section-label">
                                        <span>👨‍🏫</span> Faculty Details
                                    </div>
                                    <div className="reg-row">
                                        <div className="reg-field">
                                            <label>Faculty ID <span className="req">*</span></label>
                                            <input
                                                type="text" name="facultyId" value={formData.facultyId} onChange={onChange}
                                                placeholder="e.g. FAC001" required className="reg-input"
                                                id="reg-faculty-id"
                                            />
                                        </div>
                                        <div className="reg-field">
                                            <label>Department <span className="req">*</span></label>
                                            <select name="department" value={formData.department} onChange={onChange} className="reg-input" required id="reg-dept">
                                                <option value="">— Select Department —</option>
                                                {ENGINEERING_BRANCHES.map(b => (
                                                    <option key={b.value} value={b.value}>{b.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8H4v2H2v2h2v2h2v-2h2v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                        Create My Account
                                    </>
                                )}
                            </button>
                        </form>

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
