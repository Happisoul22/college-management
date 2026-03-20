import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    FaMedal, FaStar, FaChartBar, FaSearch, FaFilter
} from 'react-icons/fa';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import './IDCReview.css';

const SCORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'];

const IDCReview = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [scoreForm, setScoreForm] = useState({ innovation: 5, implementation: 5, documentation: 5, presentation: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('projects');
    const [searchTerm, setSearchTerm] = useState('');
    const [analyticsProjectId, setAnalyticsProjectId] = useState('all');

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            // IDC sees only year 4, already filtered by backend
            const res = await api.get('/projects?year=4');
            setProjects(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleScore = async (e) => {
        e.preventDefault();
        if (!selected) return;
        setSubmitting(true);
        try {
            await api.put(`/projects/${selected.id}/score`, scoreForm);
            toast.success('Score submitted!');
            setScoreForm({ innovation: 5, implementation: 5, documentation: 5, presentation: 5, comment: '' });
            setSelected(null);
            fetchProjects();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to submit score');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = projects.filter(p => {
        const term = searchTerm.toLowerCase();
        return !term || p.title?.toLowerCase().includes(term) ||
            p.studentDetails?.some(s => s.name?.toLowerCase().includes(term));
    });

    // Analytics
    const scored = projects.filter(p => p.score);
    
    let chartData = [];
    let chartTitle = '';

    if (scored.length > 0) {
        if (analyticsProjectId === 'all') {
            chartTitle = `Average Scores Across ${scored.length} Projects`;
            chartData = [
                { name: 'Innovation', score: (scored.reduce((s, p) => s + p.score.innovation, 0) / scored.length).toFixed(1) },
                { name: 'Implementation', score: (scored.reduce((s, p) => s + p.score.implementation, 0) / scored.length).toFixed(1) },
                { name: 'Documentation', score: (scored.reduce((s, p) => s + p.score.documentation, 0) / scored.length).toFixed(1) },
                { name: 'Presentation', score: (scored.reduce((s, p) => s + p.score.presentation, 0) / scored.length).toFixed(1) },
            ];
        } else {
            const sp = scored.find(p => p.id === analyticsProjectId);
            if (sp) {
                chartTitle = `Scores for: ${sp.title}`;
                chartData = [
                    { name: 'Innovation', score: sp.score.innovation },
                    { name: 'Implementation', score: sp.score.implementation },
                    { name: 'Documentation', score: sp.score.documentation },
                    { name: 'Presentation', score: sp.score.presentation },
                ];
            } else {
                setAnalyticsProjectId('all'); // fallback if project deleted
            }
        }
    }

    const ScoreSlider = ({ label, field, color }) => (
        <div className="idc-score-field">
            <div className="idc-score-header">
                <label>{label}</label>
                <span className="idc-score-num" style={{ color }}>{scoreForm[field]}/10</span>
            </div>
            <input
                type="range" min={0} max={10} step={1}
                value={scoreForm[field]}
                onChange={e => setScoreForm({ ...scoreForm, [field]: Number(e.target.value) })}
                className="idc-slider"
                style={{ '--slider-color': color }}
            />
        </div>
    );

    if (loading) return <Layout><div className="idc-loading">Loading IDC Review...</div></Layout>;

    return (
        <Layout>
            <div className="idc-page">
                {/* Hero */}
                <div className="idc-hero">
                    <div className="idc-hero-icon"><FaMedal /></div>
                    <div>
                        <h1 className="idc-hero-title">IDC Review Panel</h1>
                        <p className="idc-hero-sub">Final Year Project Evaluation — Year 4 only</p>
                    </div>
                    <div className="idc-hero-badge">{projects.length} Projects</div>
                </div>

                {/* Stats */}
                <div className="idc-stats-row">
                    {[
                        { label: 'Total', val: projects.length, color: '#6366f1' },
                        { label: 'Scored', val: scored.length, color: '#22c55e' },
                        { label: 'Pending Score', val: projects.length - scored.length, color: '#f59e0b' },
                        { label: 'Avg Total', val: scored.length ? (scored.reduce((s,p) => s + p.score.total, 0) / scored.length).toFixed(1) + '/40' : '—', color: '#ec4899' },
                    ].map(s => (
                        <div key={s.label} className="idc-stat-card" style={{ borderTopColor: s.color }}>
                            <div className="idc-stat-val" style={{ color: s.color }}>{s.val}</div>
                            <div className="idc-stat-lbl">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="idc-tabs">
                    {[{id:'projects',label:'🎓 Final Year Projects'},{id:'analytics',label:'📊 Score Analytics'}].map(t => (
                        <button key={t.id} className={`idc-tab ${activeTab===t.id?'idc-tab--active':''}`} onClick={() => setActiveTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Projects tab ── */}
                {activeTab === 'projects' && (
                    <div className="idc-panel">
                        {/* Search */}
                        <div className="idc-search-bar card">
                            <FaSearch color="#94a3b8" />
                            <input type="text" placeholder="Search projects or students..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="idc-search-input" />
                        </div>

                        {filtered.length === 0 ? (
                            <div className="idc-empty">
                                <FaMedal size={40} />
                                <p>No final year projects found.</p>
                            </div>
                        ) : (
                            <div className="idc-proj-grid">
                                {filtered.map(p => (
                                    <div key={p.id} className={`idc-proj-card ${selected?.id === p.id ? 'idc-proj-card--open' : ''}`}>
                                        <div className="idc-proj-top">
                                            <div className="idc-proj-title">{p.title}</div>
                                            {p.score ? (
                                                <span className="idc-scored-badge">✅ Scored {p.score.total}/40</span>
                                            ) : (
                                                <span className="idc-pending-badge">⏳ Not Scored</span>
                                            )}
                                        </div>
                                        <div className="idc-proj-students">
                                            {(p.studentDetails || []).map(s => (
                                                <span key={s.id} className="idc-student-chip">{s.name}</span>
                                            ))}
                                        </div>
                                        <div className="idc-proj-meta">
                                            <span>Guide: {p.guide?.name || '—'}</span>
                                            <span>Batch: {p.batch || '—'}</span>
                                            <span className="idc-status-chip" style={{
                                                background: p.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                                                color: p.status === 'Completed' ? '#166534' : '#92400e',
                                            }}>{p.status}</span>
                                        </div>

                                        {/* Links */}
                                        <div className="idc-proj-links">
                                            {p.githubLink && <a href={p.githubLink} target="_blank" rel="noreferrer" className="idc-link">🔗 GitHub</a>}
                                            {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" className="idc-link">📄 Proof</a>}
                                        </div>

                                        {/* Score form toggle */}
                                        <button
                                            className={`idc-score-btn ${selected?.id === p.id ? 'idc-score-btn--cancel' : ''}`}
                                            onClick={() => setSelected(selected?.id === p.id ? null : p)}
                                        >
                                            {selected?.id === p.id ? '✕ Cancel' : <><FaStar /> {p.score ? 'Update Score' : 'Score Project'}</>}
                                        </button>

                                        {/* Score Form */}
                                        {selected?.id === p.id && (
                                            <form onSubmit={handleScore} className="idc-score-form">
                                                <div className="idc-score-form-title">🏅 Evaluation Criteria (each /10)</div>
                                                <ScoreSlider label="💡 Innovation" field="innovation" color="#6366f1" />
                                                <ScoreSlider label="⚙️ Implementation" field="implementation" color="#22c55e" />
                                                <ScoreSlider label="📄 Documentation" field="documentation" color="#f59e0b" />
                                                <ScoreSlider label="🎤 Presentation" field="presentation" color="#ec4899" />
                                                <div className="idc-total-preview">
                                                    Total: {scoreForm.innovation + scoreForm.implementation + scoreForm.documentation + scoreForm.presentation}/40
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Overall feedback (optional)..."
                                                    value={scoreForm.comment}
                                                    onChange={e => setScoreForm({ ...scoreForm, comment: e.target.value })}
                                                    className="form-control"
                                                />
                                                <button type="submit" className="btn idc-submit-btn" disabled={submitting}>
                                                    {submitting ? 'Submitting…' : '✅ Submit Score'}
                                                </button>
                                            </form>
                                        )}

                                        {/* Existing score display */}
                                        {p.score && selected?.id !== p.id && (
                                            <div className="idc-existing-score">
                                                <div className="idc-score-mini-grid">
                                                    {['innovation','implementation','documentation','presentation'].map((k,i) => (
                                                        <div key={k} className="idc-score-mini-item">
                                                            <span>{k.charAt(0).toUpperCase()+k.slice(1)}</span>
                                                            <div className="idc-mini-bar">
                                                                <div className="idc-mini-fill" style={{ width: `${p.score[k]*10}%`, background: SCORE_COLORS[i] }} />
                                                            </div>
                                                            <span style={{ color: SCORE_COLORS[i], fontWeight: 700 }}>{p.score[k]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="idc-score-by">Scored by {p.score.scorerName}</div>
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
                    <div className="idc-panel">
                        {scored.length === 0 ? (
                            <div className="idc-empty"><FaChartBar size={40} /><p>No scored projects yet.</p></div>
                        ) : (
                            <div className="card idc-analytics-card">
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', background: '#f8faff', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <FaFilter color="#64748b" />
                                    <label style={{ fontWeight: 600, color: '#1a2744', fontSize: '0.9rem' }}>Filter Project:</label>
                                    <select 
                                        className="form-control" 
                                        style={{ maxWidth: '300px', margin: 0 }}
                                        value={analyticsProjectId}
                                        onChange={e => setAnalyticsProjectId(e.target.value)}
                                    >
                                        <option value="all">All Projects (Average)</option>
                                        {scored.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="card-title">{chartTitle}</div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={chartData} barSize={50} margin={{ left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 10]} allowDecimals={false} tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={v => [`${v}`, 'Score']} />
                                        <Bar dataKey="score" radius={[6,6,0,0]}>
                                            {chartData.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="idc-avg-row">
                                    {chartData.map((d, i) => (
                                        <div key={d.name} className="idc-avg-item">
                                            <div className="idc-avg-dot" style={{ background: SCORE_COLORS[i] }} />
                                            <span>{d.name}: <strong>{d.score}</strong></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default IDCReview;
