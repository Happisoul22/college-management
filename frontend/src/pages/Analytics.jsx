import { useState, useEffect, useContext, useRef } from 'react';
import Layout from '../components/Layout';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Bar, Pie } from 'react-chartjs-2';
import { getElementAtEvent } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import './Analytics.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const STATUS_COLORS = {
    Approved: { bg: 'rgba(34,197,94,0.65)', border: 'rgba(34,197,94,1)' },
    Pending: { bg: 'rgba(251,191,36,0.65)', border: 'rgba(251,191,36,1)' },
    Rejected: { bg: 'rgba(239,68,68,0.65)', border: 'rgba(239,68,68,1)' },
};

const Analytics = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const barRef = useRef(null);
    const pieRef = useRef(null);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [drillFilter, setDrillFilter] = useState(null);   // { key: 'type'|'status', value: 'NPTEL' }
    const [drillData, setDrillData] = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);

    useEffect(() => { fetchAnalytics(); }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/analytics/overall');
            setStats(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const drill = async (key, value) => {
        if (drillFilter?.key === key && drillFilter?.value === value) {
            setDrillFilter(null); setDrillData([]); return;
        }
        setDrillFilter({ key, value });
        setDrillLoading(true);
        try {
            const params = new URLSearchParams({ [key]: value, limit: 100 });
            const res = await api.get(`/achievements?${params}`);
            setDrillData(res.data.data || []);
        } catch (err) { console.error(err); }
        finally { setDrillLoading(false); }
    };

    const onBarClick = (e) => {
        if (!barRef.current) return;
        const els = getElementAtEvent(barRef.current, e);
        if (!els.length) return;
        const clickedType = stats?.byType?.[els[0].index]?._id;
        if (clickedType) drill('type', clickedType);
    };

    const onPieClick = (e) => {
        if (!pieRef.current) return;
        const els = getElementAtEvent(pieRef.current, e);
        if (!els.length) return;
        const clickedStatus = stats?.byStatus?.[els[0].index]?._id;
        if (clickedStatus) drill('status', clickedStatus);
    };

    if (loading) return <Layout><div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div></Layout>;
    if (!stats) return <Layout><div style={{ padding: '40px', textAlign: 'center' }}>No data available.</div></Layout>;

    const dept = stats.department || 'All';
    const total = stats.total || 0;
    const approved = stats.byStatus?.find(s => s._id === 'Approved')?.count || 0;
    const pending = stats.byStatus?.find(s => s._id === 'Pending')?.count || 0;
    const rejected = stats.byStatus?.find(s => s._id === 'Rejected')?.count || 0;

    const statusChartData = {
        labels: stats.byStatus?.map(s => s._id) || [],
        datasets: [{
            label: '# of Achievements',
            data: stats.byStatus?.map(s => s.count) || [],
            backgroundColor: stats.byStatus?.map(s => STATUS_COLORS[s._id]?.bg || 'rgba(100,116,139,0.5)'),
            borderColor: stats.byStatus?.map(s => STATUS_COLORS[s._id]?.border || '#64748b'),
            borderWidth: 2, hoverOffset: 8
        }]
    };

    const typeChartData = {
        labels: stats.byType?.map(t => t._id) || [],
        datasets: [{
            label: 'Count',
            data: stats.byType?.map(t => t.count) || [],
            backgroundColor: stats.byType?.map((t) =>
                drillFilter?.key === 'type' && drillFilter?.value === t._id
                    ? 'rgba(249,115,22,0.85)' : 'rgba(14,165,233,0.55)'),
            borderColor: stats.byType?.map((t) =>
                drillFilter?.key === 'type' && drillFilter?.value === t._id
                    ? 'rgba(249,115,22,1)' : 'rgba(14,165,233,1)'),
            borderWidth: 2, borderRadius: 6,
        }]
    };

    const monthChartData = {
        labels: stats.byMonth?.map(m => m._id) || [],
        datasets: [{
            label: 'Submissions',
            data: stats.byMonth?.map(m => m.count) || [],
            backgroundColor: 'rgba(168,85,247,0.55)',
            borderColor: 'rgba(168,85,247,1)',
            borderWidth: 2, borderRadius: 6,
        }]
    };

    const barOpts = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { footer: () => '👆 Click to see records' } }
        },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        onHover: (e) => { e.native.target.style.cursor = 'pointer'; },
    };

    const pieOpts = {
        maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { footer: () => '👆 Click to see records' } } },
        onHover: (e) => { e.native.target.style.cursor = 'pointer'; },
    };

    return (
        <Layout>
            <div className="page-title">
                Analytics Dashboard
                <span style={{ fontSize: '0.85rem', fontWeight: 500, marginLeft: '12px', color: '#f4a820' }}>
                    {dept !== 'All' ? `— ${dept} Dept.` : '— All Departments'}
                </span>
            </div>

            {/* ── Summary stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total', value: total, color: '#0ea5e9' },
                    { label: 'Approved', value: approved, color: '#22c55e' },
                    { label: 'Pending', value: pending, color: '#f59e0b' },
                    { label: 'Rejected', value: rejected, color: '#ef4444' },
                ].map(c => (
                    <div key={c.label} className="card" style={{ textAlign: 'center', padding: '18px 12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>{c.label} Achievements</div>
                    </div>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div className="stats-grid">
                <div className="card">
                    <div className="card-title">
                        Status Distribution
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>(click a slice)</span>
                    </div>
                    <div style={{ height: '280px' }}>
                        <Pie ref={pieRef} data={statusChartData} options={pieOpts} onClick={onPieClick} />
                    </div>
                </div>
                <div className="card">
                    <div className="card-title">
                        Achievements by Type
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '6px' }}>(click a bar)</span>
                    </div>
                    <div style={{ height: '280px' }}>
                        <Bar ref={barRef} data={typeChartData} options={barOpts} onClick={onBarClick} />
                    </div>
                </div>
            </div>

            {/* ── Monthly trend ── */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-title">Monthly Submissions (Last 6 Months)</div>
                <div style={{ height: '240px' }}>
                    <Bar data={monthChartData} options={{ ...barOpts, onHover: undefined }} />
                </div>
            </div>

            {/* ── Drill-down detail panel ── */}
            {drillFilter && (
                <div className="card" style={{ marginTop: '24px', border: '2px solid #f4a820', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div className="card-title" style={{ marginBottom: 0 }}>
                            {drillFilter.key === 'type' ? '📋' : '🔍'}{' '}
                            <strong>{drillFilter.value}</strong> Achievements
                            <span style={{ fontSize: '0.78rem', marginLeft: '10px', color: '#94a3b8', fontWeight: 500 }}>
                                ({drillData.length} record{drillData.length !== 1 ? 's' : ''})
                            </span>
                        </div>
                        <button
                            onClick={() => { setDrillFilter(null); setDrillData([]); }}
                            style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, color: '#ef4444', fontSize: '0.88rem' }}
                        >✕ Close</button>
                    </div>

                    {drillLoading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading...</div>
                    ) : drillData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No achievements found.</div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Roll No.</th>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Proof</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drillData.map(ach => (
                                        <tr key={ach._id}>
                                            <td>
                                                {ach.user ? (
                                                    <span
                                                        style={{ color: '#f97316', fontWeight: 700, cursor: 'pointer' }}
                                                        onClick={() => navigate(`/student-profile/${ach.user.id}`)}
                                                        title="Click to view student profile"
                                                    >
                                                        {ach.user.name}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontStyle: 'italic' }}>⚠ Deleted</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                {ach.user?.studentProfile?.rollNumber || '—'}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{ach.title}</td>
                                            <td>
                                                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    {ach.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${ach.status}`}>{ach.status}</span>
                                            </td>
                                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                                {new Date(ach.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                            <td>
                                                {ach.proofUrl
                                                    ? <a href={ach.proofUrl} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', fontWeight: 600 }}>View →</a>
                                                    : <span style={{ color: '#94a3b8' }}>—</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default Analytics;
