import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../components/Layout';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaFileAlt, FaCheck, FaClock, FaBan, FaUpload, FaMagic } from 'react-icons/fa';
import BlockchainBadge from '../components/BlockchainBadge';
import './Achievements.css';

/* ─── Achievement types ─────────────────────────────── */
const TYPES = [
    'Internship', 'NPTEL', 'Certification',
    'Mini Project', 'Major Project', 'Research Paper',
    'Publication', 'Patent', 'NCC/NSS', 'Placement'
];

const CLASS_YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/* NPTEL dropdowns */
const NPTEL_COURSE_TYPES = [
    'Core', 'Elective', 'MOOC', 'Value Added Course',
    'Honours / Minor Degree', 'Swayam Elective'
];
const NPTEL_DURATIONS = ['4 Weeks', '8 Weeks', '12 Weeks', '16 Weeks'];

/* Fields that are type-specific (excluded when type doesn't match) */
const INTERNSHIP_ONLY = ['startDate', 'endDate', 'weeks', 'domain'];
const NPTEL_ONLY = ['nptelCourseType', 'nptelDuration', 'score', 'instructor'];
const PROJECT_ONLY = ['workType', 'projectRole', 'contribution', 'githubLink'];

/* Project role options */
const PROJECT_ROLES = [
    'Team Lead', 'Team Member', 'Developer',
    'Designer', 'Tester', 'Analyst', 'Researcher'
];

const defaultForm = {
    type: 'Internship',
    title: '',
    description: '',
    year: 1,
    semester: 1,
    organization: '',
    // internship-specific
    startDate: '',
    endDate: '',
    weeks: '',
    domain: '',
    // NPTEL-specific
    nptelCourseType: '',
    nptelDuration: '',
    score: '',
    instructor: '',
    // project-specific
    workType: 'Individual',
    projectRole: '',
    contribution: '',
    githubLink: '',
};

const emptyMember = () => ({ name: '', rollNumber: '', role: 'Team Member' });

/* ── Row field wrapper (must be outside main component to avoid focus loss) ── */
const Field = ({ label, children, half }) => (
    <div className={`ach-field${half ? ' ach-field--half' : ''}`}>
        <label className="ach-label">{label}</label>
        {children}
    </div>
);

/* ─── Main Component ────────────────────────────────── */
const Achievements = () => {
    const { user } = useContext(AuthContext);
    const [achievements, setAchievements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(defaultForm);
    const [certFile, setCertFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState([emptyMember()]);

    useEffect(() => { fetchAchievements(); }, []);

    const fetchAchievements = async () => {
        try {
            const res = await api.get('/achievements');
            setAchievements(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const generateDescription = async () => {
        if (!formData.title.trim()) {
            toast.warn('Please enter a title first before generating a description.');
            return;
        }
        setAiLoading(true);
        try {
            const res = await api.post('/ai/describe', {
                title: formData.title,
                type: formData.type,
                organization: formData.organization,
                domain: formData.domain,
            });
            setFormData(prev => ({ ...prev, description: res.data.description }));
            toast.success('AI description generated! Review and edit as needed.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'AI generation failed. Check your API key.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            // Auto-calc weeks from startDate & endDate
            if ((name === 'startDate' || name === 'endDate') && updated.startDate && updated.endDate) {
                const diff = new Date(updated.endDate) - new Date(updated.startDate);
                if (diff > 0) updated.weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
            }
            return updated;
        });
    };

    const handleFile = (file) => {
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) {
            toast.error('Only PDF, JPG, or PNG files are allowed.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be under 5 MB.');
            return;
        }
        setCertFile(file);
    };

    const handleFileInput = (e) => handleFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();

            // Append all text fields
            Object.entries(formData).forEach(([k, v]) => {
                if (!isInternship && INTERNSHIP_ONLY.includes(k)) return;
                if (!isNPTEL && NPTEL_ONLY.includes(k)) return;
                if (!isProject && PROJECT_ONLY.includes(k)) return;
                if (v !== '' && v !== null && v !== undefined) data.append(k, v);
            });

            // Serialize teamMembers for project submissions
            if (isProject && formData.workType === 'Team') {
                data.append('teamMembers', JSON.stringify(teamMembers));
            }

            // Append certificate if chosen
            if (certFile) data.append('proof', certFile);

            await api.post('/achievements', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Achievement submitted for review!');
            setShowModal(false);
            setFormData(defaultForm);
            setCertFile(null);
            fetchAchievements();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add achievement');
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData(defaultForm);
        setCertFile(null);
        setTeamMembers([emptyMember()]);
    };

    /* ── Team member helpers ── */
    const updateMember = (index, field, value) =>
        setTeamMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));

    const addMember = () => setTeamMembers(prev => [...prev, emptyMember()]);

    const removeMember = (index) =>
        setTeamMembers(prev => prev.filter((_, i) => i !== index));

    const setTeamSize = (n) => {
        const count = Math.max(1, Math.min(20, Number(n)));
        setTeamMembers(prev => {
            if (count > prev.length)
                return [...prev, ...Array(count - prev.length).fill(null).map(emptyMember)];
            return prev.slice(0, count);
        });
    };

    const isInternship = formData.type === 'Internship';
    const isNPTEL = formData.type === 'NPTEL';
    const isProject = formData.type === 'Mini Project' || formData.type === 'Major Project';

    return (
        <Layout>
            {/* Page header */}
            <div className="ach-page-header">
                <div className="page-title" style={{ marginBottom: 0 }}>My Achievements</div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus style={{ marginRight: '7px' }} /> Add Achievement
                </button>
            </div>

            {/* ──── MODAL ──── */}
            {showModal && createPortal(
                <div className="ach-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="ach-modal">

                        {/* Modal header */}
                        <div className="ach-modal-header">
                            <h3>Add New Achievement</h3>
                            <button className="ach-close-btn" onClick={closeModal}>
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="ach-form">

                            {/* ── Type selector ── */}
                            <Field label="Achievement Type *">
                                <select name="type" value={formData.type} onChange={handleChange} className="ach-input" required>
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>

                            {/* Type banner */}
                            {(isInternship || isNPTEL) && (
                                <div className={`ach-type-banner${isNPTEL ? ' ach-type-banner--nptel' : ''}`}>
                                    {isInternship ? '📋 Internship form — fill all highlighted fields'
                                        : '🎓 NPTEL / Swayam course — fill all highlighted fields'}
                                </div>
                            )}

                            {/* ── Title ── */}
                            <Field label="Title *">
                                <input
                                    type="text" name="title" value={formData.title}
                                    onChange={handleChange} className="ach-input"
                                    placeholder={isInternship ? 'e.g. Software Development Internship at TCS' : 'Enter title'}
                                    required
                                />
                            </Field>

                            {/* ── Description with AI ── */}
                            <div className="ach-field">
                                <div className="ach-desc-label-row">
                                    <label className="ach-label">Description *</label>
                                    <button
                                        type="button"
                                        className={`ach-ai-btn${aiLoading ? ' ach-ai-btn--loading' : ''}`}
                                        onClick={generateDescription}
                                        disabled={aiLoading}
                                        title="Generate description using AI based on the title"
                                    >
                                        {aiLoading
                                            ? <><span className="ach-spinner" /> Generating…</>
                                            : <><FaMagic style={{ marginRight: 5 }} /> AI Suggest</>
                                        }
                                    </button>
                                </div>
                                <textarea
                                    name="description" value={formData.description}
                                    onChange={handleChange} className="ach-input ach-textarea"
                                    placeholder={aiLoading ? 'Generating AI description…' : 'Type here or click ✨ AI Suggest based on your title'}
                                    rows={3} required
                                />
                                {formData.description && (
                                    <div className="ach-ai-hint">✏️ Review and edit the AI-generated text as needed</div>
                                )}
                            </div>

                            {/* ── Start / End Date (internship only) ── */}
                            {isInternship && (
                                <div className="ach-row">
                                    <Field label="Start Date *" half>
                                        <input
                                            type="date" name="startDate" value={formData.startDate}
                                            onChange={handleChange} className="ach-input" required={isInternship}
                                        />
                                    </Field>
                                    <Field label="End Date *" half>
                                        <input
                                            type="date" name="endDate" value={formData.endDate}
                                            onChange={handleChange} className="ach-input" required={isInternship}
                                            min={formData.startDate}
                                        />
                                    </Field>
                                </div>
                            )}

                            {/* ── Class Year / Semester ── */}
                            <div className="ach-row">
                                <Field label="Class Year *" half>
                                    <select name="year" value={formData.year} onChange={handleChange} className="ach-input" required>
                                        {CLASS_YEARS.map(y => (
                                            <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Semester *" half>
                                    <select name="semester" value={formData.semester} onChange={handleChange} className="ach-input" required>
                                        {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* ── Organization ── */}
                            <Field label={isInternship ? 'Organization / Company *' : 'Organization / Issuer *'}>
                                <input
                                    type="text" name="organization" value={formData.organization}
                                    onChange={handleChange} className="ach-input"
                                    placeholder={isInternship ? 'e.g. Infosys, TCS, Wipro...' : 'Issuing body or institution'}
                                    required
                                />
                            </Field>

                            {/* ── Internship-only: Domain + Weeks ── */}
                            {isInternship && (
                                <div className="ach-row">
                                    <Field label="Area / Domain *" half>
                                        <input
                                            type="text" name="domain" value={formData.domain}
                                            onChange={handleChange} className="ach-input"
                                            placeholder="e.g. Web Dev, Data Science, ML..."
                                            required={isInternship}
                                        />
                                    </Field>
                                    <Field label="No. of Weeks" half>
                                        <input
                                            type="number" name="weeks" value={formData.weeks}
                                            onChange={handleChange} className="ach-input"
                                            min="1" max="104"
                                            placeholder="Auto-calculated or enter manually"
                                        />
                                    </Field>
                                </div>
                            )}

                            {/* ── NPTEL-specific fields ── */}
                            {isNPTEL && (
                                <>
                                    {/* Domain */}
                                    <Field label="Subject / Domain *">
                                        <input
                                            type="text" name="domain" value={formData.domain}
                                            onChange={handleChange} className="ach-input"
                                            placeholder="e.g. Programming in Java, Data Structures, DBMS..."
                                            required
                                        />
                                    </Field>

                                    {/* Course Type + Duration */}
                                    <div className="ach-row">
                                        <Field label="NPTEL Course Type *" half>
                                            <select name="nptelCourseType" value={formData.nptelCourseType}
                                                onChange={handleChange} className="ach-input" required>
                                                <option value="">-- Select Type --</option>
                                                {NPTEL_COURSE_TYPES.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Duration *" half>
                                            <select name="nptelDuration" value={formData.nptelDuration}
                                                onChange={handleChange} className="ach-input" required>
                                                <option value="">-- Select Duration --</option>
                                                {NPTEL_DURATIONS.map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>

                                    {/* Score + Instructor */}
                                    <div className="ach-row">
                                        <Field label="Score / Percentage *" half>
                                            <input
                                                type="number" name="score" value={formData.score}
                                                onChange={handleChange} className="ach-input"
                                                min="0" max="100" step="0.01"
                                                placeholder="e.g. 72 (out of 100)"
                                                required
                                            />
                                        </Field>
                                        <Field label="Name of Instructor" half>
                                            <input
                                                type="text" name="instructor" value={formData.instructor}
                                                onChange={handleChange} className="ach-input"
                                                placeholder="e.g. Prof. Sudarshan S Chawathe"
                                            />
                                        </Field>
                                    </div>

                                    {/* Start + End Date */}
                                    <div className="ach-row">
                                        <Field label="Course Start Date *" half>
                                            <input
                                                type="date" name="startDate" value={formData.startDate}
                                                onChange={handleChange} className="ach-input" required
                                            />
                                        </Field>
                                        <Field label="Course End Date *" half>
                                            <input
                                                type="date" name="endDate" value={formData.endDate}
                                                onChange={handleChange} className="ach-input" required
                                                min={formData.startDate}
                                            />
                                        </Field>
                                    </div>
                                </>
                            )}

                            {/* ── Project-specific fields (Mini / Major Project) ── */}
                            {isProject && (
                                <>
                                    <div className="ach-type-banner ach-type-banner--project">
                                        🔬 {formData.type} — fill in project and team details
                                    </div>

                                    {/* Work Type */}
                                    <Field label="Work Type *">
                                        <div className="ach-toggle-group">
                                            {['Individual', 'Team'].map(opt => (
                                                <button
                                                    key={opt} type="button"
                                                    className={`ach-toggle-btn${formData.workType === opt ? ' ach-toggle-btn--active' : ''}`}
                                                    onClick={() => setFormData(prev => ({ ...prev, workType: opt }))}
                                                >
                                                    {opt === 'Individual' ? '👤 Individual' : '👥 Team'}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>

                                    {/* My Role + Contribution (both Individual and Team) */}
                                    <Field label="Your Role in Project *">
                                        <select name="projectRole" value={formData.projectRole}
                                            onChange={handleChange} className="ach-input" required>
                                            <option value="">-- Select Your Role --</option>
                                            {PROJECT_ROLES.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Your Contribution *">
                                        <textarea
                                            name="contribution" value={formData.contribution}
                                            onChange={handleChange} className="ach-input ach-textarea"
                                            placeholder="Describe your specific contribution to this project..."
                                            rows={3} required
                                        />
                                    </Field>

                                    <Field label="GitHub Repository Link">
                                        <div className="ach-github-wrap">
                                            <span className="ach-github-icon">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                                </svg>
                                            </span>
                                            <input
                                                type="url" name="githubLink" value={formData.githubLink}
                                                onChange={handleChange} className="ach-input ach-github-input"
                                                placeholder="https://github.com/username/repository"
                                                pattern="https://github\.com/.+"
                                                title="Must be a valid GitHub URL (https://github.com/...)"
                                            />
                                        </div>
                                    </Field>

                                    {/* ── Team section (only if Team selected) ── */}
                                    {formData.workType === 'Team' && (
                                        <>
                                            <div className="ach-team-header">
                                                <label className="ach-label" style={{ marginBottom: 0 }}>
                                                    Team Members
                                                </label>
                                                <div className="ach-team-size-row">
                                                    <span className="ach-hint" style={{ marginRight: 8 }}>No. of members:</span>
                                                    <input
                                                        type="number"
                                                        className="ach-input ach-team-count-input"
                                                        value={teamMembers.length}
                                                        min="1" max="20"
                                                        onChange={e => setTeamSize(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {teamMembers.map((member, idx) => (
                                                <div key={idx} className="ach-member-card">
                                                    <div className="ach-member-card-header">
                                                        <span className="ach-member-number">Member {idx + 1}</span>
                                                        {teamMembers.length > 1 && (
                                                            <button type="button" className="ach-member-remove"
                                                                onClick={() => removeMember(idx)}>
                                                                <FaTimes size={11} /> Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="ach-row">
                                                        <Field label="Name *" half>
                                                            <input type="text" className="ach-input"
                                                                value={member.name} required
                                                                placeholder="Full name"
                                                                onChange={e => updateMember(idx, 'name', e.target.value)}
                                                            />
                                                        </Field>
                                                        <Field label="Roll Number *" half>
                                                            <input type="text" className="ach-input"
                                                                value={member.rollNumber} required
                                                                placeholder="e.g. 22A91A0501"
                                                                onChange={e => updateMember(idx, 'rollNumber', e.target.value)}
                                                            />
                                                        </Field>
                                                    </div>
                                                    <Field label="Role in Team">
                                                        <select className="ach-input"
                                                            value={member.role}
                                                            onChange={e => updateMember(idx, 'role', e.target.value)}>
                                                            {PROJECT_ROLES.map(r => (
                                                                <option key={r} value={r}>{r}</option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                </div>
                                            ))}

                                            <button type="button" className="ach-add-member-btn"
                                                onClick={addMember}>
                                                <FaPlus size={11} style={{ marginRight: 5 }} /> Add Another Member
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {/* ── Certificate Upload ── */}
                            <div className="ach-field">
                                <label className="ach-label">
                                    {isInternship ? 'Internship Certificate * ' : 'Certificate / Proof '}
                                    <span className="ach-hint">(PDF, JPG, PNG — max 5 MB)</span>
                                </label>

                                <div
                                    className={`ach-dropzone${dragOver ? ' ach-dropzone--active' : ''}${certFile ? ' ach-dropzone--done' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('cert-input').click()}
                                >
                                    <input
                                        id="cert-input" type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileInput}
                                        style={{ display: 'none' }}
                                    />
                                    {certFile ? (
                                        <div className="ach-file-chosen">
                                            <FaFileAlt className="ach-file-icon" />
                                            <span>{certFile.name}</span>
                                            <button type="button" className="ach-file-remove"
                                                onClick={(e) => { e.stopPropagation(); setCertFile(null); }}>
                                                <FaTimes size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="ach-dropzone-inner">
                                            <FaUpload className="ach-upload-icon" />
                                            <p>Drag &amp; drop here or <span>browse</span></p>
                                            <small>PDF, JPG or PNG</small>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Submit ── */}
                            <div className="ach-form-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <><span className="ach-spinner" /> Submitting…</> : 'Submit for Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ──── Achievement Table ──── */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Organization</th>
                                <th>Year / Sem</th>
                                <th>Certificate</th>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th>Blockchain</th>
                            </tr>
                        </thead>
                        <tbody>
                            {achievements.length > 0 ? achievements.map(ach => (
                                <tr key={ach.id}>
                                    <td>
                                        <div className="ach-title-cell">{ach.title}</div>
                                        {ach.domain && <div className="ach-sub-cell">{ach.domain}</div>}
                                    </td>
                                    <td><span className="sd-type-chip">{ach.type}</span></td>
                                    <td>{ach.organization || '—'}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        Yr {ach.year}{ach.semester ? ` / Sem ${ach.semester}` : ''}
                                    </td>
                                    <td>
                                        {ach.proofUrl ? (
                                            <a href={ach.proofUrl} target="_blank" rel="noreferrer"
                                                className="ach-proof-link">
                                                <FaFileAlt /> View
                                            </a>
                                        ) : '—'}
                                        {(ach.type === 'Mini Project' || ach.type === 'Major Project') && ach.githubLink && (
                                            <a href={ach.githubLink} target="_blank" rel="noreferrer"
                                                className="ach-proof-link ach-github-link" style={{ marginLeft: 8 }}>
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style={{ marginRight: 3, verticalAlign: 'middle' }}>
                                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                                </svg>
                                                GitHub
                                            </a>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className={`status-badge status-${ach.status}`}>
                                                {ach.status === 'Approved' && <FaCheck style={{ marginRight: 4 }} />}
                                                {ach.status === 'Rejected' && <FaBan style={{ marginRight: 4 }} />}
                                                {ach.status === 'Pending' && <FaClock style={{ marginRight: 4 }} />}
                                                {ach.status}
                                            </span>
                                            {ach.reviewer && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                    by {ach.reviewer.name}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{ach.remarks || '—'}</td>
                                    <td>
                                        <BlockchainBadge type="achievement" recordId={ach.id} compact showButton={false} />
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No achievements yet. Click <strong>"Add Achievement"</strong> to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Achievements;
