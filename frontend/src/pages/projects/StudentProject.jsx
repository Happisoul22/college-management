import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    FaProjectDiagram, FaChalkboardTeacher, FaGithub, FaFileAlt,
    FaCommentAlt, FaCheckCircle, FaClock, FaTimesCircle, FaBell
} from 'react-icons/fa';
import './StudentProject.css';

const STATUS_ICON = {
    Pending: <FaClock color="#f59e0b" />,
    Ongoing: <FaProjectDiagram color="#3b82f6" />,
    Completed: <FaCheckCircle color="#22c55e" />,
    Rejected: <FaTimesCircle color="#ef4444" />,
};
const STATUS_COLOR = { Pending: '#f59e0b', Ongoing: '#3b82f6', Completed: '#22c55e', Rejected: '#ef4444' };

const StudentProject = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitForm, setSubmitForm] = useState({ githubLink: '', proofUrl: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);

    useEffect(() => { fetchMyProject(); }, []);

    const fetchMyProject = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects/my');
            setProjects(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (projectId) => {
        if (!submitForm.githubLink && !submitForm.proofUrl) {
            toast.error('Please provide a GitHub link or proof URL');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/projects/${projectId}/submit`, submitForm);
            toast.success('Project submitted!');
            setShowSubmit(false);
            setSubmitForm({ githubLink: '', proofUrl: '', description: '' });
            fetchMyProject();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Layout><div className="sp-loading">Loading your project...</div></Layout>;

    if (projects.length === 0) {
        return (
            <Layout>
                <div className="sp-page">
                    <div className="sp-hero">
                        <div className="sp-hero-icon"><FaProjectDiagram /></div>
                        <div>
                            <h1 className="sp-hero-title">My Project</h1>
                            <p className="sp-hero-sub">Your project details will appear here</p>
                        </div>
                    </div>
                    <div className="sp-empty">
                        <FaProjectDiagram size={48} />
                        <h2>No Project Assigned Yet</h2>
                        <p>Your project coordinator will assign you to a project. You'll receive a notification when that happens.</p>
                    </div>
                </div>
            </Layout>
        );
    }

    const project = projects[0]; // student sees their primary project
    const isLate = project.deadline && project.status !== 'Completed' && new Date(project.deadline) < new Date();

    return (
        <Layout>
            <div className="sp-page">
                {/* Hero */}
                <div className="sp-hero">
                    <div className="sp-hero-icon"><FaProjectDiagram /></div>
                    <div style={{ flex: 1 }}>
                        <h1 className="sp-hero-title">{project.title}</h1>
                        <p className="sp-hero-sub">Track your project progress, feedback, and submission</p>
                    </div>
                    <div className="sp-status-hero" style={{ background: STATUS_COLOR[project.status] + '30', color: STATUS_COLOR[project.status] }}>
                        {STATUS_ICON[project.status]} {project.status}
                    </div>
                </div>

                {/* Late warning */}
                {isLate && (
                    <div className="sp-late-warn">
                        ⚠️ Deadline was {new Date(project.deadline).toLocaleDateString()} — your submission is overdue!
                    </div>
                )}

                <div className="sp-layout">
                    {/* Left: Project Info */}
                    <div className="sp-left">
                        {/* Guide card */}
                        <div className="card sp-guide-card">
                            <div className="card-title"><FaChalkboardTeacher /> Your Project Guide</div>
                            {project.guide ? (
                                <div className="sp-guide-info">
                                    <div className="sp-guide-avatar">{project.guide.name?.charAt(0)}</div>
                                    <div>
                                        <div className="sp-guide-name">{project.guide.name}</div>
                                        <div className="sp-guide-email">{project.guide.email}</div>
                                        {project.guide.facultyProfile?.facultyId && (
                                            <div className="sp-guide-id">ID: {project.guide.facultyProfile.facultyId}</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="sp-no-guide">No guide assigned yet.</div>
                            )}
                        </div>

                        {/* Project details */}
                        <div className="card sp-detail-card">
                            <div className="card-title">📋 Project Details</div>
                            {project.description && <p className="sp-desc">{project.description}</p>}
                            <div className="sp-meta-grid">
                                {[
                                    { label: 'Year', val: `Year ${project.year}` },
                                    { label: 'Type', val: project.type },
                                    { label: 'Batch', val: project.batch || '—' },
                                    { label: 'Review Stage', val: `Review ${project.reviewStatus}` },
                                    { label: 'Deadline', val: project.deadline ? new Date(project.deadline).toLocaleDateString() : '—' },
                                    { label: 'Submitted', val: project.submittedAt ? new Date(project.submittedAt).toLocaleDateString() : 'Not submitted' },
                                ].map(item => (
                                    <div key={item.label} className="sp-meta-item">
                                        <span className="sp-meta-label">{item.label}</span>
                                        <span className="sp-meta-val">{item.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Team members */}
                        {(project.studentDetails || []).length > 1 && (
                            <div className="card sp-team-card">
                                <div className="card-title">👥 Team Members</div>
                                {project.studentDetails.map(s => (
                                    <div key={s.id} className="sp-team-member">
                                        <div className="sp-team-avatar">{s.name?.charAt(0)}</div>
                                        <div>
                                            <div className="sp-team-name">{s.name}</div>
                                            <div className="sp-team-roll">{s.studentProfile?.rollNumber || '—'}</div>
                                        </div>
                                        {s.id === user.id && <span className="sp-you-badge">You</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Links */}
                        {(project.githubLink || project.proofUrl) && (
                            <div className="card sp-links-card">
                                <div className="card-title">🔗 Project Links</div>
                                <div className="sp-link-btns">
                                    {project.githubLink && (
                                        <a href={project.githubLink} target="_blank" rel="noreferrer" className="sp-link-btn sp-link--github">
                                            <FaGithub /> GitHub Repository
                                        </a>
                                    )}
                                    {project.proofUrl && (
                                        <a href={project.proofUrl} target="_blank" rel="noreferrer" className="sp-link-btn sp-link--proof">
                                            <FaFileAlt /> View Proof
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Submit button */}
                        {project.status !== 'Completed' && project.status !== 'Rejected' && (
                            <div className="card sp-submit-card">
                                <div className="card-title">🚀 Submit Your Project</div>
                                <button className="btn sp-submit-toggle" onClick={() => setShowSubmit(!showSubmit)}>
                                    {showSubmit ? '✕ Cancel' : '📤 Submit / Update Submission'}
                                </button>
                                {showSubmit && (
                                    <div className="sp-submit-form">
                                        <div className="form-group">
                                            <label>GitHub Repository URL</label>
                                            <input type="url" className="form-control" placeholder="https://github.com/..."
                                                value={submitForm.githubLink}
                                                onChange={e => setSubmitForm({ ...submitForm, githubLink: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Proof / Demo URL</label>
                                            <input type="url" className="form-control" placeholder="https://..."
                                                value={submitForm.proofUrl}
                                                onChange={e => setSubmitForm({ ...submitForm, proofUrl: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Project Description (optional update)</label>
                                            <textarea rows={3} className="form-control" placeholder="Brief project description..."
                                                value={submitForm.description}
                                                onChange={e => setSubmitForm({ ...submitForm, description: e.target.value })} />
                                        </div>
                                        <button className="btn btn-primary" onClick={() => handleSubmit(project.id)} disabled={submitting}>
                                            {submitting ? 'Submitting…' : '✅ Confirm Submission'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Feedback timeline */}
                    <div className="sp-right">
                        <div className="card sp-feedback-card">
                            <div className="card-title"><FaCommentAlt /> Feedback & Comments</div>
                            {(project.feedback || []).length === 0 ? (
                                <div className="sp-no-feedback">
                                    <FaBell size={28} />
                                    <p>No feedback yet. Your guide or coordinator will post comments here.</p>
                                </div>
                            ) : (
                                <div className="sp-timeline">
                                    {[...(project.feedback || [])].reverse().map(fb => (
                                        <div key={fb.id} className={`sp-timeline-item sp-timeline-item--${fb.role?.replace('_','-')}`}>
                                            <div className="sp-tl-dot" />
                                            <div className="sp-tl-content">
                                                <div className="sp-tl-header">
                                                    <strong>{fb.name}</strong>
                                                    <span className={`sp-tl-role sp-tl-role--${fb.role?.replace('_','-')}`}>
                                                        {fb.role === 'guide' ? '📚 Guide' :
                                                            fb.role === 'coordinator' ? '🎯 Coordinator' :
                                                                fb.role === 'idc_member' ? '🏅 IDC' : fb.role}
                                                    </span>
                                                    <span className="sp-tl-date">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="sp-tl-comment">{fb.comment}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* IDC Score */}
                        {project.score && (
                            <div className="card sp-score-card">
                                <div className="card-title">🏅 IDC Evaluation Score</div>
                                <div className="sp-score-total-badge">
                                    {project.score.total}/40
                                </div>
                                <div className="sp-score-breakdown">
                                    {[
                                        { key: 'innovation', label: '💡 Innovation', color: '#6366f1' },
                                        { key: 'implementation', label: '⚙️ Implementation', color: '#22c55e' },
                                        { key: 'documentation', label: '📄 Documentation', color: '#f59e0b' },
                                        { key: 'presentation', label: '🎤 Presentation', color: '#ec4899' },
                                    ].map(({ key, label, color }) => (
                                        <div key={key} className="sp-score-row">
                                            <span className="sp-score-label">{label}</span>
                                            <div className="sp-score-bar">
                                                <div className="sp-score-fill" style={{ width: `${project.score[key]*10}%`, background: color }} />
                                            </div>
                                            <span className="sp-score-num" style={{ color }}>{project.score[key]}/10</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="sp-scorer">Scored by {project.score.scorerName} on {new Date(project.score.scoredAt).toLocaleDateString()}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default StudentProject;
