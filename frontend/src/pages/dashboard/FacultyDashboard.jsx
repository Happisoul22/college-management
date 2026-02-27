import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaCheck, FaTimes, FaSearch, FaFilePdf, FaUserGraduate, FaChalkboardTeacher, FaTrophy, FaClock, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const isHOD = user?.role === 'HOD' || user?.role === 'Principal' || user?.role === 'Admin';

    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        year: '',
    });

    // HOD-specific state
    const [deptStats, setDeptStats] = useState({ studentCount: 0, facultyCount: 0, department: '' });
    const [activeView, setActiveView] = useState(null); // null | 'students' | 'faculty'
    const [userList, setUserList] = useState([]);
    const [listLoading, setListLoading] = useState(false);

    useEffect(() => {
        fetchAchievements();
        if (isHOD) fetchDeptStats();
    }, [filters]);

    const fetchDeptStats = async () => {
        try {
            const res = await api.get('/analytics/department-users');
            setDeptStats(res.data.data);
        } catch (err) {
            console.error('Dept stats error:', err);
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
            const queryParams = new URLSearchParams(filters).toString();
            const res = await api.get(`/achievements?${queryParams}`);
            setAchievements(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
            if (err.response?.status === 401) toast.error("Session expired");
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

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const pendingCount = achievements.filter(a => a.status === 'Pending').length;

    return (
        <Layout>
            <div className="page-title">
                {isHOD ? 'HOD Dashboard' : 'Faculty Dashboard'}
            </div>

            {/* ══════ HOD STAT CARDS ══════ */}
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
                                <button className="hod-detail-close" onClick={() => { setActiveView(null); setUserList([]); }}>
                                    <FaArrowLeft /> Back
                                </button>
                            </div>

                            {listLoading ? (
                                <div className="hod-detail-loading">Loading...</div>
                            ) : userList.length === 0 ? (
                                <div className="hod-detail-empty">
                                    No {activeView} found in this department.
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
                                            {userList.map((u, i) => (
                                                <tr
                                                    key={u._id}
                                                    style={activeView === 'faculty' ? { cursor: 'pointer' } : {}}
                                                    onClick={activeView === 'faculty' ? () => navigate(`/faculty-profile/${u._id}`) : undefined}
                                                    className={activeView === 'faculty' ? 'hod-faculty-row' : ''}
                                                >
                                                    <td>{i + 1}</td>
                                                    <td><strong style={activeView === 'faculty' ? { color: 'var(--primary-color, #f97316)' } : {}}>{u.name}</strong></td>
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
                        <select name="year" value={filters.year} onChange={handleFilterChange} className="form-control">
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={fetchAchievements}>
                        <FaSearch /> Filter
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-title">
                    {filters.status ? `${filters.status} Achievements` : 'All Achievements'}
                </div>
                {loading ? <p>Loading...</p> : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                    <th>Proof</th>
                                </tr>
                            </thead>
                            <tbody>
                                {achievements.length > 0 ? achievements.map(ach => (
                                    <tr key={ach._id}>
                                        <td>
                                            {ach.user ? (
                                                <div
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => navigate(`/student-profile/${ach.user._id}`)}
                                                >
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
                                        <td>{new Date(ach.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {ach.status === 'Pending' && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        className="btn status-Approved"
                                                        style={{ border: 'none', cursor: 'pointer' }}
                                                        onClick={() => handleStatusUpdate(ach._id, 'Approved')}
                                                    >
                                                        <FaCheck /> Approve
                                                    </button>
                                                    <button
                                                        className="btn status-Rejected"
                                                        style={{ border: 'none', cursor: 'pointer' }}
                                                        onClick={() => handleStatusUpdate(ach._id, 'Rejected')}
                                                    >
                                                        <FaTimes /> Reject
                                                    </button>
                                                </div>
                                            )}
                                            {ach.status !== 'Pending' && <span className={`status-badge status-${ach.status}`}>{ach.status}</span>}
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
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center' }}>No achievements found matching filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px' }}>
                <a href="/api/reports/class?branch=CSE&year=2023" target="_blank" className="btn btn-primary" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <FaFilePdf /> Generate Class Report (Demo: CSE 2023)
                </a>
            </div>
        </Layout>
    );
};

export default FacultyDashboard;
