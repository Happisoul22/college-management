import { useState, useEffect, useContext } from 'react';
import Layout from '../components/Layout';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Leaves.css';

const LEAVE_TYPES = ['Casual Leave', 'Medical Leave', 'Emergency Leave', 'Personal Leave', 'On-Duty Leave', 'Other'];

/* Compute year of study and semester from admissionYear */
const computeYearSem = (admissionYear) => {
    if (!admissionYear) return { year: '—', sem: '—' };
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const calYear = now.getFullYear();
    const yearDiff = calYear - admissionYear;
    const yearOfStudy = month >= 7 ? yearDiff + 1 : yearDiff;
    const semester = month >= 7 ? (yearDiff * 2) + 1 : (yearDiff * 2);
    return {
        year: Math.max(1, Math.min(4, yearOfStudy)),
        sem: Math.max(1, Math.min(8, semester))
    };
};

const Leaves = () => {
    const { user } = useContext(AuthContext);
    const [leaves, setLeaves] = useState([]);
    const [formData, setFormData] = useState({ reason: '', leaveType: 'Casual Leave', startDate: '', endDate: '' });
    const [hodTab, setHodTab] = useState('student'); // 'student' | 'faculty' for HOD view

    const isFaculty = ['Faculty', 'ClassTeacher'].includes(user?.role);
    const isStudent = user?.role === 'Student';
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(user?.role);
    const isApprover = isFaculty || isHOD;

    useEffect(() => { fetchLeaves(); }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/leaves');
            setLeaves(res.data.data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            toast.error('End date cannot be before start date');
            return;
        }
        try {
            await api.post('/leaves', formData);
            toast.success('Leave applied successfully');
            fetchLeaves();
            setFormData({ reason: '', leaveType: 'Casual Leave', startDate: '', endDate: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to apply leave');
        }
    };

    const handleApprove = async (id, status) => {
        try {
            await api.put(`/leaves/${id}`, { status });
            toast.success(`Leave ${status}`);
            fetchLeaves();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update leave');
        }
    };

    const today = new Date().toISOString().split('T')[0];

    // Separate student vs faculty leaves for HOD view
    const studentLeaves = leaves.filter(l => l.applicantRole === 'Student' || !l.applicantRole);
    const facultyLeaves = leaves.filter(l => l.applicantRole && l.applicantRole !== 'Student');

    return (
        <Layout>
            <div className="page-title">Leave Management</div>

            {/* ── Apply Form — Students and Faculty only ── */}
            {(isStudent || isFaculty) && (
                <div className="card lv-apply-card">
                    <div className="card-title lv-apply-title">
                        {isFaculty ? '🗓️ Apply for Leave' : '📝 Apply for Leave'}
                    </div>
                    {isFaculty && (
                        <p className="lv-note">Your request will be sent to your department HOD for approval.</p>
                    )}
                    <form onSubmit={handleSubmit} className="lv-form">
                        {isFaculty && (
                            <div className="form-group">
                                <label className="form-label">Leave Type</label>
                                <select value={formData.leaveType}
                                    onChange={e => setFormData({ ...formData, leaveType: e.target.value })}
                                    className="form-control" required>
                                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <input type="text" value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                className="form-control"
                                placeholder={isFaculty ? 'e.g. Personal work, Medical treatment...' : 'Reason for leave'}
                                required />
                        </div>
                        <div className="lv-date-row">
                            <div className="form-group">
                                <label className="form-label">From Date</label>
                                <input type="date" value={formData.startDate} min={today}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: '' })}
                                    className="form-control" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">To Date</label>
                                <input type="date" value={formData.endDate} min={formData.startDate || today}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    className="form-control" required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Faculty: My Own Leave History ── */}
            {isFaculty && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-title">My Leave Requests</div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Reason</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Status</th>
                                    <th>Approved By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.filter(l => l.applicantRole !== 'Student').length > 0
                                    ? leaves.filter(l => l.applicantRole !== 'Student').map(leave => (
                                        <tr key={leave._id}>
                                            <td>{leave.leaveType || 'Casual Leave'}</td>
                                            <td>{leave.reason}</td>
                                            <td>{new Date(leave.startDate).toLocaleDateString('en-IN')}</td>
                                            <td>{new Date(leave.endDate).toLocaleDateString('en-IN')}</td>
                                            <td><span className={`status-badge status-${leave.status}`}>{leave.status}</span></td>
                                            <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{leave.approvedBy?.name || '—'}</td>
                                        </tr>
                                    ))
                                    : <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No leave requests yet.</td></tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── HOD: Tabbed View ── */}
            {isHOD && (
                <>
                    <div className="fd-ach-tabs" style={{ marginBottom: 0 }}>
                        <button
                            className={`fd-ach-tab${hodTab === 'student' ? ' fd-ach-tab--active' : ''}`}
                            onClick={() => setHodTab('student')}>
                            🎓 Student Leaves
                            {hodTab === 'student' && <span className="fd-ach-tab-count">{studentLeaves.length}</span>}
                        </button>
                        <button
                            className={`fd-ach-tab${hodTab === 'faculty' ? ' fd-ach-tab--active' : ''}`}
                            onClick={() => setHodTab('faculty')}>
                            👨‍🏫 Faculty Leaves
                            {hodTab === 'faculty' && <span className="fd-ach-tab-count">{facultyLeaves.length}</span>}
                        </button>
                    </div>

                    <div className="card">
                        <div className="card-title">
                            {hodTab === 'student' ? 'Student Leave Requests' : 'Faculty Leave Requests'}
                        </div>
                        <div className="table-container">
                            {hodTab === 'student' ? (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Roll No</th>
                                            <th>Year</th>
                                            <th>Sem</th>
                                            <th>Section</th>
                                            <th>Reason</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentLeaves.length > 0 ? studentLeaves.map(leave => {
                                            const { year, sem } = computeYearSem(leave.user?.studentProfile?.admissionYear);
                                            return (
                                                <tr key={leave._id}>
                                                    <td>
                                                        <div style={{ fontWeight: 700, color: '#1a2744' }}>{leave.user?.name || '—'}</div>
                                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{leave.user?.email}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: '#e05c1a' }}>
                                                        {leave.user?.studentProfile?.rollNumber || '—'}
                                                    </td>
                                                    <td>
                                                        <span className="lv-info-chip">Year {year}</span>
                                                    </td>
                                                    <td>
                                                        <span className="lv-info-chip">Sem {sem}</span>
                                                    </td>
                                                    <td>{leave.user?.studentProfile?.section || '—'}</td>
                                                    <td>{leave.reason}</td>
                                                    <td>{new Date(leave.startDate).toLocaleDateString('en-IN')}</td>
                                                    <td>{new Date(leave.endDate).toLocaleDateString('en-IN')}</td>
                                                    <td>
                                                        <span className={`status-badge status-${leave.status}`}>{leave.status}</span>
                                                        {leave.approvedBy && (
                                                            <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: 2 }}>by {leave.approvedBy.name}</div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {leave.status !== 'Pending' ? (
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>—</span>
                                                        ) : (
                                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting Class Teacher</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px' }}>No student leave requests.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Faculty</th>
                                            <th>Faculty ID</th>
                                            <th>Role</th>
                                            <th>Leave Type</th>
                                            <th>Reason</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facultyLeaves.length > 0 ? facultyLeaves.map(leave => (
                                            <tr key={leave._id}>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: '#1a2744' }}>{leave.user?.name || '—'}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{leave.user?.email}</div>
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#0d2b5e' }}>
                                                    {leave.user?.facultyProfile?.facultyId || '—'}
                                                </td>
                                                <td>
                                                    <span className="lv-info-chip lv-info-chip--faculty">
                                                        {leave.applicantRole || leave.user?.role || '—'}
                                                    </span>
                                                </td>
                                                <td>{leave.leaveType || 'Casual Leave'}</td>
                                                <td>{leave.reason}</td>
                                                <td>{new Date(leave.startDate).toLocaleDateString('en-IN')}</td>
                                                <td>{new Date(leave.endDate).toLocaleDateString('en-IN')}</td>
                                                <td>
                                                    <span className={`status-badge status-${leave.status}`}>{leave.status}</span>
                                                    {leave.approvedBy && (
                                                        <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: 2 }}>by {leave.approvedBy.name}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    {leave.status === 'Pending' ? (
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button onClick={() => handleApprove(leave._id, 'Approved')}
                                                                className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                                                                Approve
                                                            </button>
                                                            <button onClick={() => handleApprove(leave._id, 'Rejected')}
                                                                className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '28px' }}>No faculty leave requests.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ── Faculty (non-HOD): Approval Queue for student leaves ── */}
            {isFaculty && (
                <div className="card">
                    <div className="card-title">Student Leave Requests</div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll No</th>
                                    <th>Year</th>
                                    <th>Sem</th>
                                    <th>Section</th>
                                    <th>Reason</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentLeaves.length > 0 ? studentLeaves.map(leave => {
                                    const { year, sem } = computeYearSem(leave.user?.studentProfile?.admissionYear);
                                    return (
                                        <tr key={leave._id}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#1a2744' }}>{leave.user?.name || '—'}</div>
                                            </td>
                                            <td style={{ fontWeight: 600, color: '#e05c1a' }}>{leave.user?.studentProfile?.rollNumber || '—'}</td>
                                            <td><span className="lv-info-chip">Year {year}</span></td>
                                            <td><span className="lv-info-chip">Sem {sem}</span></td>
                                            <td>{leave.user?.studentProfile?.section || '—'}</td>
                                            <td>{leave.reason}</td>
                                            <td>{new Date(leave.startDate).toLocaleDateString('en-IN')}</td>
                                            <td>{new Date(leave.endDate).toLocaleDateString('en-IN')}</td>
                                            <td>
                                                <span className={`status-badge status-${leave.status}`}>{leave.status}</span>
                                                {leave.approvedBy && (
                                                    <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: 2 }}>by {leave.approvedBy.name}</div>
                                                )}
                                            </td>
                                            <td>
                                                {leave.status === 'Pending' ? (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => handleApprove(leave._id, 'Approved')}
                                                            className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                                                            Approve
                                                        </button>
                                                        <button onClick={() => handleApprove(leave._id, 'Rejected')}
                                                            className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No student leave requests.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Student: My Leave History ── */}
            {isStudent && (
                <div className="card">
                    <div className="card-title">My Leave History</div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Reason</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.length > 0 ? leaves.map(leave => (
                                    <tr key={leave._id}>
                                        <td>{leave.reason}</td>
                                        <td>{new Date(leave.startDate).toLocaleDateString('en-IN')}</td>
                                        <td>{new Date(leave.endDate).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <span className={`status-badge status-${leave.status}`}>{leave.status}</span>
                                            {leave.approvedBy && (
                                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>
                                                    by {leave.approvedBy.name}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>No leaves requested yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Leaves;
