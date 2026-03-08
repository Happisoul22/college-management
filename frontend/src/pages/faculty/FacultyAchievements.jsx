import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaFileAlt, FaCheck, FaClock, FaBan, FaUpload, FaGithub, FaExternalLinkAlt } from 'react-icons/fa';

/* ── Faculty-specific achievement types ─────────── */
const FACULTY_TYPES = [
    'Research Paper', 'Publication', 'Patent', 'Book / Book Chapter',
    'Certification', 'NPTEL / MOOC', 'FDP / Workshop', 'Conference',
    'Consultancy / Project', 'Award / Recognition', 'NCC/NSS', 'Other'
];

const TYPE_COLORS = {
    'Research Paper': '#6366f1',
    'Publication': '#0d2b5e',
    'Patent': '#f59e0b',
    'Book / Book Chapter': '#10b981',
    'Certification': '#e05c1a',
    'NPTEL / MOOC': '#f4a820',
    'FDP / Workshop': '#14b8a6',
    'Conference': '#8b5cf6',
    'Consultancy / Project': '#ec4899',
    'Award / Recognition': '#22c55e',
    'NCC/NSS': '#06b6d4',
    'Other': '#64748b',
};

const typeColor = (t) => TYPE_COLORS[t] || '#e05c1a';

const STATUS_META = {
    Approved: { icon: <FaCheck />, color: '#22c55e' },
    Pending: { icon: <FaClock />, color: '#f59e0b' },
    Rejected: { icon: <FaBan />, color: '#ef4444' },
};

const defaultForm = {
    type: 'Research Paper',
    title: '',
    description: '',
    year: new Date().getFullYear(),
    organization: '',
    startDate: '',
    endDate: '',
    githubLink: '',
};

const Field = ({ label, children }) => (
    <div className="ach-field">
        <label className="ach-label">{label}</label>
        {children}
    </div>
);

/* ── Main Component ── */
const FacultyAchievements = () => {
    const { user } = useContext(AuthContext);
    const [achievements, setAchievements] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(defaultForm);
    const [certFile, setCertFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => { fetch(); }, []);

    const fetch = async () => {
        try {
            const res = await api.get('/achievements?me=true');
            setAchievements(res.data.data);
        } catch (err) { console.error(err); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFile = (file) => {
        if (!file) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) { toast.error('Only PDF, JPG, or PNG files allowed.'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('File size must be under 5 MB.'); return; }
        setCertFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([k, v]) => {
                if (v !== '' && v !== null && v !== undefined) data.append(k, v);
            });
            // Faculty achievements don't need semester — set to 1 by default
            if (!data.get('semester')) data.append('semester', 1);
            if (certFile) data.append('proof', certFile);

            await api.post('/achievements', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Achievement submitted successfully!');
            setShowModal(false);
            setFormData(defaultForm);
            setCertFile(null);
            fetch();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit achievement');
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData(defaultForm);
        setCertFile(null);
    };

    return (
        <Layout>
            {/* Header */}
            <div className="ach-page-header">
                <div className="page-title" style={{ marginBottom: 0 }}>My Achievements</div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus style={{ marginRight: 7 }} /> Add Achievement
                </button>
            </div>

            {/* ── Modal ── */}
            {showModal && createPortal(
                <div className="ach-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="ach-modal">
                        <div className="ach-modal-header">
                            <h3>Add Achievement</h3>
                            <button className="ach-close-btn" onClick={closeModal}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="ach-form">

                            {/* Type */}
                            <Field label="Achievement Type *">
                                <select name="type" value={formData.type} onChange={handleChange} className="ach-input" required>
                                    {FACULTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>

                            {/* Title */}
                            <Field label="Title *">
                                <input type="text" name="title" value={formData.title}
                                    onChange={handleChange} className="ach-input"
                                    placeholder="e.g. Deep Learning for Medical Imaging"
                                    required />
                            </Field>

                            {/* Description */}
                            <Field label="Description *">
                                <textarea name="description" value={formData.description}
                                    onChange={handleChange} className="ach-input ach-textarea"
                                    placeholder="Brief description of this achievement..."
                                    rows={3} required />
                            </Field>

                            {/* Year + Organization */}
                            <div className="ach-row">
                                <div className="ach-field ach-field--half">
                                    <label className="ach-label">Year *</label>
                                    <input type="number" name="year" value={formData.year}
                                        onChange={handleChange} className="ach-input"
                                        min="2000" max={new Date().getFullYear() + 1} required />
                                </div>
                                <div className="ach-field ach-field--half">
                                    <label className="ach-label">Publisher / Issuer / Organization *</label>
                                    <input type="text" name="organization" value={formData.organization}
                                        onChange={handleChange} className="ach-input"
                                        placeholder="e.g. IEEE, Springer, AICTE" required />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="ach-row">
                                <div className="ach-field ach-field--half">
                                    <label className="ach-label">Start Date</label>
                                    <input type="date" name="startDate" value={formData.startDate}
                                        onChange={handleChange} className="ach-input" />
                                </div>
                                <div className="ach-field ach-field--half">
                                    <label className="ach-label">End Date</label>
                                    <input type="date" name="endDate" value={formData.endDate}
                                        onChange={handleChange} className="ach-input"
                                        min={formData.startDate} />
                                </div>
                            </div>

                            {/* GitHub Link */}
                            <Field label="GitHub / DOI / Link (optional)">
                                <div className="ach-github-wrap">
                                    <span className="ach-github-icon">
                                        <FaGithub size={14} />
                                    </span>
                                    <input type="url" name="githubLink" value={formData.githubLink}
                                        onChange={handleChange} className="ach-input ach-github-input"
                                        placeholder="https://github.com/... or https://doi.org/..." />
                                </div>
                            </Field>

                            {/* Certificate Upload */}
                            <div className="ach-field">
                                <label className="ach-label">
                                    Certificate / Proof <span className="ach-hint">(PDF, JPG, PNG — max 5 MB)</span>
                                </label>
                                <div
                                    className={`ach-dropzone${dragOver ? ' ach-dropzone--active' : ''}${certFile ? ' ach-dropzone--done' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('fa-cert-input').click()}
                                >
                                    <input id="fa-cert-input" type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFile(e.target.files[0])}
                                        style={{ display: 'none' }} />
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

                            {/* Submit */}
                            <div className="ach-form-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <><span className="ach-spinner" /> Submitting…</> : 'Submit Achievement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Achievements Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Organization</th>
                                <th>Year</th>
                                <th>Proof / Link</th>
                                <th>Status</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {achievements.length > 0 ? achievements.map(ach => (
                                <tr key={ach.id}>
                                    <td>
                                        <div className="ach-title-cell">{ach.title}</div>
                                        {ach.description && (
                                            <div className="ach-sub-cell" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ach.description}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className="sd-type-chip" style={{ background: typeColor(ach.type) + '18', color: typeColor(ach.type), borderColor: typeColor(ach.type) + '55', border: '1px solid' }}>
                                            {ach.type}
                                        </span>
                                    </td>
                                    <td>{ach.organization || '—'}</td>
                                    <td>{ach.year}</td>
                                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {ach.proofUrl ? (
                                            <a href={ach.proofUrl} target="_blank" rel="noreferrer" className="ach-proof-link">
                                                <FaFileAlt /> View
                                            </a>
                                        ) : null}
                                        {ach.githubLink ? (
                                            <a href={ach.githubLink} target="_blank" rel="noreferrer" className="ach-proof-link ach-github-link">
                                                <FaExternalLinkAlt size={11} /> Link
                                            </a>
                                        ) : null}
                                        {!ach.proofUrl && !ach.githubLink && '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className={`status-badge status-${ach.status}`}>
                                                {STATUS_META[ach.status]?.icon} {ach.status}
                                            </span>
                                            {ach.reviewer && (
                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                    by {ach.reviewer.name}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{ach.remarks || '—'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
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

export default FacultyAchievements;
