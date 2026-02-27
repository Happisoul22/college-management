import { useState, useEffect, useContext } from 'react';
import Layout from '../components/Layout';
import AuthContext from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Leaves.css';

const Leaves = () => {
    const { user } = useContext(AuthContext);
    const [leaves, setLeaves] = useState([]);
    const [formData, setFormData] = useState({
        reason: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/leaves');
            setLeaves(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Client-side validation: end date must be >= start date
        if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
            toast.error('End date cannot be before start date');
            return;
        }

        try {
            await api.post('/leaves', formData);
            toast.success('Leave applied successfully');
            fetchLeaves();
            setFormData({ reason: '', startDate: '', endDate: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to apply leave');
        }
    };

    const today = new Date().toISOString().split('T')[0];

    const handleApprove = async (id, status) => {
        try {
            await api.put(`/leaves/${id}`, { status });
            toast.success(`Leave ${status}`);
            fetchLeaves();
        } catch (err) {
            toast.error('Failed to update leave');
        }
    };

    return (
        <Layout>
            <div className="page-title">Leave Management</div>

            {user.role === 'Student' && (
                <div className="card" style={{ marginBottom: '30px' }}>
                    <div className="card-title">Apply for Leave</div>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Reason</label>
                            <input type="text" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} className="form-control" required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                min={today}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value, endDate: '' })}
                                className="form-control"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                min={formData.startDate || today}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="form-control"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">Apply</button>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="card-title">{user.role === 'Student' ? 'My Leave History' : 'Leave Requests'}</div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                {user.role !== 'Student' && <th>Student</th>}
                                <th>Reason</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Status</th>
                                {user.role !== 'Student' && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(leave => (
                                <tr key={leave._id}>
                                    {user.role !== 'Student' && <td>{leave.user?.name}</td>}
                                    <td>{leave.reason}</td>
                                    <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                                    <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                                    <td>
                                        <span className={`status-badge status-${leave.status}`}>{leave.status}</span>
                                        {leave.approvedBy && (
                                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                                                by {leave.approvedBy.name}
                                            </div>
                                        )}
                                    </td>
                                    {user.role !== 'Student' && leave.status === 'Pending' && (
                                        <td>
                                            <button onClick={() => handleApprove(leave._id, 'Approved')} className="btn btn-primary" style={{ marginRight: '5px', fontSize: '0.8rem', padding: '5px 10px' }}>Approve</button>
                                            <button onClick={() => handleApprove(leave._id, 'Rejected')} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>Reject</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default Leaves;
