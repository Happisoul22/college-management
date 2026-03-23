import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
    FaProjectDiagram, FaUserTie, FaUserShield, FaChalkboardTeacher,
    FaSearch, FaPlus, FaClock, FaCheck, FaTimes, FaChartBar, FaCalendarAlt,
    FaGithub, FaFileAlt, FaExclamationTriangle, FaUsers, FaBell
} from 'react-icons/fa';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import './ProjectManagement.css';

const STATUS_COLORS = {
    Pending: '#f59e0b',
    Ongoing: '#3b82f6',
    Completed: '#22c55e',
    Rejected: '#ef4444',
};
const PIE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

const ProjectManagement = () => {
    const { user } = useContext(AuthContext);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(user?.role);

    const [activeTab, setActiveTab] = useState('overview');
    const [myProjectRole, setMyProjectRole] = useState(null);
    const [projects, setProjects] = useState([]);
    const [roles, setRoles] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [studentList, setStudentList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Forms
    // HOD defaults to 'coordinator'; will be overridden to 'guide' for Coordinator once role is loaded
    const [roleForm, setRoleForm] = useState({ facultyId: '', projectRole: 'coordinator' });
    const [projectForm, setProjectForm] = useState({
        title: '', description: '', type: 'individual',
        students: [], guideId: '', year: 4, batch: '',
        githubLink: '', researchPapers: []
    });
    const [schedForm, setSchedForm] = useState({ review0: '', review1: '', review2: '' });
    const [deadlineForm, setDeadlineForm] = useState({ deadline: '', projectId: '' });
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [feedbackText, setFeedbackText] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rolesRes, roleMe, projRes, schedRes] = await Promise.all([
                api.get('/projects/roles'),
                api.get('/projects/roles/me'),
                api.get('/projects'),
                api.get('/projects/schedule'),
            ]);
            setRoles(rolesRes.data.data || []);
            setMyProjectRole(roleMe.data.data);
            setProjects(projRes.data.data || []);
            setSchedules(schedRes.data.data || []);

            // Try analytics (HOD / Coordinators)
            try {
                const aRes = await api.get('/projects/analytics');
                setAnalytics(aRes.data.data);
            } catch (_) {}

            // Fetch faculty+students for forms
            const deptRes = await api.get('/analytics/department-users?type=Faculty');
            setFacultyList(deptRes.data.data || []);
            const stuRes = await api.get('/analytics/department-users?type=Student');
            setStudentList(stuRes.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignRole = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects/roles/assign', roleForm);
            toast.success(`Faculty assigned as ${roleForm.projectRole.replace('_', ' ')}`);
            setRoleForm({ facultyId: '', projectRole: 'coordinator' });
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to assign role');
        }
    };

    const handleRemoveRole = async (facultyId) => {
        if (!window.confirm('Remove this project role?')) return;
        try {
            await api.delete(`/projects/roles/${facultyId}`);
            toast.success('Role removed');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove role');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', projectForm);
            toast.success('Project created!');
            setProjectForm({ title: '', description: '', type: 'individual', students: [], guideId: '', year: 4, batch: '', githubLink: '', researchPapers: [] });
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create project');
        }
    };

    const handleSetSchedule = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects/schedule', schedForm);
            toast.success('Review schedule saved!');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to set schedule');
        }
    };

    const handleSetDeadline = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects/deadline', deadlineForm);
            toast.success('Deadline set!');
            setDeadlineForm({ deadline: '', projectId: '' });
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to set deadline');
        }
    };

    const handleAddFeedback = async (projectId) => {
        if (!feedbackText.trim()) return;
        try {
            await api.post(`/projects/${projectId}/feedback`, { comment: feedbackText });
            toast.success('Feedback added!');
            setFeedbackText('');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add feedback');
        }
    };

    const isCoordinator = myProjectRole?.projectRole === 'coordinator';
    const canCreateProject = isCoordinator; // ONLY Coordinator can create
    const canManageRoles = isHOD; // ONLY HOD manages roles
    const canManage = isHOD || isCoordinator; // For feedback/actions
    const canSchedule = isCoordinator; // Coordinator ONLY

    const filteredProjects = projects.filter(p => {
        const matchStatus = !filterStatus || p.status === filterStatus;
        const term = searchTerm.toLowerCase();
        const matchSearch = !term || p.title?.toLowerCase().includes(term) ||
            p.studentDetails?.some(s => s.name?.toLowerCase().includes(term));
        return matchStatus && matchSearch;
    });

    const now = new Date();
    const lateProjects = filteredProjects.filter(p =>
        p.deadline && p.status !== 'Completed' && new Date(p.deadline) < now
    );

    const statusPieData = analytics ? [
        { name: 'Pending', value: analytics.pending },
        { name: 'Ongoing', value: analytics.ongoing },
        { name: 'Completed', value: analytics.completed },
        { name: 'Rejected', value: analytics.rejected },
    ].filter(d => d.value > 0) : [];

    const reviewBarData = analytics?.byReviewStatus?.map(r => ({
        name: `Review ${r.review}`, count: r.count
    })) || [];

    const tabs = [
        { id: 'overview', label: '📊 Overview', show: true },
        { id: 'roles', label: '👥 Manage Roles', show: canManageRoles },
        { id: 'projects', label: '📁 Projects', show: true },
        { id: 'create', label: '➕ New Project', show: canCreateProject },
        { id: 'schedule', label: '📅 Schedule', show: canSchedule }, // Coordinator only
    ].filter(t => t.show);

    if (loading) return <Layout><div className="pm-loading">Loading Project Management...</div></Layout>;

    return (
        <Layout>
            <div className="pm-page">
                <div className="pm-hero">
                    <div className="pm-hero-icon"><FaProjectDiagram /></div>
                    <div>
                        <h1 className="pm-hero-title">Project Management</h1>
                        <p className="pm-hero-sub">
                            {isHOD ? 'HOD Controls – Role Assignment' : isCoordinator ? 'Coordinator Panel – Scheduling & Guides' : 'Project Overview'}
                        </p>
                    </div>
                </div>

                {/* Analytics Stats */}
                {analytics && (
                    <div className="pm-stat-row">
                        {[
                            { label: 'Total', value: analytics.total, color: '#6366f1', icon: <FaProjectDiagram /> },
                            { label: 'Completed', value: analytics.completed, color: '#22c55e', icon: <FaCheck /> },
                            { label: 'Ongoing', value: analytics.ongoing, color: '#3b82f6', icon: <FaClock /> },
                            { label: 'Pending', value: analytics.pending, color: '#f59e0b', icon: <FaClock /> },
                            { label: 'Late', value: analytics.late, color: '#ef4444', icon: <FaExclamationTriangle /> },
                        ].map(s => (
                            <div key={s.label} className="pm-stat-card" style={{ borderTopColor: s.color }}>
                                <div className="pm-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                                <div className="pm-stat-val" style={{ color: s.color }}>{s.value}</div>
                                <div className="pm-stat-lbl">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="pm-tabs">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            className={`pm-tab ${activeTab === t.id ? 'pm-tab--active' : ''}`}
                            onClick={() => setActiveTab(t.id)}
                        >{t.label}</button>
                    ))}
                </div>

                {/* ── OVERVIEW tab ── */}
                {activeTab === 'overview' && (
                    <div className="pm-panel">
                        {analytics && statusPieData.length > 0 ? (
                            <div className="pm-charts-row">
                                <div className="card pm-chart-card">
                                    <div className="card-title">Project Status Distribution</div>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <PieChart>
                                            <Pie data={statusPieData} dataKey="value" cx="50%" cy="50%" outerRadius={90} labelLine={false}>
                                                {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend iconType="circle" iconSize={10} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="card pm-chart-card">
                                    <div className="card-title">Projects by Review Stage</div>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={reviewBarData} barSize={40} margin={{ left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#6366f1" radius={[5,5,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="pm-empty">
                                <FaProjectDiagram size={40} />
                                <p>No project data yet. Create your first project!</p>
                            </div>
                        )}

                        {/* Latest schedules */}
                        {schedules.length > 0 && (
                            <div className="card pm-sched-preview">
                                <div className="card-title"><FaCalendarAlt /> Latest Schedule</div>
                                {schedules.slice(0, 3).map(s => (
                                    <div key={s.id} className="pm-sched-row">
                                        <span className="pm-sched-type">{s.type === 'global_deadline' ? '⏰ Deadline' : '📅 Review Schedule'}</span>
                                        {s.type === 'review_schedule' && (
                                            <span>Rev 0: {s.review0 ? new Date(s.review0).toLocaleDateString() : '—'} | Rev 1: {s.review1 ? new Date(s.review1).toLocaleDateString() : '—'} | Rev 2: {s.review2 ? new Date(s.review2).toLocaleDateString() : '—'}</span>
                                        )}
                                        {s.type === 'global_deadline' && (
                                            <span>Deadline: {new Date(s.deadline).toLocaleDateString()} | Dept: {s.department || '—'}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ROLES tab ── */}
                {activeTab === 'roles' && canManageRoles && (
                    <div className="pm-panel">
                        {/* Assign role form */}
                        <div className="card pm-form-card">
                            <div className="card-title">
                                👑 Assign Coordinator / IDC Member
                            </div>
                            {/* HOD info banner */}
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: '0.85rem', color: '#1d4ed8' }}>
                                ℹ️ As HOD you can assign <strong>Coordinators</strong> and <strong>IDC Members</strong>. The Project Coordinator assigns Guides to projects directly from the New Project tab.
                            </div>
                            <form onSubmit={handleAssignRole} className="pm-form">
                                <div className="pm-form-row">
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label>Select Faculty</label>
                                        <select
                                            value={roleForm.facultyId}
                                            onChange={e => setRoleForm({ ...roleForm, facultyId: e.target.value })}
                                            className="form-control" required
                                        >
                                            <option value="">— Choose Faculty —</option>
                                            {facultyList.map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name} ({f.facultyProfile?.facultyId || f.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Project Role</label>
                                        <select
                                            value={roleForm.projectRole}
                                            onChange={e => setRoleForm({ ...roleForm, projectRole: e.target.value })}
                                            className="form-control" required
                                        >
                                            {/* HOD: Coordinator + IDC only */}
                                            <option value="coordinator">Coordinator</option>
                                            <option value="idc_member">IDC Member</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="btn btn-primary pm-form-btn">
                                        <FaPlus /> Assign
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Current roles */}
                        <div className="card">
                            <div className="card-title">Currently Assigned Project Roles</div>
                            {roles.length === 0 ? (
                                <div className="pm-empty-sm">No project roles assigned yet.</div>
                            ) : (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Faculty</th>
                                                <th>Faculty ID</th>
                                                <th>Role</th>
                                                <th>Department</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roles.map((r, i) => (
                                                <tr key={r.id}>
                                                    <td>{i + 1}</td>
                                                    <td><strong>{r.faculty?.name || '—'}</strong><br /><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.faculty?.email}</span></td>
                                                    <td>{r.faculty?.facultyId || '—'}</td>
                                                    <td>
                                                        <span className={`pm-role-badge pm-role--${r.projectRole}`}>
                                                            {r.projectRole === 'coordinator' ? '🎯 Coordinator' :
                                                                r.projectRole === 'idc_member' ? '🏅 IDC Member' : '📚 Guide'}
                                                        </span>
                                                    </td>
                                                    <td>{r.department || '—'}</td>
                                                    <td>
                                                        {isHOD && (
                                                            <button
                                                                className="btn btn-sm pm-remove-btn"
                                                                onClick={() => handleRemoveRole(r.facultyId)}
                                                            ><FaTimes /> Remove</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── PROJECTS tab ── */}
                {activeTab === 'projects' && (
                    <div className="pm-panel">
                        {/* Filters */}
                        <div className="card pm-filter-bar">
                            <div className="pm-filter-search">
                                <FaSearch />
                                <input
                                    type="text"
                                    placeholder="Search projects or students..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pm-search-input"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="form-control pm-filter-select"
                            >
                                <option value="">All Statuses</option>
                                {['Pending','Ongoing','Completed','Rejected'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <span className="pm-proj-count">{filteredProjects.length} projects</span>
                            {lateProjects.length > 0 && (
                                <span className="pm-late-badge">⚠ {lateProjects.length} late</span>
                            )}
                        </div>

                        {filteredProjects.length === 0 ? (
                            <div className="pm-empty">
                                <FaProjectDiagram size={40} />
                                <p>No projects found. Create one in the "New Project" tab.</p>
                            </div>
                        ) : (
                            <div className="pm-project-grid">
                                {filteredProjects.map(p => {
                                    const isLate = p.deadline && p.status !== 'Completed' && new Date(p.deadline) < now;
                                    return (
                                        <div
                                            key={p.id}
                                            className={`pm-proj-card ${isLate ? 'pm-proj-card--late' : ''}`}
                                            onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}
                                        >
                                            <div className="pm-proj-top">
                                                <div className="pm-proj-title">{p.title}</div>
                                                <span className="pm-proj-status" style={{ background: STATUS_COLORS[p.status] + '20', color: STATUS_COLORS[p.status] }}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="pm-proj-meta">
                                                <span>Year {p.year}</span>
                                                <span>Review {p.reviewStatus}</span>
                                                <span>{p.type}</span>
                                                {isLate && <span className="pm-late-chip">⚠ LATE</span>}
                                            </div>
                                            <div className="pm-proj-guide">
                                                <FaChalkboardTeacher /> {p.guide?.name || '— no guide —'}
                                            </div>
                                            <div className="pm-proj-students">
                                                <FaUsers /> {p.studentDetails?.length || 0} student(s):&nbsp;
                                                {p.studentDetails?.map(s => s.name).join(', ') || '—'}
                                            </div>
                                            {p.deadline && (
                                                <div className={`pm-proj-deadline ${isLate ? 'pm-proj-deadline--late' : ''}`}>
                                                    <FaCalendarAlt /> Due: {new Date(p.deadline).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Selected project detail */}
                        {selectedProject && (() => {
                            const activeProject = projects.find(p => p.id === selectedProject.id) || selectedProject;
                            return (
                            <div className="card pm-proj-detail">
                                <div className="card-title">
                                    {activeProject.title}
                                    <button className="pm-detail-close" onClick={() => setSelectedProject(null)}>✕</button>
                                </div>
                                <p className="pm-proj-desc">{activeProject.description || 'No description.'}</p>
                                <div className="pm-proj-links">
                                    {activeProject.githubLink && <a href={activeProject.githubLink} target="_blank" rel="noreferrer"><FaGithub /> GitHub</a>}
                                    {activeProject.proofUrl && <a href={activeProject.proofUrl} target="_blank" rel="noreferrer"><FaFileAlt /> Proof</a>}
                                </div>
                                {/* Feedback timeline */}
                                <div className="pm-feedback-section">
                                    <div className="pm-feedback-title">💬 Feedback</div>
                                    {(activeProject.feedback || []).length === 0 ? (
                                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No feedback yet.</p>
                                    ) : (
                                        activeProject.feedback.map(fb => (
                                            <div key={fb.id} className="pm-fb-item">
                                                <div className="pm-fb-header">
                                                    <span className="pm-fb-name">{fb.name}</span>
                                                    <span className="pm-fb-role">{fb.role}</span>
                                                    <span className="pm-fb-date">{new Date(fb.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="pm-fb-comment">{fb.comment}</p>
                                            </div>
                                        ))
                                    )}
                                    {canManage && (
                                        <div className="pm-fb-input-row">
                                            <input
                                                type="text"
                                                placeholder="Add feedback..."
                                                value={feedbackText}
                                                onChange={e => setFeedbackText(e.target.value)}
                                                className="form-control"
                                            />
                                            <button className="btn btn-primary" onClick={() => handleAddFeedback(activeProject.id)}>
                                                <FaBell /> Send
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* IDC Score */}
                                {activeProject.score && (
                                    <div className="pm-score-section">
                                        <div className="pm-feedback-title">🏅 IDC Score</div>
                                        <div className="pm-score-grid">
                                            {['innovation','implementation','documentation','presentation'].map(k => (
                                                <div key={k} className="pm-score-item">
                                                    <div className="pm-score-label">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                                                    <div className="pm-score-bar">
                                                        <div className="pm-score-fill" style={{ width: `${activeProject.score[k] * 10}%` }} />
                                                    </div>
                                                    <div className="pm-score-val">{activeProject.score[k]}/10</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pm-score-total">Total: {activeProject.score.total}/40</div>
                                    </div>
                                )}
                            </div>
                            );
                        })()}
                    </div>
                )}

                {/* ── CREATE PROJECT tab ── */}
                {activeTab === 'create' && canCreateProject && (
                    <div className="pm-panel">
                        <div className="card pm-form-card">
                            <div className="card-title"><FaPlus /> Create New Project</div>
                            <form onSubmit={handleCreateProject} className="pm-create-form">
                                <div className="pm-form-row">
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label>Project Title *</label>
                                        <input type="text" className="form-control" value={projectForm.title}
                                            onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Type</label>
                                        <select className="form-control" value={projectForm.type}
                                            onChange={e => setProjectForm({ ...projectForm, type: e.target.value })}>
                                            <option value="individual">Individual</option>
                                            <option value="group">Group (Batch)</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Year</label>
                                        <select className="form-control" value={projectForm.year}
                                            onChange={e => setProjectForm({ ...projectForm, year: Number(e.target.value) })}>
                                            {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea className="form-control" rows={3} value={projectForm.description}
                                        onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
                                </div>
                                <div className="pm-form-row">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Assign Guide</label>
                                        <select className="form-control" value={projectForm.guideId}
                                            onChange={e => setProjectForm({ ...projectForm, guideId: e.target.value })}>
                                            <option value="">— No Guide —</option>
                                            {facultyList.map(f => (
                                                <option key={f.id} value={f.id}>{f.name} ({f.facultyProfile?.facultyId || f.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Batch Number</label>
                                        <input type="text" className="form-control" placeholder="e.g. B-01"
                                            value={projectForm.batch}
                                            onChange={e => setProjectForm({ ...projectForm, batch: e.target.value })} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>GitHub Link</label>
                                        <input type="url" className="form-control" placeholder="https://github.com/..."
                                            value={projectForm.githubLink}
                                            onChange={e => setProjectForm({ ...projectForm, githubLink: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Assign Students <span className="pm-hint">(ctrl+click for multiple)</span></label>
                                    <select multiple className="form-control pm-multi-select"
                                        value={projectForm.students}
                                        onChange={e => setProjectForm({ ...projectForm, students: Array.from(e.target.selectedOptions, o => o.value) })}>
                                        {studentList.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} — {s.studentProfile?.rollNumber || s.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg">
                                    <FaProjectDiagram /> Create Project
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── SCHEDULE tab ── Coordinator ONLY ── */}
                {activeTab === 'schedule' && canSchedule && (
                    <div className="pm-panel">
                        <div className="pm-sched-grid">
                            {/* Review schedule form */}
                            <div className="card pm-form-card">
                                <div className="card-title"><FaCalendarAlt /> Set Review Schedule</div>
                                <form onSubmit={handleSetSchedule} className="pm-create-form">
                                    {['review0','review1','review2'].map((key, i) => (
                                        <div className="form-group" key={key}>
                                            <label>Review {i} Date & Time</label>
                                            <input type="datetime-local" className="form-control"
                                                value={schedForm[key]}
                                                onChange={e => setSchedForm({ ...schedForm, [key]: e.target.value })} />
                                        </div>
                                    ))}
                                    <button type="submit" className="btn btn-primary">💾 Save Schedule</button>
                                </form>
                            </div>

                            {/* Deadline form */}
                            <div className="card pm-form-card">
                                <div className="card-title"><FaClock /> Set Submission Deadline</div>
                                <form onSubmit={handleSetDeadline} className="pm-create-form">
                                    <div className="form-group">
                                        <label>Deadline Date</label>
                                        <input type="datetime-local" className="form-control" required
                                            value={deadlineForm.deadline}
                                            onChange={e => setDeadlineForm({ ...deadlineForm, deadline: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>For Specific Project (optional)</label>
                                        <select className="form-control"
                                            value={deadlineForm.projectId}
                                            onChange={e => setDeadlineForm({ ...deadlineForm, projectId: e.target.value })}>
                                            <option value="">— Global Deadline —</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button type="submit" className="btn btn-primary">📌 Set Deadline</button>
                                </form>
                            </div>
                        </div>

                        {/* Existing schedules */}
                        {schedules.length > 0 && (
                            <div className="card" style={{ marginTop: 20 }}>
                                <div className="card-title">Saved Schedules & Deadlines</div>
                                <div className="table-container">
                                    <table className="table">
                                        <thead><tr><th>Type</th><th>Details</th><th>Set By</th><th>Created</th></tr></thead>
                                        <tbody>
                                            {schedules.map(s => (
                                                <tr key={s.id}>
                                                    <td><span className="pm-role-badge pm-role--coordinator">{s.type === 'global_deadline' ? '⏰ Deadline' : '📅 Review'}</span></td>
                                                    <td>
                                                        {s.type === 'review_schedule' ? (
                                                            <span>Rev0: {s.review0 ? new Date(s.review0).toLocaleString() : '—'} | Rev1: {s.review1 ? new Date(s.review1).toLocaleString() : '—'} | Rev2: {s.review2 ? new Date(s.review2).toLocaleString() : '—'}</span>
                                                        ) : (
                                                            <span>{new Date(s.deadline).toLocaleString()}{s.department ? ` (${s.department})` : ''}</span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.setBy?.slice(0, 8)}…</td>
                                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ProjectManagement;
