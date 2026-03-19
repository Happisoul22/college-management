import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    FaChalkboardTeacher, FaUsers, FaCheck, FaTimes, FaClock,
    FaGithub, FaFileAlt, FaCommentAlt, FaChartPie, FaSearch, FaBook
} from 'react-icons/fa';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './GuideProjects.css';

const STATUS_COLORS = { Pending: '#f59e0b', Ongoing: '#3b82f6', Completed: '#22c55e', Rejected: '#ef4444' };
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

const GuideProjects = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [activeTab, setActiveTab] = useState('list');
    const [feedbackText, setFeedbackText] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [reviewStatus, setReviewStatus] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects/guide');
            setProjects(res.data.data || []);
        } catch (err) {
            // Fallback: get all and filter by me
            try {
                const res = await api.get('/projects');
                setProjects((res.data.data || []).filter(p => p.guideId === user.id));
            } catch (_) {
                toast.error('Failed to load projects');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFeedback = async (projectId) => {
        if (!feedbackText.trim()) return;
        try {
            await api.post(`/projects/${projectId}/feedback`, { comment: feedbackText });
            toast.success('Feedback sent!');
            setFeedbackText('');
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send feedback');
        }
    };

    const handleReview = async (projectId, action) => {
        try {
            await api.put(`/projects/${projectId}/review`, {
                action,
                reviewStatus: Number(reviewStatus),
                comment: reviewComment,
            });
            toast.success(`Project ${action}d!`);
            setReviewComment('');
            fetchProjects();
            setSelected(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update review');
        }
    };

    const filtered = projects.filter(p => {
        const matchStatus = !filterStatus || p.status === filterStatus;
        const term = searchTerm.toLowerCase();
        const matchSearch = !term || p.title?.toLowerCase().includes(term) ||
            p.studentDetails?.some(s => s.name?.toLowerCase().includes(term));
        return matchStatus && matchSearch;
    });

    // Analytics
    const statusMap = {};
    projects.forEach(p => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });
    const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    const total = projects.length;
    const ongoing = projects.filter(p => p.status === 'Ongoing').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const pending = projects.filter(p => p.status === 'Pending').length;

    if (loading) return <Layout><div className="gp-loading">Loading Guide Projects...</div></Layout>;

    return (
        <Layout>
            <div className="gp-page">
                {/* Hero */}
                <div className="gp-hero">
                    <div className="gp-hero-icon"><FaChalkboardTeacher /></div>
                    <div>
                        <h1 className="gp-hero-title">My Guide Projects</h1>
                        <p className="gp-hero-sub">Review, guide and provide feedback to your assigned student projects</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="gp-stats-row">
                    {[
                        { label: 'Total', val: total, color: '#6366f1' },
                        { label: 'Ongoing', val: ongoing, color: '#3b82f6' },
                        { label: 'Completed', val: completed, color: '#22c55e' },
                        { label: 'Pending', val: pending, color: '#f59e0b' },
                    ].map(s => (
                        <div key={s.label} className="gp-stat-card" style={{ borderTopColor: s.color }}>
                            <div className="gp-stat-val" style={{ color: s.color }}>{s.val}</div>
                            <div className="gp-stat-lbl">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="gp-tabs">
                    {[{id:'list',label:'📁 Projects'},{id:'analytics',label:'📊 Analytics'}].map(t => (
                        <button key={t.id} className={`gp-tab ${activeTab===t.id?'gp-tab--active':''}`} onClick={() => setActiveTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Projects List tab ── */}
                {activeTab === 'list' && (
                    <div className="gp-panel">
                        {/* Filters */}
                        <div className="gp-filter-bar">
                            <div className="gp-search">
                                <FaSearch style={{ color: '#94a3b8' }} />
                                <input type="text" placeholder="Search by project or student..."
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="gp-search-input" />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control gp-filter-sel">
                                <option value="">All Statuses</option>
                                {['Pending','Ongoing','Completed','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="gp-empty">
                                <FaChalkboardTeacher size={40} />
                                <p>No projects assigned yet. The coordinator will assign students to you.</p>
                            </div>
                        ) : (
                            <div className="gp-list">
                                {filtered.map(p => (
                                    <div key={p.id} className={`gp-proj-card ${selected?.id === p.id ? 'gp-proj-card--open' : ''}`}>
                                        {/* Card Header */}
                                        <div className="gp-proj-header" onClick={() => setSelected(selected?.id === p.id ? null : p)}>
                                            <div className="gp-proj-info">
                                                <div className="gp-proj-name">{p.title}</div>
                                                <div className="gp-proj-meta2">
                                                    <span>Year {p.year}</span>
                                                    <span>Rev {p.reviewStatus}</span>
                                                    <span>{p.type}</span>
                                                    <span>Batch: {p.batch || '—'}</span>
                                                </div>
                                            </div>
                                            <div className="gp-proj-right">
                                                <span className="gp-status-badge" style={{ background: STATUS_COLORS[p.status]+'20', color: STATUS_COLORS[p.status] }}>
                                                    {p.status}
                                                </span>
                                                <FaUsers className="gp-users-icon" />
                                                <span className="gp-student-count">{p.studentDetails?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Students */}
                                        <div className="gp-students-row">
                                            {(p.studentDetails || []).map(s => (
                                                <span key={s.id} className="gp-student-chip">
                                                    {s.name} ({s.studentProfile?.rollNumber || '—'})
                                                </span>
                                            ))}
                                        </div>

                                        {/* Expanded detail */}
                                        {selected?.id === p.id && (
                                            <div className="gp-detail">
                                                {/* Description */}
                                                {p.description && <p className="gp-desc">{p.description}</p>}

                                                {/* Links */}
                                                <div className="gp-links">
                                                    {p.githubLink && (
                                                        <a href={p.githubLink} target="_blank" rel="noreferrer" className="gp-link-btn gp-link--github">
                                                            <FaGithub /> GitHub Repo
                                                        </a>
                                                    )}
                                                    {p.proofUrl && (
                                                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="gp-link-btn gp-link--proof">
                                                            <FaFileAlt /> View Proof
                                                        </a>
                                                    )}
                                                </div>

                                                {/* Research papers */}
                                                {(p.researchPapers || []).length > 0 && (
                                                    <div className="gp-papers">
                                                        <div className="gp-section-title"><FaBook /> Related Research Papers</div>
                                                        {p.researchPapers.map((rp, i) => (
                                                            <a key={i} href={rp} target="_blank" rel="noreferrer" className="gp-paper-link">{rp}</a>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Review Controls */}
                                                {p.status !== 'Completed' && p.status !== 'Rejected' && (
                                                    <div className="gp-review-box">
                                                        <div className="gp-section-title">✅ Review Submission</div>
                                                        <div className="gp-review-row">
                                                            <select
                                                                value={reviewStatus}
                                                                onChange={e => setReviewStatus(Number(e.target.value))}
                                                                className="form-control gp-rev-sel"
                                                            >
                                                                <option value={0}>Review 0</option>
                                                                <option value={1}>Review 1</option>
                                                                <option value={2}>Review 2</option>
                                                            </select>
                                                        </div>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Review comment (optional)..."
                                                            value={reviewComment}
                                                            onChange={e => setReviewComment(e.target.value)}
                                                            className="form-control gp-review-ta"
                                                        />
                                                        <div className="gp-review-actions">
                                                            <button className="btn gp-approve-btn" onClick={() => handleReview(p.id, 'approve')}>
                                                                <FaCheck /> Approve & Complete
                                                            </button>
                                                            <button className="btn gp-reject-btn" onClick={() => handleReview(p.id, 'reject')}>
                                                                <FaTimes /> Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Feedback section */}
                                                <div className="gp-feedback-box">
                                                    <div className="gp-section-title"><FaCommentAlt /> Feedback & Comments</div>
                                                    {(p.feedback || []).length === 0 ? (
                                                        <p className="gp-no-feedback">No feedback yet.</p>
                                                    ) : (
                                                        (p.feedback || []).map(fb => (
                                                            <div key={fb.id} className="gp-fb-item">
                                                                <div className="gp-fb-meta">
                                                                    <strong>{fb.name}</strong>
                                                                    <span className={`gp-fb-role gp-fb-role--${fb.role?.replace('_','-')}`}>{fb.role?.replace('_',' ')}</span>
                                                                    <span className="gp-fb-date">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="gp-fb-txt">{fb.comment}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                    <div className="gp-fb-add">
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Add your feedback or comment..."
                                                            value={feedbackText}
                                                            onChange={e => setFeedbackText(e.target.value)}
                                                            className="form-control"
                                                        />
                                                        <button className="btn btn-primary" onClick={() => handleFeedback(p.id)}>
                                                            <FaCommentAlt /> Send Feedback
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Score (if scored by IDC) */}
                                                {p.score && (
                                                    <div className="gp-score-box">
                                                        <div className="gp-section-title">🏅 IDC Score</div>
                                                        <div className="gp-score-items">
                                                            {['innovation','implementation','documentation','presentation'].map(k => (
                                                                <div key={k} className="gp-score-item">
                                                                    <span>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                                                                    <span className="gp-score-val">{p.score[k]}/10</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="gp-score-total">Total: {p.score.total}/40 — by {p.score.scorerName}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Analytics tab ── */}
                {activeTab === 'analytics' && (
                    <div className="gp-panel">
                        {pieData.length === 0 ? (
                            <div className="gp-empty"><FaChartPie size={40} /><p>No data to show.</p></div>
                        ) : (
                            <div className="card gp-chart-card">
                                <div className="card-title">My Projects Status</div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend iconType="circle" iconSize={10} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default GuideProjects;
