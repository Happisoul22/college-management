import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import {
    FaArrowLeft, FaChartLine, FaCalendarCheck, FaTrophy, FaBook
} from 'react-icons/fa';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import './StudentProfile.css';

const COLORS = ['#6366f1', '#e05c1a', '#10b981', '#f59e0b', '#0d2b5e', '#ec4899', '#14b8a6', '#8b5cf6'];

const computeSemester = (admissionYear) => {
    if (!admissionYear) return 1;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const yearDiff = currentYear - admissionYear;
    const sem = currentMonth >= 7 ? (yearDiff * 2) + 1 : (yearDiff * 2);
    return Math.max(sem, 1);
};

const computeYear = (admissionYear) => {
    if (!admissionYear) return '—';
    const now = new Date();
    const month = now.getMonth() + 1;
    const yearDiff = now.getFullYear() - admissionYear;
    return Math.max(1, Math.min(4, month >= 7 ? yearDiff + 1 : yearDiff));
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0d2b5e', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: '0.82rem' }}>
            <strong style={{ color: '#f4a820' }}>{label}</strong>
            {payload.map((p, i) => (
                <div key={i}>{p.name}: <strong>{p.value}</strong></div>
            ))}
        </div>
    );
};

const StudentProfile = () => {
    const { id } = useParams();
    const [student, setStudent] = useState(null);
    const [marks, setMarks] = useState([]);
    const [cgpaData, setCgpaData] = useState(null);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [enrolledSubjects, setEnrolledSubjects] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [achievementFilter, setAchievementFilter] = useState('All');

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        try {
            const [stuRes, marksRes, cgpaRes, achRes] = await Promise.all([
                api.get(`/analytics/user/${id}`).then(r => r.data.data).catch(() => null),
                api.get(`/marks?student=${id}`),
                api.get(`/marks/cgpa/${id}`),
                api.get(`/achievements?studentId=${id}`)
            ]);
            
            const fetchedStudent = stuRes;
            setStudent(fetchedStudent);
            setMarks(marksRes?.data?.data || []);
            setCgpaData(cgpaRes?.data?.data || null);
            setAttendanceSummary(null);
            setAchievements(achRes?.data?.data || []);

            // Fetch enrolled subjects based on student details
            if (fetchedStudent?.studentProfile) {
                const sem = computeSemester(fetchedStudent.studentProfile.admissionYear);
                const branch = fetchedStudent.studentProfile.branch;
                let deptCode = branch;
                if (branch === 'Computer Science and Engineering') deptCode = 'CSE';
                else if (branch === 'Electronics and Communication Engineering') deptCode = 'ECE';
                else if (branch === 'Mechanical Engineering') deptCode = 'ME';
                else if (branch === 'Civil Engineering') deptCode = 'CE';
                else if (branch === 'Electrical and Electronics Engineering') deptCode = 'EEE';

                const subjectsRes = await api.get(`/subjects?department=${deptCode}&semester=${sem}`).catch(() => ({ data: { data: [] } }));
                setEnrolledSubjects(subjectsRes.data?.data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading student profile...</div></Layout>;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
        { id: 'marks', label: 'Marks', icon: <FaBook /> },
        { id: 'achievements', label: 'Achievements', icon: <FaTrophy /> },
    ];

    // ── Data derivations ──────────────────────────────────────────
    const marksBySem = {};
    marks.forEach(m => {
        const sem = m.semester;
        if (!marksBySem[sem]) marksBySem[sem] = [];
        marksBySem[sem].push(m);
    });

    // SGPA bar chart data
    const sgpaData = cgpaData?.sgpa
        ? Object.entries(cgpaData.sgpa).sort().map(([sem, gpa]) => ({ sem: `Sem ${sem}`, gpa: parseFloat(gpa) }))
        : [];

    // Marks bar chart (all subjects, current view = total marks per subject)
    const marksChartData = marks.map(m => ({
        name: m.subject?.code || 'Sub',
        Total: m.totalMarks || 0,
        Internal: m.internalTotal || 0,
        External: m.externalTotal || 0
    }));

    // Attendance bar chart per subject
    const attChartData = (attendanceSummary?.subjects || []).map(s => ({
        name: s.subjectCode || s.subject?.slice(0, 8),
        Percentage: s.percentage,
        Present: s.present,
        Absent: s.absent
    }));

    // Achievements pie
    const achTypeMap = {};
    achievements.forEach(a => { achTypeMap[a.type] = (achTypeMap[a.type] || 0) + 1; });
    const achPieData = Object.entries(achTypeMap).map(([name, value]) => ({ name, value }));

    const uniqueAchievementTypes = Object.keys(achTypeMap).sort();

    // Achievement status bar
    const achStatusData = [
        { status: 'Approved', count: achievements.filter(a => a.status === 'Approved').length },
        { status: 'Pending', count: achievements.filter(a => a.status === 'Pending').length },
        { status: 'Rejected', count: achievements.filter(a => a.status === 'Rejected').length },
    ];

    const filteredAchievements = achievementFilter === 'All' 
        ? achievements 
        : achievements.filter(a => a.type === achievementFilter);

    return (
        <Layout>
            <Link to="/my-students" className="sp-back-link"><FaArrowLeft /> Back to My Students</Link>

            {/* ── Student Header ── */}
            <div className="sp-header-card">
                <div className="sp-avatar">{student?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div className="sp-header-info">
                    <h2 className="sp-name">{student?.name || 'Student'}</h2>
                    <div className="sp-meta">
                        <span>{student?.email}</span>
                        <span>Roll: {student?.studentProfile?.rollNumber || '—'}</span>
                        <span>Section: {student?.studentProfile?.section || '—'}</span>
                        <span>Year: {computeYear(student?.studentProfile?.admissionYear)}</span>
                    </div>
                </div>
                <div className="sp-cgpa-badge">
                    <div className="sp-cgpa-value">{cgpaData?.cgpa?.toFixed(2) || '0.00'}</div>
                    <div className="sp-cgpa-label">CGPA</div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="sp-tabs">
                {tabs.map(t => (
                    <button key={t.id}
                        className={`sp-tab ${activeTab === t.id ? 'sp-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════ OVERVIEW ══════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="sp-tab-content">
                    {/* Stat cards */}
                    <div className="sp-overview-grid">
                        <div className="sp-o-card sp-o--attendance" style={{display: 'none'}}>
                            <div className="sp-o-icon"><FaCalendarCheck /></div>
                            <div className="sp-o-value">0%</div>
                            <div className="sp-o-label">Overall Attendance</div>
                        </div>
                        <div className="sp-o-card sp-o--achievements">
                            <div className="sp-o-icon"><FaTrophy /></div>
                            <div className="sp-o-value">{achievements.length}</div>
                            <div className="sp-o-label">Achievements</div>
                        </div>
                        <div className="sp-o-card sp-o--subjects">
                            <div className="sp-o-icon"><FaBook /></div>
                            <div className="sp-o-value">{enrolledSubjects.length}</div>
                            <div className="sp-o-label">Subjects</div>
                        </div>
                        <div className="sp-o-card sp-o--cgpa">
                            <div className="sp-o-icon"><FaChartLine /></div>
                            <div className="sp-o-value">{cgpaData?.cgpa?.toFixed(2) || '0.00'}</div>
                            <div className="sp-o-label">CGPA</div>
                        </div>
                    </div>

                    {/* SGPA Chart */}
                    {sgpaData.length > 0 && (
                        <div className="card sp-chart-card">
                            <div className="card-title">📈 Semester GPA Progress</div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={sgpaData} barSize={36}
                                    margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="sem" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis domain={[0, 10]} allowDecimals tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="gpa" radius={[8, 8, 0, 0]} name="SGPA">
                                        {sgpaData.map((entry, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Overview charts row */}
                    {(attChartData.length > 0 || achPieData.length > 0) && (
                        <div className="sp-charts-row">
                            {attChartData.length > 0 && (
                                <div className="card sp-chart-card">
                                    <div className="card-title">📅 Attendance Overview</div>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={attChartData} barSize={22}
                                            margin={{ top: 6, right: 12, left: -14, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                            <Bar dataKey="Percentage" radius={[6, 6, 0, 0]} name="Attendance %">
                                                {attChartData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.Percentage >= 75 ? '#16a34a' : entry.Percentage >= 60 ? '#ca8a04' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {achPieData.length > 0 && (
                                <div className="card sp-chart-card">
                                    <div className="card-title">🏆 Achievements by Type</div>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={achPieData} dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" outerRadius={74} innerRadius={30}
                                                paddingAngle={3}
                                                label={({ percent }) => percent > 0.08 ? `${Math.round(percent * 100)}%` : ''}
                                                labelLine={false}>
                                                {achPieData.map((entry, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v + ' achievement' + (v !== 1 ? 's' : ''), n]} />
                                            <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.72rem', paddingTop: 6 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════ MARKS ═══════════════════════════ */}
            {activeTab === 'marks' && (
                <div className="sp-tab-content">
                    {/* Marks Bar Chart */}
                    {marksChartData.length > 0 && (
                        <div className="card sp-chart-card" style={{ marginBottom: 20 }}>
                            <div className="card-title">📊 Marks Overview (All Subjects)</div>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 8px' }}>Internal vs External vs Total across all subjects</p>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={marksChartData} barSize={14}
                                    margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Internal" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="External" fill="#e05c1a" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Total" fill="#0d2b5e" radius={[4, 4, 0, 0]} />
                                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '0.75rem', paddingTop: 6 }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Marks Table per semester */}
                    {Object.keys(marksBySem).length === 0 ? (
                        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No marks data available.</div>
                    ) : (
                        Object.entries(marksBySem).sort().map(([sem, semMarks]) => (
                            <div key={sem} className="card sp-sem-card">
                                <div className="card-title">Semester {sem}</div>
                                <div className="table-container">
                                    <table className="table sp-marks-table">
                                        <thead>
                                            <tr>
                                                <th>Subject</th>
                                                <th>Mid-1</th>
                                                <th>Mid-2</th>
                                                <th>Assignments</th>
                                                <th>Internal Total</th>
                                                <th>External</th>
                                                <th>Total</th>
                                                <th>Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {semMarks.map(m => (
                                                <tr key={m.id}>
                                                    <td><strong>{m.subject?.code}</strong> — {m.subject?.name}</td>
                                                    <td>{m.internal?.mid1 || 0}</td>
                                                    <td>{m.internal?.mid2 || 0}</td>
                                                    <td>{m.internal?.assignments || 0}</td>
                                                    <td><strong>{m.internalTotal}</strong></td>
                                                    <td>{m.externalTotal}</td>
                                                    <td className="sp-total">{m.totalMarks}</td>
                                                    <td><span className={`sp-grade sp-grade--${m.grade?.replace('+', 'plus')}`}>{m.grade}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ═══════════════════════ ATTENDANCE ══════════════════════ */}
            {activeTab === 'attendance' && (
                <div className="sp-tab-content">
                    {!attendanceSummary?.subjects?.length ? (
                        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No attendance data available.</div>
                    ) : (
                        <>
                            {/* Attendance Charts Row */}
                            <div className="sp-charts-row">
                                {/* Bar Chart */}
                                <div className="card sp-chart-card">
                                    <div className="card-title">📊 Subject-wise Attendance %</div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={attChartData} barSize={26}
                                            margin={{ top: 10, right: 12, left: -10, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                            <Bar dataKey="Percentage" radius={[6, 6, 0, 0]} name="Attendance %">
                                                {attChartData.map((e, i) => (
                                                    <Cell key={i} fill={e.Percentage >= 75 ? '#16a34a' : e.Percentage >= 60 ? '#ca8a04' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', justifyContent: 'center', padding: '4px 0 8px' }}>
                                        <span style={{ color: '#16a34a', fontWeight: 700 }}>● ≥75% Good</span>
                                        <span style={{ color: '#ca8a04', fontWeight: 700 }}>● 60-74% Warning</span>
                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>● &lt;60% Critical</span>
                                    </div>
                                </div>

                                {/* Present vs Absent Pie */}
                                <div className="card sp-chart-card">
                                    <div className="card-title">🥧 Present vs Absent (Overall)</div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Present', value: attendanceSummary.overall.totalPresent },
                                                    { name: 'Absent', value: attendanceSummary.overall.totalClasses - attendanceSummary.overall.totalPresent }
                                                ]}
                                                dataKey="value" nameKey="name"
                                                cx="50%" cy="50%" outerRadius={80} innerRadius={38}
                                                paddingAngle={4}
                                                label={({ percent }) => `${Math.round(percent * 100)}%`}
                                                labelLine={false}>
                                                <Cell fill="#16a34a" />
                                                <Cell fill="#ef4444" />
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v + ' classes', n]} />
                                            <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <div className="card">
                                <div className="card-title">Subject-wise Attendance Details</div>
                                <div className="table-container">
                                    <table className="table sp-att-table">
                                        <thead>
                                            <tr>
                                                <th>Subject</th>
                                                <th>Total Classes</th>
                                                <th>Present</th>
                                                <th>Absent</th>
                                                <th>Percentage</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendanceSummary.subjects.map((s, i) => (
                                                <tr key={i}>
                                                    <td><strong>{s.subjectCode}</strong> — {s.subject}</td>
                                                    <td>{s.total}</td>
                                                    <td>{s.present}</td>
                                                    <td>{s.absent}</td>
                                                    <td>
                                                        <div className="sp-att-pct-bar">
                                                            <div className="sp-att-pct-fill" style={{ width: `${s.percentage}%`, background: s.percentage >= 75 ? '#16a34a' : s.percentage >= 60 ? '#ca8a04' : '#ef4444' }} />
                                                        </div>
                                                        <span className={`sp-att-pct-val ${s.percentage < 75 ? 'sp-att-low' : ''}`}>{s.percentage}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="sp-att-total-row">
                                                <td><strong>Overall</strong></td>
                                                <td>{attendanceSummary.overall.totalClasses}</td>
                                                <td>{attendanceSummary.overall.totalPresent}</td>
                                                <td>{attendanceSummary.overall.totalClasses - attendanceSummary.overall.totalPresent}</td>
                                                <td><strong>{attendanceSummary.overall.percentage}%</strong></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════════════ ACHIEVEMENTS ════════════════════ */}
            {activeTab === 'achievements' && (
                <div className="sp-tab-content">
                    {achievements.length === 0 ? (
                        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No achievements found.</div>
                    ) : (
                        <>
                            {/* Charts row */}
                            <div className="sp-charts-row">
                                {/* Pie by type */}
                                {achPieData.length > 0 && (
                                    <div className="card sp-chart-card">
                                        <div className="card-title">🏆 Achievements by Type</div>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie data={achPieData} dataKey="value" nameKey="name"
                                                    cx="50%" cy="50%" outerRadius={78} innerRadius={32}
                                                    paddingAngle={3}
                                                    label={({ percent }) => percent > 0.07 ? `${Math.round(percent * 100)}%` : ''}
                                                    labelLine={false}>
                                                    {achPieData.map((entry, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v, n) => [v, n]} />
                                                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '0.72rem', paddingTop: 6 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Status bar */}
                                <div className="card sp-chart-card">
                                    <div className="card-title">✅ Achievement Status</div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={achStatusData} barSize={42}
                                            margin={{ top: 10, right: 16, left: -10, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="status" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Count">
                                                <Cell fill="#22c55e" />
                                                <Cell fill="#f59e0b" />
                                                <Cell fill="#ef4444" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Achievements Table */}
                            <div className="card">
                                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Achievements ({filteredAchievements.length})</span>
                                    <select 
                                        value={achievementFilter} 
                                        onChange={(e) => setAchievementFilter(e.target.value)}
                                        className="form-control"
                                        style={{ width: 'auto', padding: '4px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="All">All Types</option>
                                        {uniqueAchievementTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="table-container">
                                    <table className="table sp-ach-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Certificate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAchievements.map(a => (
                                                <tr key={a.id}>
                                                    <td><strong>{a.title}</strong></td>
                                                    <td>{a.type}</td>
                                                    <td><span className={`status-badge status-${a.status}`}>{a.status}</span></td>
                                                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        {a.proofUrl ? (
                                                            <a href={a.proofUrl} target="_blank" rel="noreferrer" className="ms-view-btn">
                                                                View Certificate
                                                            </a>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredAchievements.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                        No achievements of this type found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default StudentProfile;
