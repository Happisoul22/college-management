import { useState, useEffect, useContext, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    FaChartBar, FaFilter, FaTrophy, FaCheckCircle,
    FaClock, FaBan, FaFilePdf, FaImage, FaExternalLinkAlt,
    FaChevronDown, FaChevronUp, FaClipboardList,
    FaCalendarAlt, FaBuilding, FaGraduationCap
} from 'react-icons/fa';

/* ── Faculty achievement types ─ */
const FACULTY_TYPES = [
    'Research Paper', 'Publication', 'Patent', 'Book / Book Chapter',
    'Certification', 'NPTEL / MOOC', 'FDP / Workshop', 'Conference',
    'Consultancy / Project', 'Award / Recognition', 'NCC/NSS', 'Other'
];

const TYPE_COLORS = [
    '#6366f1', '#0d2b5e', '#f59e0b', '#10b981',
    '#e05c1a', '#f4a820', '#14b8a6', '#8b5cf6',
    '#ec4899', '#22c55e', '#06b6d4', '#64748b',
];

const STATUS_META = {
    Approved: { icon: <FaCheckCircle />, color: '#22c55e' },
    Pending: { icon: <FaClock />, color: '#f59e0b' },
    Rejected: { icon: <FaBan />, color: '#ef4444' },
};

const typeColor = (type) => {
    const idx = FACULTY_TYPES.indexOf(type);
    return TYPE_COLORS[idx >= 0 ? idx % TYPE_COLORS.length : TYPE_COLORS.length - 1];
};

const isImage = (url = '') => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

/* ── Certificate Button ── */
const CertButton = ({ proofUrl, githubLink }) => {
    if (!proofUrl && !githubLink) return <span style={{ fontSize: '0.77rem', color: '#94a3b8', fontStyle: 'italic' }}>No proof uploaded</span>;
    const img = proofUrl && isImage(proofUrl);
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {proofUrl && (
                <a href={proofUrl} target="_blank" rel="noreferrer" className="sa-cert-btn">
                    {img ? <FaImage /> : <FaFilePdf />}
                    <span>View Proof</span>
                    <FaExternalLinkAlt className="sa-cert-ext-icon" />
                </a>
            )}
            {githubLink && (
                <a href={githubLink} target="_blank" rel="noreferrer" className="sa-cert-btn" style={{ background: 'linear-gradient(135deg, #24292e, #3a4046)' }}>
                    <FaExternalLinkAlt />
                    <span>Link</span>
                </a>
            )}
        </div>
    );
};

/* ── Achievement Card ── */
const AchCard = ({ ach, showFaculty }) => {
    const sm = STATUS_META[ach.status] || STATUS_META.Pending;
    const color = typeColor(ach.type);
    return (
        <div className="sa-ach-card" style={{ '--type-color': color }}>
            <div className="sa-ach-card-stripe" style={{ background: color }} />
            <div className="sa-ach-card-body">
                {showFaculty && ach.user && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                        padding: '4px 10px', background: '#f0f4ff', borderRadius: 8, width: 'fit-content'
                    }}>
                        <FaGraduationCap style={{ color: '#0d2b5e', fontSize: '0.78rem' }} />
                        <span style={{ fontWeight: 700, color: '#0d2b5e', fontSize: '0.82rem' }}>{ach.user.name}</span>
                        {ach.user.facultyProfile?.facultyId && (
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({ach.user.facultyProfile.facultyId})</span>
                        )}
                    </div>
                )}
                <div className="sa-ach-title-row">
                    <h3 className="sa-ach-title">{ach.title}</h3>
                    <span className="sa-type-badge" style={{ background: color + '18', color, borderColor: color + '55' }}>
                        {ach.type}
                    </span>
                </div>
                <div className="sa-ach-meta">
                    {ach.organization && (
                        <span className="sa-meta-item"><FaBuilding className="sa-meta-icon" />{ach.organization}</span>
                    )}
                    <span className="sa-meta-item"><FaGraduationCap className="sa-meta-icon" />Year {ach.year}</span>
                    <span className="sa-meta-item">
                        <FaCalendarAlt className="sa-meta-icon" />
                        {new Date(ach.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <span className="sa-status-badge" style={{ color: sm.color, background: sm.color + '15', borderColor: sm.color + '40' }}>
                        {sm.icon} {ach.status}
                    </span>
                </div>
                {ach.description && <p className="sa-ach-desc">{ach.description}</p>}
                <div className="sa-ach-footer">
                    <CertButton proofUrl={ach.proofUrl} githubLink={ach.githubLink} />
                </div>
            </div>
        </div>
    );
};

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="sa-chart-tooltip">
            <strong>{label}</strong>
            <span>{payload[0].value} achievement{payload[0].value !== 1 ? 's' : ''}</span>
        </div>
    );
};

/* ── Main Page ── */
const FacultyAnalytics = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isPersonalMode = queryParams.get('mode') === 'personal';
    
    // An HOD sees department analytics UNLESS they explicitly clicked "My Analytics"
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(user?.role);
    const showDept = isHOD && !isPersonalMode;

    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [selectedYear, setSelectedYear] = useState('All');

    // Re-fetch if mode changes
    useEffect(() => { 
        setLoading(true);
        fetchAchievements(); 
    }, [isPersonalMode]);

    const fetchAchievements = async () => {
        try {
            // Include &me=true if we are NOT showing the department view
            const endpoint = `/achievements?ownerRole=Faculty${!showDept ? '&me=true' : ''}`;
            const res = await api.get(endpoint);
            setAchievements(res.data.data);
        } catch (err) {
            toast.error('Failed to load achievements');
        } finally {
            setLoading(false);
        }
    };

    /* ── Derived ── */
    const typeMap = {};
    achievements.forEach(a => { typeMap[a.type] = (typeMap[a.type] || 0) + 1; });

    const chartData = Object.entries(typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

    const activeTypes = ['All', ...Object.keys(typeMap)];

    const filtered = filter === 'All' ? achievements : achievements.filter(a => a.type === filter);

    // Breakdown chart when a specific type is selected
    const filteredBreakdown = filter === 'All' ? [] : (() => {
        const map = {};
        filtered.forEach(a => {
            const key = `${a.year}`;
            map[key] = (map[key] || 0) + 1;
        });
        return Object.entries(map)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => a.label.localeCompare(b.label));
    })();

    // Pie chart filtered by year (no semester for faculty)
    const yearFiltered = selectedYear === 'All'
        ? achievements
        : achievements.filter(a => String(a.year) === String(selectedYear));

    const semTypeMap = {};
    yearFiltered.forEach(a => { semTypeMap[a.type] = (semTypeMap[a.type] || 0) + 1; });
    const pieData = Object.entries(semTypeMap).map(([type, value]) => ({ name: type, value }));

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
            {/* ── Header ── */}
            <div className="sa-page-header">
                <div>
                    <div className="page-title" style={{ marginBottom: 4 }}>
                        {showDept ? 'Department Faculty Analytics' : 'My Analytics'}
                    </div>
                    <p className="sa-page-subtitle">
                        {showDept
                            ? 'Faculty professional achievements across your department'
                            : 'Track your professional achievements & certifications'
                        }
                    </p>
                </div>
                <div className="sa-header-chips">
                    <span className="sa-header-chip sa-chip--total"><FaTrophy /> {total} Total</span>
                    <span className="sa-header-chip sa-chip--approved"><FaCheckCircle /> {approved} Approved</span>
                    <span className="sa-header-chip sa-chip--pending"><FaClock /> {pending} Pending</span>
                </div>
            </div>

            {total === 0 ? (
                <div className="sa-empty-state">
                    <FaClipboardList className="sa-empty-icon" />
                    <h3>No Achievements Yet</h3>
                    <p>{showDept ? 'No faculty achievements found in your department.' : <span>Go to <a href="/faculty-achievements">My Achievements</a> to add your first one!</span>}</p>
                </div>
            ) : (
                <>
                    {/* ── Charts Row ── */}
                    <div className="sa-charts-row">
                        {/* Bar Chart */}
                        <div className="card sa-chart-card sa-chart-card--bar">
                            <div className="sa-chart-header">
                                <FaChartBar className="sa-chart-icon" />
                                <div className="card-title" style={{ marginBottom: 0 }}>Achievements by Type</div>
                            </div>
                            <p className="sa-chart-hint">Click any bar to filter achievements below</p>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={chartData} barSize={34}
                                    margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                                    onClick={(d) => d?.activeLabel && setFilter(d.activeLabel)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="type" tick={{ fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]} cursor="pointer">
                                        {chartData.map(entry => (
                                            <Cell key={entry.type} fill={typeColor(entry.type)}
                                                opacity={filter === 'All' || filter === entry.type ? 1 : 0.35} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Pie Chart */}
                        <div className="card sa-chart-card sa-chart-card--pie">
                            <div className="sa-chart-header">
                                <span className="sa-pie-icon">🥧</span>
                                <div className="card-title" style={{ marginBottom: 0 }}>Uploads by Year</div>
                            </div>
                            <div className="sa-pie-selectors">
                                <div className="sa-pie-select-wrap">
                                    <label className="sa-pie-select-label">Year</label>
                                    <select className="sa-pie-select" value={selectedYear}
                                        onChange={e => setSelectedYear(e.target.value)}>
                                        <option value="All">All Years</option>
                                        {Array.from({ length: new Date().getFullYear() - 2018 }, (_, i) => 2019 + i)
                                            .reverse().map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            {pieData.length === 0 ? (
                                <div className="sa-pie-empty"><span>📭</span><p>No uploads for selected year</p></div>
                            ) : (
                                <>
                                    <p className="sa-chart-hint">
                                        {yearFiltered.length} achievement{yearFiltered.length !== 1 ? 's' : ''}
                                        {selectedYear !== 'All' ? ` · ${selectedYear}` : ''}
                                    </p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={pieData} dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" outerRadius={78} innerRadius={36}
                                                paddingAngle={3}
                                                label={({ percent }) => percent > 0.07 ? `${Math.round(percent * 100)}%` : ''}
                                                labelLine={false}>
                                                {pieData.map(entry => (
                                                    <Cell key={entry.name} fill={typeColor(entry.name)} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v + ' achievement' + (v !== 1 ? 's' : ''), n]} />
                                            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.72rem', paddingTop: 8 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Type Breakdown Chart ── */}
                    {filter !== 'All' && filteredBreakdown.length > 0 && (
                        <div className="card sa-breakdown-card">
                            <div className="sa-chart-header">
                                <span className="sa-breakdown-dot" style={{ background: typeColor(filter) }} />
                                <div className="card-title" style={{ marginBottom: 0 }}>{filter} — by Year</div>
                                <span className="sa-breakdown-total">{filtered.length} total</span>
                            </div>
                            <p className="sa-chart-hint">Distribution of your {filter} achievements by year</p>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={filteredBreakdown} barSize={32}
                                    margin={{ top: 8, right: 16, left: -14, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(v) => [v + ` achievement${v !== 1 ? 's' : ''}`, filter]}
                                        contentStyle={{ background: '#0d2b5e', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.82rem' }}
                                        labelStyle={{ color: '#f4a820', fontWeight: 700 }} itemStyle={{ color: '#fff' }} />
                                    <Bar dataKey="count" radius={[7, 7, 0, 0]}>
                                        {filteredBreakdown.map(entry => (
                                            <Cell key={entry.label} fill={typeColor(filter)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* ── Filter Chips ── */}
                    <div className="sa-filter-section">
                        <div className="sa-filter-label">
                            <FaFilter className="sa-filter-icon" /><span>Filter by Type</span>
                        </div>
                        <div className="sa-filter-chips">
                            {activeTypes.map(type => {
                                const color = type === 'All' ? '#e05c1a' : typeColor(type);
                                const isActive = filter === type;
                                const count = type === 'All' ? total : (typeMap[type] || 0);
                                return (
                                    <button key={type}
                                        className={`sa-filter-chip${isActive ? ' sa-filter-chip--active' : ''}`}
                                        style={isActive
                                            ? { background: color, borderColor: color, color: '#fff' }
                                            : { borderColor: color + '55', color }}
                                        onClick={() => setFilter(type)}>
                                        {type}
                                        <span className="sa-chip-count">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Cards ── */}
                    <div className="sa-section-header">
                        <h2 className="sa-section-title">
                            {filter === 'All' ? 'All Achievements' : `${filter} Achievements`}
                            <span className="sa-section-count">{filtered.length}</span>
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="sa-no-results">No achievements found for <strong>{filter}</strong>.</div>
                    ) : (
                        <div className="sa-cards-grid">
                            {filtered.map(ach => <AchCard key={ach._id} ach={ach} showFaculty={showDept} />)}
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
};

export default FacultyAnalytics;
