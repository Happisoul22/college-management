import { useState, useEffect, useContext, useCallback } from 'react';
import Layout from '../components/Layout';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    FaChartBar, FaFilter, FaTrophy, FaCheckCircle,
    FaClock, FaBan, FaFilePdf, FaImage, FaExternalLinkAlt,
    FaRobot, FaChevronDown, FaChevronUp, FaClipboardList,
    FaCalendarAlt, FaBuilding, FaGraduationCap
} from 'react-icons/fa';
import './StudentAnalytics.css';

/* ─── Constants ───────────────────────────────────────── */
const TYPES = [
    'Internship', 'NPTEL', 'Certification',
    'Mini Project', 'Major Project', 'Research Paper',
    'Publication', 'Patent', 'NCC/NSS', 'Placement'
];

const TYPE_COLORS = [
    '#e05c1a', '#0d2b5e', '#f4a820', '#10b981', '#6366f1',
    '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4',
];

const STATUS_META = {
    Approved: { icon: <FaCheckCircle />, color: '#22c55e' },
    Pending: { icon: <FaClock />, color: '#f59e0b' },
    Rejected: { icon: <FaBan />, color: '#ef4444' },
};

/* ─── Small helpers ─────────────────────────────────────── */
const typeColor = (type) => {
    const idx = TYPES.indexOf(type);
    return TYPE_COLORS[idx >= 0 ? idx % TYPE_COLORS.length : 0];
};

const isImage = (url = '') =>
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

/* ─── AI Insight Panel ───────────────────────────────────── */
const AiInsightPanel = ({ achievement }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [insight, setInsight] = useState(null);
    const [error, setError] = useState('');

    const fetchInsight = useCallback(async () => {
        if (insight || loading) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/ai/achievement-insight', { achievement });
            setInsight(res.data.insight);
        } catch (err) {
            setError(err.response?.data?.error || 'AI insight unavailable.');
        } finally {
            setLoading(false);
        }
    }, [achievement, insight, loading]);

    const toggle = () => {
        if (!open) fetchInsight();
        setOpen(o => !o);
    };

    return (
        <div className="sa-ai-panel">
            <button className="sa-ai-toggle" onClick={toggle}>
                <FaRobot className="sa-ai-robot-icon" />
                <span>AI Insight</span>
                {open ? <FaChevronUp className="sa-ai-chevron" /> : <FaChevronDown className="sa-ai-chevron" />}
            </button>

            {open && (
                <div className="sa-ai-body">
                    {loading && (
                        <div className="sa-ai-loading">
                            <span className="sa-spinner" />
                            Generating AI insight…
                        </div>
                    )}
                    {error && <div className="sa-ai-error">{error}</div>}
                    {insight && !loading && (
                        <div className="sa-ai-grid">
                            <AiRow icon="🎯" label="Purpose" text={insight.purpose} />
                            <AiRow icon="📅" label="Timeline" text={insight.timeline} />
                            <AiRow icon="💡" label="Key Learnings" text={insight.learnings} />
                            <AiRow icon="🚀" label="Significance" text={insight.significance} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AiRow = ({ icon, label, text }) =>
    text ? (
        <div className="sa-ai-row">
            <span className="sa-ai-row-icon">{icon}</span>
            <div className="sa-ai-row-content">
                <span className="sa-ai-row-label">{label}</span>
                <p className="sa-ai-row-text">{text}</p>
            </div>
        </div>
    ) : null;

/* ─── Certificate Button ─────────────────────────────────── */
const CertButton = ({ proofUrl }) => {
    if (!proofUrl) return <span className="sa-no-cert">No certificate uploaded</span>;
    const img = isImage(proofUrl);
    return (
        <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="sa-cert-btn"
        >
            {img ? <FaImage /> : <FaFilePdf />}
            <span>View Certificate</span>
            <FaExternalLinkAlt className="sa-cert-ext-icon" />
        </a>
    );
};

/* ─── Single Achievement Card ────────────────────────────── */
const AchievementCard = ({ ach }) => {
    const sm = STATUS_META[ach.status] || STATUS_META.Pending;
    const color = typeColor(ach.type);

    return (
        <div className="sa-ach-card" style={{ '--type-color': color }}>
            {/* Card header bar */}
            <div className="sa-ach-card-stripe" style={{ background: color }} />

            <div className="sa-ach-card-body">
                {/* Title row */}
                <div className="sa-ach-title-row">
                    <h3 className="sa-ach-title">{ach.title}</h3>
                    <span className="sa-type-badge" style={{ background: color + '18', color, borderColor: color + '55' }}>
                        {ach.type}
                    </span>
                </div>

                {/* Meta row */}
                <div className="sa-ach-meta">
                    {ach.organization && (
                        <span className="sa-meta-item">
                            <FaBuilding className="sa-meta-icon" />
                            {ach.organization}
                        </span>
                    )}
                    <span className="sa-meta-item">
                        <FaGraduationCap className="sa-meta-icon" />
                        Year {ach.year}{ach.semester ? ` / Sem ${ach.semester}` : ''}
                    </span>
                    <span className="sa-meta-item">
                        <FaCalendarAlt className="sa-meta-icon" />
                        {new Date(ach.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <span
                        className="sa-status-badge"
                        style={{ color: sm.color, background: sm.color + '15', borderColor: sm.color + '40' }}
                    >
                        {sm.icon} {ach.status}
                    </span>
                </div>

                {/* Description */}
                {ach.description && (
                    <p className="sa-ach-desc">{ach.description}</p>
                )}

                {/* Extra details for NPTEL */}
                {ach.type === 'NPTEL' && (ach.score || ach.nptelDuration || ach.instructor) && (
                    <div className="sa-ach-extra-details">
                        {ach.score && <span className="sa-extra-chip">Score: {ach.score}%</span>}
                        {ach.nptelDuration && <span className="sa-extra-chip">{ach.nptelDuration}</span>}
                        {ach.nptelCourseType && <span className="sa-extra-chip">{ach.nptelCourseType}</span>}
                        {ach.instructor && <span className="sa-extra-chip">By {ach.instructor}</span>}
                    </div>
                )}

                {/* Extra details for Internship */}
                {ach.type === 'Internship' && (ach.domain || ach.weeks) && (
                    <div className="sa-ach-extra-details">
                        {ach.domain && <span className="sa-extra-chip">{ach.domain}</span>}
                        {ach.weeks && <span className="sa-extra-chip">{ach.weeks} weeks</span>}
                    </div>
                )}

                {/* Certificate + AI divider */}
                <div className="sa-ach-footer">
                    <CertButton proofUrl={ach.proofUrl} />
                </div>

                {/* AI Insight */}
                <AiInsightPanel achievement={ach} />
            </div>
        </div>
    );
};

/* ─── Custom Tooltip for Bar Chart ───────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="sa-chart-tooltip">
            <strong>{label}</strong>
            <span>{payload[0].value} achievement{payload[0].value !== 1 ? 's' : ''}</span>
        </div>
    );
};

/* ─── Main Page ──────────────────────────────────────────── */
const StudentAnalytics = () => {
    const { user } = useContext(AuthContext);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [selectedYear, setSelectedYear] = useState('All');
    const [selectedSem, setSelectedSem] = useState('All');

    useEffect(() => { fetchAchievements(); }, []);

    const fetchAchievements = async () => {
        try {
            const res = await api.get('/achievements');
            setAchievements(res.data.data);
        } catch (err) {
            toast.error('Failed to load achievements');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /* ── Derived data ── */
    const typeMap = {};
    achievements.forEach(a => {
        typeMap[a.type] = (typeMap[a.type] || 0) + 1;
    });

    // Bar chart data — include zero counts for types that exist
    const chartData = Object.entries(typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

    // Active filter types (types that have entries)
    const activeTypes = ['All', ...Object.keys(typeMap)];

    // Filtered achievements
    const filtered = filter === 'All'
        ? achievements
        : achievements.filter(a => a.type === filter);

    // Breakdown chart data (for selected filter type — by Year × Sem label)
    const filteredBreakdown = filter === 'All' ? [] : (() => {
        const map = {};
        filtered.forEach(a => {
            const key = `Yr ${a.year}${a.semester ? ` Sem ${a.semester}` : ''}`;
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));
    })();

    // Year / Sem pie chart data
    const semFiltered = achievements.filter(a => {
        const yearOk = selectedYear === 'All' || String(a.year) === String(selectedYear);
        const semOk = selectedSem === 'All' || String(a.semester) === String(selectedSem);
        return yearOk && semOk;
    });
    const semTypeMap = {};
    semFiltered.forEach(a => {
        semTypeMap[a.type] = (semTypeMap[a.type] || 0) + 1;
    });
    const pieData = Object.entries(semTypeMap).map(([type, value]) => ({ name: type, value }));

    /* ── Stats ── */
    const total = achievements.length;
    const approved = achievements.filter(a => a.status === 'Approved').length;
    const pending = achievements.filter(a => a.status === 'Pending').length;

    if (loading) {
        return (
            <Layout>
                <div className="sa-loading-state">
                    <span className="sa-spinner sa-spinner--lg" />
                    <p>Loading your analytics…</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* ── Page Header ── */}
            <div className="sa-page-header">
                <div>
                    <div className="page-title" style={{ marginBottom: 4 }}>My Analytics</div>
                    <p className="sa-page-subtitle">
                        Track your academic achievements, view certificates &amp; get AI-powered insights
                    </p>
                </div>
                <div className="sa-header-chips">
                    <span className="sa-header-chip sa-chip--total">
                        <FaTrophy /> {total} Total
                    </span>
                    <span className="sa-header-chip sa-chip--approved">
                        <FaCheckCircle /> {approved} Approved
                    </span>
                    <span className="sa-header-chip sa-chip--pending">
                        <FaClock /> {pending} Pending
                    </span>
                </div>
            </div>

            {total === 0 ? (
                /* ── Empty state ── */
                <div className="sa-empty-state">
                    <FaClipboardList className="sa-empty-icon" />
                    <h3>No Achievements Yet</h3>
                    <p>Go to <a href="/achievements">Achievements</a> to add your first one and see your analytics here!</p>
                </div>
            ) : (
                <>
                    {/* ── Charts Row ── */}
                    <div className="sa-charts-row">

                        {/* Bar Chart Card */}
                        <div className="card sa-chart-card sa-chart-card--bar">
                            <div className="sa-chart-header">
                                <FaChartBar className="sa-chart-icon" />
                                <div className="card-title" style={{ marginBottom: 0 }}>Achievements by Type</div>
                            </div>
                            <p className="sa-chart-hint">Click any bar to filter achievements below</p>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={chartData}
                                    barSize={38}
                                    margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                                    onClick={(data) => {
                                        if (data?.activeLabel) setFilter(data.activeLabel);
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="type"
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]} cursor="pointer">
                                        {chartData.map((entry, i) => (
                                            <Cell
                                                key={entry.type}
                                                fill={typeColor(entry.type)}
                                                opacity={filter === 'All' || filter === entry.type ? 1 : 0.35}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Pie Chart Card */}
                        <div className="card sa-chart-card sa-chart-card--pie">
                            <div className="sa-chart-header">
                                <span className="sa-pie-icon">🥧</span>
                                <div className="card-title" style={{ marginBottom: 0 }}>Uploads by Year &amp; Sem</div>
                            </div>

                            {/* Year + Sem selectors */}
                            <div className="sa-pie-selectors">
                                <div className="sa-pie-select-wrap">
                                    <label className="sa-pie-select-label">Year</label>
                                    <select
                                        className="sa-pie-select"
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(e.target.value)}
                                    >
                                        <option value="All">All Years</option>
                                        {[1, 2, 3, 4].map(y => (
                                            <option key={y} value={y}>
                                                {y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sa-pie-select-wrap">
                                    <label className="sa-pie-select-label">Semester</label>
                                    <select
                                        className="sa-pie-select"
                                        value={selectedSem}
                                        onChange={e => setSelectedSem(e.target.value)}
                                    >
                                        <option value="All">All Sems</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                            <option key={s} value={s}>Sem {s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {pieData.length === 0 ? (
                                <div className="sa-pie-empty">
                                    <span>📭</span>
                                    <p>No uploads for the selected period</p>
                                </div>
                            ) : (
                                <>
                                    <p className="sa-chart-hint">
                                        {semFiltered.length} achievement{semFiltered.length !== 1 ? 's' : ''}
                                        {selectedYear !== 'All' ? ` · Year ${selectedYear}` : ''}
                                        {selectedSem !== 'All' ? ` · Sem ${selectedSem}` : ''}
                                    </p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={78}
                                                innerRadius={36}
                                                paddingAngle={3}
                                                label={({ name, percent }) =>
                                                    percent > 0.07 ? `${Math.round(percent * 100)}%` : ''
                                                }
                                                labelLine={false}
                                            >
                                                {pieData.map(entry => (
                                                    <Cell key={entry.name} fill={typeColor(entry.name)} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value, name) => [value + ' achievement' + (value !== 1 ? 's' : ''), name]}
                                            />
                                            <Legend
                                                iconType="circle"
                                                iconSize={9}
                                                wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Filter Chips ── */}
                    <div className="sa-filter-section">
                        <div className="sa-filter-label">
                            <FaFilter className="sa-filter-icon" />
                            <span>Filter by Type</span>
                        </div>
                        <div className="sa-filter-chips">
                            {activeTypes.map(type => {
                                const color = type === 'All' ? '#e05c1a' : typeColor(type);
                                const isActive = filter === type;
                                const count = type === 'All' ? total : (typeMap[type] || 0);
                                return (
                                    <button
                                        key={type}
                                        className={`sa-filter-chip${isActive ? ' sa-filter-chip--active' : ''}`}
                                        style={isActive
                                            ? { background: color, borderColor: color, color: '#fff' }
                                            : { borderColor: color + '55', color }}
                                        onClick={() => setFilter(type)}
                                    >
                                        {type}
                                        <span className="sa-chip-count">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Type Breakdown Chart (shown when a specific type is filtered) ── */}
                    {filter !== 'All' && filteredBreakdown.length > 0 && (
                        <div className="card sa-breakdown-card">
                            <div className="sa-chart-header">
                                <span className="sa-breakdown-dot" style={{ background: typeColor(filter) }} />
                                <div className="card-title" style={{ marginBottom: 0 }}>
                                    {filter} — by Year &amp; Semester
                                </div>
                                <span className="sa-breakdown-total">{filtered.length} total</span>
                            </div>
                            <p className="sa-chart-hint">Distribution of your {filter} achievements across semesters</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart
                                    data={filteredBreakdown}
                                    barSize={32}
                                    margin={{ top: 8, right: 16, left: -14, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fontWeight: 600 }}
                                        tickLine={false}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        formatter={(v) => [v + ` achievement${v !== 1 ? 's' : ''}`, filter]}
                                        contentStyle={{
                                            background: '#0d2b5e', color: '#fff',
                                            border: 'none', borderRadius: 10,
                                            fontSize: '0.82rem'
                                        }}
                                        labelStyle={{ color: '#f4a820', fontWeight: 700 }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="count" radius={[7, 7, 0, 0]}>
                                        {filteredBreakdown.map(entry => (
                                            <Cell key={entry.label} fill={typeColor(filter)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* ── Achievement Cards ── */}
                    <div className="sa-section-header">
                        <h2 className="sa-section-title">
                            {filter === 'All' ? 'All Achievements' : `${filter} Achievements`}
                            <span className="sa-section-count">{filtered.length}</span>
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="sa-no-results">
                            No achievements found for <strong>{filter}</strong>.
                        </div>
                    ) : (
                        <div className="sa-cards-grid">
                            {filtered.map(ach => (
                                <AchievementCard key={ach._id} ach={ach} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
};

export default StudentAnalytics;
