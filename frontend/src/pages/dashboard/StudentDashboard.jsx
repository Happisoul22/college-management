import { useState, useContext, useEffect } from 'react';
import AuthContext from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FaPlus, FaCheck, FaTimes, FaClock, FaTrophy, FaClipboardList, FaHourglassHalf, FaBan, FaChalkboardTeacher, FaPhone, FaEnvelope, FaUserTie } from 'react-icons/fa';
import api from '../../api/axios';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';
import './StudentDashboard.css';

/* ─── Colours ───────────────────────────────────────── */
const STATUS_COLORS = {
    Approved: '#22c55e',
    Pending: '#f59e0b',
    Rejected: '#ef4444',
};

const TYPE_COLORS = [
    '#e05c1a', '#0d2b5e', '#f4a820', '#10b981', '#6366f1',
    '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4',
];

/* ─── Custom Pie label ───────────────────────────────── */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
            fontSize={12} fontWeight={700}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

/* ────────────────────────────────────────────────────── */
const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classTeacher, setClassTeacher] = useState(null);
    const [counsellor, setCounsellor] = useState(null);

    useEffect(() => { fetchAchievements(); fetchClassTeacher(); fetchCounsellor(); }, []);

    const fetchAchievements = async () => {
        try {
            const res = await api.get('/achievements');
            setAchievements(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassTeacher = async () => {
        try {
            const res = await api.get('/assignments/my-class-teacher');
            setClassTeacher(res.data.data);
        } catch (err) {
            console.error('Class teacher fetch failed:', err);
        }
    };

    const fetchCounsellor = async () => {
        try {
            const res = await api.get('/assignments/my-counsellor');
            setCounsellor(res.data.data);
        } catch (err) {
            console.error('Counsellor fetch failed:', err);
        }
    };

    /* ── Derived analytics ── */
    const total = achievements.length;
    const approved = achievements.filter(a => a.status === 'Approved').length;
    const pending = achievements.filter(a => a.status === 'Pending').length;
    const rejected = achievements.filter(a => a.status === 'Rejected').length;

    /* Pie — status breakdown */
    const statusData = [
        { name: 'Approved', value: approved },
        { name: 'Pending', value: pending },
        { name: 'Rejected', value: rejected },
    ].filter(d => d.value > 0);

    /* Bar — by type */
    const typeMap = {};
    achievements.forEach(a => {
        typeMap[a.type] = (typeMap[a.type] || 0) + 1;
    });
    const typeData = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    /* Line — monthly trend (last 6 months) */
    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyMap[key] = 0;
    }
    achievements.forEach(a => {
        const d = new Date(a.createdAt);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (key in monthlyMap) monthlyMap[key]++;
    });
    const trendData = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    /* ── Stat card helper ── */
    const StatCard = ({ icon, value, label, color }) => (
        <div className="sd-stat-card" style={{ borderTopColor: color }}>
            <div className="sd-stat-icon" style={{ background: color + '18', color }}>
                {icon}
            </div>
            <div className="sd-stat-body">
                <div className="sd-stat-value" style={{ color }}>{value}</div>
                <div className="sd-stat-label">{label}</div>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="page-title">My Dashboard</div>

            {/* ── Class Teacher Card ── */}
            <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #e05c1a' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaChalkboardTeacher color="#e05c1a" /> My Class Teacher
                </div>
                {classTeacher ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #e05c1a, #0d2b5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                            {classTeacher.faculty?.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{classTeacher.faculty?.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span><FaEnvelope style={{ marginRight: 4 }} />{classTeacher.faculty?.email}</span>
                                {classTeacher.faculty?.facultyProfile?.phone && (
                                    <span><FaPhone style={{ marginRight: 4 }} />{classTeacher.faculty.facultyProfile.phone}</span>
                                )}
                            </div>
                        </div>
                        <span style={{ background: '#fef3e2', color: '#e05c1a', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>Year {classTeacher.year} — Sec {classTeacher.section}</span>
                    </div>
                ) : (
                    <p style={{ color: '#94a3b8', margin: 0 }}>No class teacher has been assigned to your class yet.</p>
                )}
            </div>

            {/* ── Counsellor Card ── */}
            {counsellor && (
                <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #6366f1' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaUserTie color="#6366f1" /> My Counsellor / Mentor
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ width: 52, height: 52, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, flexShrink: 0 }}>
                            {counsellor.name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{counsellor.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <span><FaEnvelope style={{ marginRight: 4 }} />{counsellor.email}</span>
                                {counsellor.facultyProfile?.phone && (
                                    <span><FaPhone style={{ marginRight: 4 }} />{counsellor.facultyProfile.phone}</span>
                                )}
                                {counsellor.facultyProfile?.facultyId && (
                                    <span style={{ color: '#6366f1', fontWeight: 700 }}>ID: {counsellor.facultyProfile.facultyId}</span>
                                )}
                            </div>
                        </div>
                        <span style={{ background: '#eef2ff', color: '#4338ca', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>Counsellor</span>
                    </div>
                </div>
            )}

            {/* ── Stat summary row ── */}
            <div className="sd-stats-row">
                <StatCard icon={<FaTrophy />} value={total} label="Total Achievements" color="#e05c1a" />
                <StatCard icon={<FaCheck />} value={approved} label="Approved" color="#22c55e" />
                <StatCard icon={<FaHourglassHalf />} value={pending} label="Pending" color="#f59e0b" />
                <StatCard icon={<FaBan />} value={rejected} label="Rejected" color="#ef4444" />
            </div>

            {/* ── Charts row ── */}
            {total > 0 ? (
                <div className="sd-charts-row">

                    {/* Pie — Status */}
                    <div className="card sd-chart-card">
                        <div className="card-title">Achievement Status</div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={statusData} dataKey="value"
                                    cx="50%" cy="50%" outerRadius={90}
                                    labelLine={false} label={renderCustomLabel}
                                >
                                    {statusData.map(entry => (
                                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => [v, 'Count']} />
                                <Legend iconType="circle" iconSize={10} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bar — Type breakdown */}
                    {typeData.length > 0 && (
                        <div className="card sd-chart-card">
                            <div className="card-title">Achievements by Type</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={typeData} barSize={28} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                                        {typeData.map((_, i) => (
                                            <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Line — Monthly trend */}
                    <div className="card sd-chart-card">
                        <div className="card-title">Monthly Trend (6 months)</div>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={trendData} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Line
                                    type="monotone" dataKey="count"
                                    stroke="#e05c1a" strokeWidth={2.5}
                                    dot={{ r: 5, fill: '#e05c1a', stroke: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                </div>
            ) : !loading && (
                <div className="sd-empty-analytics">
                    <FaClipboardList size={36} />
                    <p>No achievements yet — add your first one to see analytics!</p>
                </div>
            )}

            {/* ── Recent Achievements table ── */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Recent Achievements</div>
                    <a href="/achievements" className="btn btn-primary">
                        <FaPlus style={{ marginRight: '6px' }} /> Add New
                    </a>
                </div>

                {loading ? (
                    <div className="sd-loading">Loading achievements…</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {achievements.length > 0 ? achievements.slice(0, 5).map(ach => (
                                    <tr key={ach._id}>
                                        <td>{ach.title}</td>
                                        <td>
                                            <span className="sd-type-chip">{ach.type}</span>
                                        </td>
                                        <td>{new Date(ach.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <span className={`status-badge status-${ach.status}`}>
                                                {ach.status === 'Approved' && <FaCheck style={{ marginRight: '4px' }} />}
                                                {ach.status === 'Rejected' && <FaTimes style={{ marginRight: '4px' }} />}
                                                {ach.status === 'Pending' && <FaClock style={{ marginRight: '4px' }} />}
                                                {ach.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                                            No achievements added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default StudentDashboard;
