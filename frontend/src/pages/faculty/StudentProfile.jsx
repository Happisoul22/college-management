import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { FaArrowLeft, FaChartLine, FaCalendarCheck, FaTrophy, FaBook } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './StudentProfile.css';

const StudentProfile = () => {
    const { id } = useParams();
    const [student, setStudent] = useState(null);
    const [marks, setMarks] = useState([]);
    const [cgpaData, setCgpaData] = useState(null);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        try {
            // Parallel fetch
            const [stuRes, marksRes, cgpaRes, attRes, achRes] = await Promise.all([
                api.get(`/analytics/department-users?type=Student`).then(r =>
                    r.data.data?.find(u => u._id === id) || null
                ),
                api.get(`/marks?student=${id}`),
                api.get(`/marks/cgpa/${id}`),
                api.get(`/attendance/summary/${id}`),
                api.get(`/achievements?student=${id}`)
            ]);
            setStudent(stuRes);
            setMarks(marksRes.data.data || []);
            setCgpaData(cgpaRes.data.data || null);
            setAttendanceSummary(attRes.data.data || null);
            setAchievements(achRes.data.data || []);
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
        { id: 'attendance', label: 'Attendance', icon: <FaCalendarCheck /> },
        { id: 'achievements', label: 'Achievements', icon: <FaTrophy /> },
    ];

    // Group marks by semester
    const marksBySem = {};
    marks.forEach(m => {
        const sem = m.semester;
        if (!marksBySem[sem]) marksBySem[sem] = [];
        marksBySem[sem].push(m);
    });

    return (
        <Layout>
            <Link to="/my-students" className="sp-back-link"><FaArrowLeft /> Back to My Students</Link>

            {/* Student Info Header */}
            <div className="sp-header-card">
                <div className="sp-avatar">
                    {student?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="sp-header-info">
                    <h2 className="sp-name">{student?.name || 'Student'}</h2>
                    <div className="sp-meta">
                        <span>{student?.email}</span>
                        <span>Roll: {student?.studentProfile?.rollNumber || '—'}</span>
                        <span>Section: {student?.studentProfile?.section || '—'}</span>
                        <span>Year: {student?.currentYear || (student?.studentProfile?.admissionYear ? `${new Date().getFullYear() - student.studentProfile.admissionYear + (new Date().getMonth() >= 6 ? 1 : 0)}` : '—')}</span>
                    </div>
                </div>
                {/* CGPA Badge */}
                <div className="sp-cgpa-badge">
                    <div className="sp-cgpa-value">{cgpaData?.cgpa?.toFixed(2) || '0.00'}</div>
                    <div className="sp-cgpa-label">CGPA</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sp-tabs">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        className={`sp-tab ${activeTab === t.id ? 'sp-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="sp-tab-content">
                    <div className="sp-overview-grid">
                        <div className="sp-o-card sp-o--attendance">
                            <div className="sp-o-icon"><FaCalendarCheck /></div>
                            <div className="sp-o-value">{attendanceSummary?.overall?.percentage || 0}%</div>
                            <div className="sp-o-label">Overall Attendance</div>
                        </div>
                        <div className="sp-o-card sp-o--achievements">
                            <div className="sp-o-icon"><FaTrophy /></div>
                            <div className="sp-o-value">{achievements.length}</div>
                            <div className="sp-o-label">Achievements</div>
                        </div>
                        <div className="sp-o-card sp-o--subjects">
                            <div className="sp-o-icon"><FaBook /></div>
                            <div className="sp-o-value">{marks.length}</div>
                            <div className="sp-o-label">Subjects</div>
                        </div>
                        <div className="sp-o-card sp-o--cgpa">
                            <div className="sp-o-icon"><FaChartLine /></div>
                            <div className="sp-o-value">{cgpaData?.cgpa?.toFixed(2) || '0.00'}</div>
                            <div className="sp-o-label">CGPA</div>
                        </div>
                    </div>

                    {/* SGPA per semester */}
                    {cgpaData?.sgpa && Object.keys(cgpaData.sgpa).length > 0 && (
                        <div className="card sp-sgpa-card">
                            <div className="card-title">Semester-wise GPA</div>
                            <div className="sp-sgpa-grid">
                                {Object.entries(cgpaData.sgpa).sort().map(([sem, gpa]) => (
                                    <div key={sem} className="sp-sgpa-item">
                                        <div className="sp-sgpa-sem">Sem {sem}</div>
                                        <div className="sp-sgpa-bar">
                                            <div className="sp-sgpa-fill" style={{ width: `${(gpa / 10) * 100}%` }}></div>
                                        </div>
                                        <div className="sp-sgpa-val">{gpa}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Marks Tab */}
            {activeTab === 'marks' && (
                <div className="sp-tab-content">
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
                                                <tr key={m._id}>
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

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
                <div className="sp-tab-content">
                    {!attendanceSummary?.subjects?.length ? (
                        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No attendance data available.</div>
                    ) : (
                        <div className="card">
                            <div className="card-title">Subject-wise Attendance</div>
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
                                                        <div className="sp-att-pct-fill" style={{ width: `${s.percentage}%`, background: s.percentage >= 75 ? '#16a34a' : s.percentage >= 60 ? '#ca8a04' : '#ef4444' }}></div>
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
                    )}
                </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
                <div className="sp-tab-content">
                    {achievements.length === 0 ? (
                        <div className="card" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No achievements found.</div>
                    ) : (
                        <div className="card">
                            <div className="card-title">Achievements ({achievements.length})</div>
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
                                        {achievements.map(a => (
                                            <tr key={a._id}>
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
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
};

export default StudentProfile;
