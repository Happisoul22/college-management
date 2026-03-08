import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    FaUsers, FaSearch, FaFilter, FaUserGraduate,
    FaChartBar, FaCalendarCheck, FaTrophy
} from 'react-icons/fa';
import './CounsellorDashboard.css';

const COLORS = ['#6366f1', '#e05c1a', '#10b981', '#f59e0b', '#0d2b5e', '#ec4899', '#14b8a6', '#8b5cf6'];

const computeYear = (admissionYear) => {
    if (!admissionYear) return '—';
    const now = new Date();
    const month = now.getMonth() + 1;
    const yearDiff = now.getFullYear() - admissionYear;
    return Math.max(1, Math.min(4, month >= 7 ? yearDiff + 1 : yearDiff));
};

const CounsellorDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);   // flat list across all assignments
    const [loading, setLoading] = useState(true);

    // filters
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [filterBranch, setFilterBranch] = useState('All');

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        try {
            const res = await api.get('/assignments/counsellor/my');
            // Flatten all students from all assignments
            const all = [];
            (res.data.data || []).forEach(assignment => {
                (assignment.students || []).forEach(s => {
                    if (!all.find(x => x.id === s.id)) all.push(s);
                });
            });
            setStudents(all);
        } catch (err) {
            toast.error('Failed to load your counsellee students');
        } finally {
            setLoading(false);
        }
    };

    // Derive unique filter options
    const years = ['All', 1, 2, 3, 4];
    const sections = ['All', ...new Set(students.map(s => s.studentProfile?.section).filter(Boolean))].sort();
    const branches = ['All', ...new Set(students.map(s => s.studentProfile?.branch).filter(Boolean))].sort();

    // Apply filters
    const filtered = students.filter(s => {
        const yr = computeYear(s.studentProfile?.admissionYear);
        const sec = s.studentProfile?.section;
        const br = s.studentProfile?.branch;
        const nameMatch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.studentProfile?.rollNumber?.toLowerCase().includes(search.toLowerCase());
        return (
            (search === '' || nameMatch) &&
            (filterYear === 'All' || String(yr) === String(filterYear)) &&
            (filterSection === 'All' || sec === filterSection) &&
            (filterBranch === 'All' || br === filterBranch)
        );
    });

    // Chart data: students by year
    const yearMap = {};
    students.forEach(s => {
        const yr = `Year ${computeYear(s.studentProfile?.admissionYear)}`;
        yearMap[yr] = (yearMap[yr] || 0) + 1;
    });
    const yearChartData = Object.entries(yearMap).sort().map(([name, value]) => ({ name, value }));

    // Chart data: by branch
    const branchMap = {};
    students.forEach(s => {
        const br = s.studentProfile?.branch || 'Unknown';
        branchMap[br] = (branchMap[br] || 0) + 1;
    });
    const branchPieData = Object.entries(branchMap).map(([name, value]) => ({ name, value }));

    if (loading) return (
        <Layout>
            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                Loading your counsellee students...
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="page-title">🤝 Counsellor Dashboard</div>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: '0.9rem' }}>
                Welcome, <strong>{user?.name}</strong> — manage and track your assigned students' performance.
            </p>

            {/* ── Summary stats ── */}
            <div className="cd-stat-grid">
                <div className="cd-stat-card cd-stat--total">
                    <div className="cd-stat-icon"><FaUsers /></div>
                    <div className="cd-stat-value">{students.length}</div>
                    <div className="cd-stat-label">Total Students</div>
                </div>
                <div className="cd-stat-card cd-stat--filtered">
                    <div className="cd-stat-icon"><FaFilter /></div>
                    <div className="cd-stat-value">{filtered.length}</div>
                    <div className="cd-stat-label">Showing (filtered)</div>
                </div>
                <div className="cd-stat-card cd-stat--branches">
                    <div className="cd-stat-icon"><FaChartBar /></div>
                    <div className="cd-stat-value">{branches.length - 1 || 0}</div>
                    <div className="cd-stat-label">Branches</div>
                </div>
                <div className="cd-stat-card cd-stat--sections">
                    <div className="cd-stat-icon"><FaUserGraduate /></div>
                    <div className="cd-stat-value">{sections.length - 1 || 0}</div>
                    <div className="cd-stat-label">Sections</div>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                    <FaUsers style={{ fontSize: '2.5rem', color: '#dde3f0', marginBottom: 12 }} />
                    <h3 style={{ color: '#1a2744', marginBottom: 8 }}>No Students Assigned</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        The HOD has not assigned any counsellee students to you yet.
                    </p>
                </div>
            ) : (
                <>
                    {/* ── Charts ── */}
                    <div className="cd-charts-row">
                        <div className="card cd-chart-card">
                            <div className="card-title">📊 Students by Year</div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={yearChartData} barSize={38}
                                    margin={{ top: 8, right: 12, left: -14, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: '#0d2b5e', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.8rem' }} labelStyle={{ color: '#f4a820' }} itemStyle={{ color: '#fff' }} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="value" radius={[7, 7, 0, 0]} name="Students">
                                        {yearChartData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {branchPieData.length > 0 && (
                            <div className="card cd-chart-card">
                                <div className="card-title">🥧 Students by Branch</div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={branchPieData} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" outerRadius={68} innerRadius={28}
                                            paddingAngle={3}
                                            label={({ percent }) => percent > 0.08 ? `${Math.round(percent * 100)}%` : ''}
                                            labelLine={false}>
                                            {branchPieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [v + ' students', n]} />
                                        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.72rem' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* ── Filter Bar ── */}
                    <div className="card cd-filter-bar">
                        <div className="cd-search-wrap">
                            <FaSearch className="cd-search-icon" />
                            <input
                                type="text"
                                className="form-control cd-search-input"
                                placeholder="Search by name or roll number..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="form-control cd-filter-select">
                            {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : `Year ${y}`}</option>)}
                        </select>
                        <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className="form-control cd-filter-select">
                            {sections.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>)}
                        </select>
                        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="form-control cd-filter-select">
                            {branches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
                        </select>
                        {(search || filterYear !== 'All' || filterSection !== 'All' || filterBranch !== 'All') && (
                            <button className="btn" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #dde3f0', fontSize: '0.8rem' }}
                                onClick={() => { setSearch(''); setFilterYear('All'); setFilterSection('All'); setFilterBranch('All'); }}>
                                Clear
                            </button>
                        )}
                    </div>

                    {/* ── Student Cards / Table ── */}
                    <div className="card">
                        <div className="card-title">
                            My Students
                            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#64748b', marginLeft: 10 }}>
                                {filtered.length} of {students.length} shown — click a student to view full performance
                            </span>
                        </div>
                        <div className="cd-student-grid">
                            {filtered.length > 0 ? filtered.map(s => {
                                const yr = computeYear(s.studentProfile?.admissionYear);
                                return (
                                    <div key={s.id} className="cd-student-card"
                                        onClick={() => navigate(`/student-profile/${s.id}`)}>
                                        <div className="cd-stu-avatar">
                                            {s.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="cd-stu-info">
                                            <div className="cd-stu-name">{s.name}</div>
                                            <div className="cd-stu-meta">
                                                <span className="cd-stu-roll">{s.studentProfile?.rollNumber || '—'}</span>
                                                <span className="cd-stu-chip">{s.studentProfile?.branch || '—'}</span>
                                            </div>
                                            <div className="cd-stu-badges">
                                                <span className="cd-badge cd-badge--year">Year {yr}</span>
                                                {s.studentProfile?.section && (
                                                    <span className="cd-badge cd-badge--section">Sec {s.studentProfile.section}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="cd-stu-arrow">→</div>
                                    </div>
                                );
                            }) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                    No students match the current filters.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </Layout>
    );
};

export default CounsellorDashboard;
