import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaCheck, FaTimes, FaSearch, FaFilePdf, FaUserGraduate, FaChalkboardTeacher, FaTrophy, FaClock, FaArrowLeft, FaBan, FaHourglassHalf, FaPhone, FaEnvelope, FaUserTie, FaClipboardList } from 'react-icons/fa';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';
import { toast } from 'react-toastify';
import './FacultyDashboard.css';

const STATUS_COLORS = {
    Approved: '#22c55e',
    Pending: '#f59e0b',
    Rejected: '#ef4444',
};

const TYPE_COLORS = [
    '#e05c1a', '#0d2b5e', '#f4a820', '#10b981', '#6366f1',
    '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4',
];

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

const FacultyDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const isHOD = user?.role === 'HOD' || user?.role === 'Principal' || user?.role === 'Admin';

    const [achievements, setAchievements] = useState([]);
    const [myAchievements, setMyAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [myLoading, setMyLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        year: '',
        type: '',
        student: '',
    });
    const [achTab, setAchTab] = useState('student'); // 'student' | 'faculty'

    // Report generation state
    const [reportBranch, setReportBranch] = useState('CSE');
    const [reportYear, setReportYear] = useState('2023');
    const [reportLoading, setReportLoading] = useState(false);

    // HOD-specific state
    const [deptStats, setDeptStats] = useState({ studentCount: 0, facultyCount: 0, department: '' });
    const [activeView, setActiveView] = useState(null); // null | 'students' | 'faculty'
    const [userList, setUserList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    
    // Available academic years for the report
    const [availableYears, setAvailableYears] = useState(['2023']);

    // Student list filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterSection, setFilterSection] = useState('');

    // Derive unique admission years & sections from fetched data
    const admissionYears = [...new Set(userList.map(u => u.studentProfile?.admissionYear).filter(Boolean))].sort();
    const sections = [...new Set(userList.map(u => u.studentProfile?.section).filter(Boolean))].sort();

    // Filtered student list
    const filteredUserList = activeView === 'students'
        ? userList.filter(u => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term
                || u.name?.toLowerCase().includes(term)
                || u.studentProfile?.rollNumber?.toLowerCase().includes(term)
                || u.email?.toLowerCase().includes(term);
            const matchesYear = !filterYear || String(u.studentProfile?.admissionYear) === filterYear;
            const matchesSection = !filterSection || u.studentProfile?.section === filterSection;
            return matchesSearch && matchesYear && matchesSection;
        })
        : userList;

    useEffect(() => {
        fetchMyAchievements();
        fetchAchievements();
        fetchDynamicYears();
        if (isHOD) fetchDeptStats();
    }, [filters, achTab]);

    const fetchMyAchievements = async () => {
        try {
            const res = await api.get('/achievements?me=true');
            setMyAchievements(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setMyLoading(false);
        }
    };

    const fetchDeptStats = async () => {
        try {
            const res = await api.get('/analytics/department-users');
            setDeptStats(res.data.data);
        } catch (err) {
            console.error('Dept stats error:', err);
        }
    };

    // Calculate academic year from admissionYear (year starts in July)
    const getYearFromAdmission = (admissionYear) => {
        if (!admissionYear) return null;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const yearDiff = currentMonth >= 7
            ? currentYear - admissionYear + 1
            : currentYear - admissionYear;
        return Math.min(Math.max(yearDiff, 1), 4);
    };

    const fetchDynamicYears = async () => {
        try {
            const endpoint = isHOD ? '/analytics/department-users?type=Student' : '/assignments/class/my';
            const res = await api.get(endpoint);
            const data = res.data.data || [];
            
            if (isHOD) {
                // Determine actual calendar years from student admission years
                const years = [...new Set(data.map(u => u.studentProfile?.admissionYear).filter(Boolean))].sort((a,b) => a-b);
                if (years.length) setAvailableYears(years.map(String));
            } else {
                // Standard faculty / ClassTeacher derives calendar years from their assigned classes
                // Example: Currently it's 2024. If assigned to year 2, admission was 2023 (or 2022 if before July).
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1; // 1-12
                
                const years = [...new Set(data.map(a => {
                    const assignedYearLevel = Number(a.year);
                    if (!assignedYearLevel) return null;
                    return currentMonth >= 7
                        ? currentYear - assignedYearLevel + 1
                        : currentYear - assignedYearLevel;
                }).filter(Boolean))].sort((a,b) => a-b);
                
                if (years.length) setAvailableYears(years.map(String));
            }
        } catch (err) {
            console.error('Error fetching dynamic years for report:', err);
        }
    };

    const fetchUserList = async (type) => {
        if (activeView === type) {
            setActiveView(null);
            setUserList([]);
            return;
        }
        setListLoading(true);
        setActiveView(type);
        try {
            const res = await api.get(`/analytics/department-users?type=${type === 'students' ? 'Student' : 'Faculty'}`);
            setUserList(res.data.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load user list');
        } finally {
            setListLoading(false);
        }
    };

    const fetchAchievements = async () => {
        try {
            const params = new URLSearchParams(filters);
            params.set('ownerRole', achTab === 'student' ? 'Student' : 'Faculty');
            const res = await api.get(`/achievements?${params.toString()}`);
            setAchievements(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            if (err.response?.status === 401) toast.error('Session expired');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/achievements/${id}`, { status });
            toast.success(`Achievement ${status}`);
            fetchAchievements();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        try {
            const res = await api.get('/reports/class', {
                params: { branch: reportBranch, year: reportYear },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `class-report-${reportBranch}-${reportYear}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Class report downloaded!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to generate report');
        } finally {
            setReportLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const pendingCount = achievements.filter(a => a.status === 'Pending').length;

    /* ── Derived analytics for MY achievements ── */
    const myTotal = myAchievements.length;
    const myApproved = myAchievements.filter(a => a.status === 'Approved').length;
    const myPending = myAchievements.filter(a => a.status === 'Pending').length;
    const myRejected = myAchievements.filter(a => a.status === 'Rejected').length;

    const statusData = [
        { name: 'Approved', value: myApproved },
        { name: 'Pending', value: myPending },
        { name: 'Rejected', value: myRejected },
    ].filter(d => d.value > 0);

    const typeMap = {};
    myAchievements.forEach(a => { typeMap[a.type] = (typeMap[a.type] || 0) + 1; });
    const typeData = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyMap[key] = 0;
    }
    myAchievements.forEach(a => {
        const d = new Date(a.createdAt);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        if (key in monthlyMap) monthlyMap[key]++;
    });
    const trendData = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

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
            <div className="page-title">
                {isHOD ? 'HOD Dashboard' : 'Faculty Dashboard'}
            </div>

            {/* ══════ FACULTY PROFILE CARD ══════ */}
            <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #6366f1' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaUserTie color="#6366f1" /> My Profile
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900, flexShrink: 0 }}>
                        {user?.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{user?.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span><FaEnvelope style={{ marginRight: 4 }} />{user?.email}</span>
                            {user?.facultyProfile?.phone && (
                                <span><FaPhone style={{ marginRight: 4 }} />{user.facultyProfile.phone}</span>
                            )}
                            {user?.facultyProfile?.department && (
                                <span style={{ color: '#6366f1', fontWeight: 700 }}>Dept: {user.facultyProfile.department}</span>
                            )}
                            {user?.facultyProfile?.facultyId && (
                                <span style={{ color: '#64748b', fontWeight: 700 }}>ID: {user.facultyProfile.facultyId}</span>
                            )}
                        </div>
                    </div>
                    <span style={{ background: '#eef2ff', color: '#4338ca', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>{user?.role}</span>
                </div>
            </div>

            {/* ══════ MY ACHIEVEMENTS STATS & CHARTS ══════ */}
            <div className="sd-stats-row">
                <StatCard icon={<FaTrophy />} value={myTotal} label="My Total Achievements" color="#e05c1a" />
                <StatCard icon={<FaCheck />} value={myApproved} label="Approved" color="#22c55e" />
                <StatCard icon={<FaHourglassHalf />} value={myPending} label="Pending" color="#f59e0b" />
                <StatCard icon={<FaBan />} value={myRejected} label="Rejected" color="#ef4444" />
            </div>

            {myTotal > 0 ? (
                <div className="sd-charts-row" style={{ marginTop: '16px', marginBottom: '24px' }}>
                    <div className="card sd-chart-card">
                        <div className="card-title">My Achievement Status</div>
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

                    {typeData.length > 0 && (
                        <div className="card sd-chart-card">
                            <div className="card-title">My Achievements by Type</div>
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
            ) : !myLoading && (
                <div className="sd-empty-analytics" style={{ marginBottom: '24px' }}>
                    <FaClipboardList size={36} />
                    <p>No achievements yet — add your first one to see analytics!</p>
                </div>
            )}

            {/* ══════ HOD STAT CARDS (IF HOD) ══════ */}
            {isHOD && (
                <>
                    {deptStats.department && (
                        <div className="hod-dept-banner">
                            <span className="hod-dept-label">Department</span>
                            <span className="hod-dept-name">{deptStats.department}</span>
                        </div>
                    )}

                    <div className="hod-stats-row">
                        <button
                            className={`hod-stat-card hod-stat--students ${activeView === 'students' ? 'hod-stat--active' : ''}`}
                            onClick={() => fetchUserList('students')}
                            id="hod-students-btn"
                        >
                            <div className="hod-stat-icon hod-icon--students">
                                <FaUserGraduate />
                            </div>
                            <div className="hod-stat-info">
                                <div className="hod-stat-value">{deptStats.studentCount}</div>
                                <div className="hod-stat-label">Total Students</div>
                            </div>
                            <div className="hod-stat-action">View All →</div>
                        </button>

                        <button
                            className={`hod-stat-card hod-stat--faculty ${activeView === 'faculty' ? 'hod-stat--active' : ''}`}
                            onClick={() => fetchUserList('faculty')}
                            id="hod-faculty-btn"
                        >
                            <div className="hod-stat-icon hod-icon--faculty">
                                <FaChalkboardTeacher />
                            </div>
                            <div className="hod-stat-info">
                                <div className="hod-stat-value">{deptStats.facultyCount}</div>
                                <div className="hod-stat-label">Total Faculty</div>
                            </div>
                            <div className="hod-stat-action">View All →</div>
                        </button>

                        <div className="hod-stat-card hod-stat--achievements">
                            <div className="hod-stat-icon hod-icon--achievements">
                                <FaTrophy />
                            </div>
                            <div className="hod-stat-info">
                                <div className="hod-stat-value">{achievements.length}</div>
                                <div className="hod-stat-label">Total Achievements</div>
                            </div>
                        </div>

                        <div className="hod-stat-card hod-stat--pending">
                            <div className="hod-stat-icon hod-icon--pending">
                                <FaClock />
                            </div>
                            <div className="hod-stat-info">
                                <div className="hod-stat-value">{pendingCount}</div>
                                <div className="hod-stat-label">Pending Approvals</div>
                            </div>
                        </div>
                    </div>

                    {/* ══════ EXPANDED USER LIST ══════ */}
                    {activeView && (
                        <div className="hod-detail-card">
                            <div className="hod-detail-header">
                                <h3 className="hod-detail-title">
                                    {activeView === 'students' ? '🎓 Students' : '👨‍🏫 Faculty'} in {deptStats.department}
                                </h3>
                                <button className="hod-detail-close" onClick={() => { setActiveView(null); setUserList([]); setSearchTerm(''); setFilterYear(''); setFilterSection(''); }}>
                                    <FaArrowLeft /> Back
                                </button>
                            </div>

                            {/* ── Student Filters ── */}
                            {activeView === 'students' && (
                                <div className="hod-filters-bar">
                                    <div className="hod-filter-search">
                                        <FaSearch className="hod-filter-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, roll number, or email..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="hod-filter-input"
                                            id="hod-student-search"
                                        />
                                    </div>
                                    <select
                                        value={filterYear}
                                        onChange={e => setFilterYear(e.target.value)}
                                        className="hod-filter-select"
                                        id="hod-filter-year"
                                    >
                                        <option value="">All Years</option>
                                        {admissionYears.map(y => (
                                            <option key={y} value={String(y)}>{y}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterSection}
                                        onChange={e => setFilterSection(e.target.value)}
                                        className="hod-filter-select"
                                        id="hod-filter-section"
                                    >
                                        <option value="">All Sections</option>
                                        {sections.map(s => (
                                            <option key={s} value={s}>Section {s}</option>
                                        ))}
                                    </select>
                                    <span className="hod-filter-count">
                                        {filteredUserList.length} of {userList.length} students
                                    </span>
                                </div>
                            )}

                            {listLoading ? (
                                <div className="hod-detail-loading">Loading...</div>
                            ) : (activeView === 'students' ? filteredUserList : userList).length === 0 ? (
                                <div className="hod-detail-empty">
                                    {activeView === 'students' && userList.length > 0
                                        ? 'No students match the current filters.'
                                        : `No ${activeView} found in this department.`
                                    }
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="table hod-detail-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                {activeView === 'students' ? (
                                                    <>
                                                        <th>Roll Number</th>
                                                        <th>Section</th>
                                                        <th>Admission Year</th>
                                                        <th>Email</th>
                                                        <th>Phone</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th>Faculty ID</th>
                                                        <th>Role</th>
                                                        <th>Experience</th>
                                                        <th>Email</th>
                                                        <th>Phone</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(activeView === 'students' ? filteredUserList : userList).map((u, i) => (
                                                <tr
                                                    key={u.id}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={activeView === 'faculty' ? () => navigate(`/faculty-profile/${u.id}`) : () => navigate(`/student-profile/${u.id}`)}
                                                    className={activeView === 'faculty' ? 'hod-faculty-row' : 'hod-student-row'}
                                                >
                                                    <td>{i + 1}</td>
                                                    <td><strong style={{ color: 'var(--primary-color, #f97316)', cursor: 'pointer' }}>{u.name}</strong></td>
                                                    {activeView === 'students' ? (
                                                        <>
                                                            <td>{u.studentProfile?.rollNumber || '—'}</td>
                                                            <td>{u.studentProfile?.section || '—'}</td>
                                                            <td>{u.studentProfile?.admissionYear || '—'}</td>
                                                            <td>{u.email}</td>
                                                            <td>{u.studentProfile?.phone || '—'}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>{u.facultyProfile?.facultyId || '—'}</td>
                                                            <td>
                                                                <span className={`hod-role-badge hod-role--${u.role?.toLowerCase()}`}>
                                                                    {u.role}
                                                                </span>
                                                            </td>
                                                            <td>{u.facultyProfile?.experience ? `${u.facultyProfile.experience} yrs` : '—'}</td>
                                                            <td>{u.email}</td>
                                                            <td>{u.facultyProfile?.phone || '—'}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ══════ EXISTING: FILTER + APPROVALS ══════ */}
            <div className="card" style={{ marginBottom: '30px' }}>
                <div className="card-title">Filter Requests</div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="form-control">
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className="form-control">
                            <option value="">All Types</option>
                            <option value="Internship">Internship</option>
                            <option value="NPTEL">NPTEL</option>
                            <option value="Certification">Certification</option>
                            <option value="Mini Project">Mini Project</option>
                            <option value="Major Project">Major Project</option>
                            <option value="Research Paper">Research Paper</option>
                            <option value="Publication">Publication</option>
                            <option value="Patent">Patent</option>
                            <option value="NCC/NSS">NCC/NSS</option>
                            <option value="Placement">Placement</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <select name="year" value={filters.year} onChange={handleFilterChange} className="form-control" disabled={achTab === 'faculty'} style={{ opacity: achTab === 'faculty' ? 0.5 : 1 }}>
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                    {achTab === 'student' && (
                        <div className="form-group" style={{ marginBottom: 0, flex: 1.5 }}>
                            <input 
                                type="text" 
                                name="student" 
                                value={filters.student} 
                                onChange={handleFilterChange} 
                                className="form-control" 
                                placeholder="🔍 Filter by Student ID"
                            />
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={fetchAchievements}>
                        <FaSearch /> Filter
                    </button>
                </div>
            </div>

            {/* ══════ ACHIEVEMENT TABS ══════ */}
            <div className="fd-ach-tabs">
                <button
                    className={`fd-ach-tab${achTab === 'student' ? ' fd-ach-tab--active' : ''}`}
                    onClick={() => setAchTab('student')}
                >
                    🎓 Student Achievements
                    {achTab === 'student' && <span className="fd-ach-tab-count">{achievements.length}</span>}
                </button>
                {isHOD && (
                    <button
                        className={`fd-ach-tab${achTab === 'faculty' ? ' fd-ach-tab--active' : ''}`}
                        onClick={() => setAchTab('faculty')}
                    >
                        👨‍🏫 Faculty Achievements
                        {achTab === 'faculty' && <span className="fd-ach-tab-count">{achievements.length}</span>}
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-title">
                    {achTab === 'student'
                        ? (filters.status ? `${filters.status} Student Achievements` : 'All Student Achievements')
                        : (filters.status ? `${filters.status} Faculty Achievements` : 'All Faculty Achievements')
                    }
                </div>
                {loading ? <p>Loading...</p> : (
                    <div className="table-container">
                        <table className="table">
                            {achTab === 'student' ? (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Title</th>
                                            <th>Type</th>
                                            <th>Organization</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                            <th>Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {achievements.length > 0 ? achievements.map(ach => (
                                            <tr key={ach.id}>
                                                <td>
                                                    {ach.user ? (
                                                        <div style={{ cursor: 'pointer' }}
                                                            onClick={() => navigate(`/student-profile/${ach.user.id}`)}>
                                                            <div style={{ fontWeight: 700, color: 'var(--primary-color, #f97316)' }}>
                                                                {ach.user.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                                {ach.user.studentProfile?.rollNumber}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', fontSize: '0.82rem', fontStyle: 'italic' }}>⚠ Deleted Student</span>
                                                    )}
                                                </td>
                                                <td>{ach.title}</td>
                                                <td>{ach.type}</td>
                                                <td>{ach.organization || '—'}</td>
                                                <td>{new Date(ach.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    {ach.status === 'Pending' && (
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            <button className="btn status-Approved"
                                                                style={{ border: 'none', cursor: 'pointer' }}
                                                                onClick={() => handleStatusUpdate(ach.id, 'Approved')}>
                                                                <FaCheck /> Approve
                                                            </button>
                                                            <button className="btn status-Rejected"
                                                                style={{ border: 'none', cursor: 'pointer' }}
                                                                onClick={() => handleStatusUpdate(ach.id, 'Rejected')}>
                                                                <FaTimes /> Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                    {ach.status !== 'Pending' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span className={`status-badge status-${ach.status}`}>{ach.status}</span>
                                                            {ach.reviewer && (
                                                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                                    by {ach.reviewer.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {ach.proofUrl ? (
                                                        <a href={ach.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
                                                            View Proof
                                                        </a>
                                                    ) : 'No Proof'}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No student achievements found.</td></tr>
                                        )}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead>
                                        <tr>
                                            <th>Faculty</th>
                                            <th>Type</th>
                                            <th>Title</th>
                                            <th>Organization</th>
                                            <th>Year</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                            <th>Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {achievements.length > 0 ? achievements.map(ach => (
                                            <tr key={ach.id}>
                                                <td>
                                                    {ach.user ? (
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#0d2b5e' }}>{ach.user.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                {ach.user.facultyProfile?.facultyId || ach.user.role}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', fontSize: '0.82rem', fontStyle: 'italic' }}>⚠ Unknown</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="sd-type-chip" style={{ fontSize: '0.72rem', background: '#f0f4ff', color: '#0d2b5e', border: '1px solid #dde3f0', padding: '2px 9px', borderRadius: '10px', fontWeight: 700 }}>
                                                        {ach.type}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{ach.title}</td>
                                                <td style={{ color: '#64748b', fontSize: '0.83rem' }}>{ach.organization || '—'}</td>
                                                <td>{ach.year}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span className={`status-badge status-${ach.status}`}>{ach.status}</span>
                                                        {ach.reviewer && ach.status !== 'Pending' && (
                                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                                by {ach.reviewer.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    {ach.status === 'Pending' && isHOD ? (
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <button className="btn status-Approved"
                                                                style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem' }}
                                                                onClick={() => handleStatusUpdate(ach.id, 'Approved')}>
                                                                <FaCheck />
                                                            </button>
                                                            <button className="btn status-Rejected"
                                                                style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem' }}
                                                                onClick={() => handleStatusUpdate(ach.id, 'Rejected')}>
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {ach.proofUrl ? (
                                                        <a href={ach.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>View</a>
                                                    ) : ach.githubLink ? (
                                                        <a href={ach.githubLink} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>Link</a>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No faculty achievements found.</td></tr>
                                        )}
                                    </tbody>
                                </>
                            )}
                        </table>
                    </div>
                )}
            </div>

            <div className="fd-report-bar">
                <select
                    value={reportBranch}
                    onChange={e => setReportBranch(e.target.value)}
                    className="form-control"
                    style={{ minWidth: 100 }}
                >
                    {['CSE', 'CSE-AI', 'CSE-DS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(b =>
                        <option key={b} value={b}>{b}</option>
                    )}
                </select>
                <select
                    value={reportYear}
                    onChange={e => setReportYear(e.target.value)}
                    className="form-control"
                    style={{ minWidth: 100 }}
                >
                    {availableYears.map(y =>
                        <option key={y} value={y}>{y}</option>
                    )}
                </select>
                <button
                    className="btn btn-primary"
                    onClick={handleGenerateReport}
                    disabled={reportLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                >
                    {reportLoading
                        ? <><span className="ach-spinner" /> Generating…</>
                        : <><FaFilePdf /> Generate Class Report</>
                    }
                </button>
            </div>
        </Layout>
    );
};

export default FacultyDashboard;
