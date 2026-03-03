import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaUsersCog, FaChalkboardTeacher, FaUserFriends, FaTrash, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './AssignRoles.css';

const DEPARTMENTS = ['CSE', 'CSE-AI', 'CSE-DS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];

const AssignRoles = () => {
    const { user } = useContext(AuthContext);
    const dept = user?.facultyProfile?.department || '';

    const [activeSection, setActiveSection] = useState('class-teacher');
    const [faculty, setFaculty] = useState([]);
    const [students, setStudents] = useState([]);
    const [classAssignments, setClassAssignments] = useState([]);
    const [counsellorAssignments, setCounsellorAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Class Teacher form
    const [ctForm, setCtForm] = useState({
        faculty: '', year: '', semester: '', section: '', academicYear: '2024-25'
    });

    // Counsellor form
    const [coForm, setCoForm] = useState({
        faculty: '', students: [], academicYear: '2024-25'
    });
    const [selectAllStudents, setSelectAllStudents] = useState(false);
    // Student filters for counsellor assignment
    const [coFilterYear, setCoFilterYear] = useState('All');
    const [coFilterSection, setCoFilterSection] = useState('All');
    const [coFilterBranch, setCoFilterBranch] = useState('All');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [facRes, stuRes, caRes, coRes] = await Promise.all([
                api.get(`/analytics/department-users?type=Faculty${dept ? `&department=${dept}` : ''}`),
                api.get(`/analytics/department-users?type=Student${dept ? `&department=${dept}` : ''}`),
                api.get(`/assignments/class${dept ? `?department=${dept}` : ''}`),
                api.get(`/assignments/counsellor${dept ? `?department=${dept}` : ''}`)
            ]);
            setFaculty(facRes.data.data || []);
            setStudents(stuRes.data.data || []);
            setClassAssignments(caRes.data.data || []);
            setCounsellorAssignments(coRes.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const assignCT = async (e) => {
        e.preventDefault();
        try {
            await api.post('/assignments/class', { ...ctForm, department: dept });
            toast.success('Class Teacher assigned!');
            setCtForm({ faculty: '', year: '', semester: '', section: '', academicYear: '2024-25' });
            fetchData();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to assign');
        }
    };

    const removeCT = async (id) => {
        if (!window.confirm('Remove this assignment?')) return;
        try {
            await api.delete(`/assignments/class/${id}`);
            toast.success('Assignment removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to remove');
        }
    };

    const assignCounsellor = async (e) => {
        e.preventDefault();
        if (!coForm.students.length) return toast.warn('Select at least one student');
        try {
            await api.post('/assignments/counsellor', {
                faculty: coForm.faculty,
                students: coForm.students,
                department: dept,
                academicYear: coForm.academicYear
            });
            toast.success('Counsellor assigned!');
            setCoForm({ faculty: '', students: [], academicYear: '2024-25' });
            setSelectAllStudents(false);
            fetchData();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to assign');
        }
    };

    const removeCounsellor = async (id) => {
        if (!window.confirm('Remove this assignment?')) return;
        try {
            await api.delete(`/assignments/counsellor/${id}`);
            toast.success('Assignment removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to remove');
        }
    };

    const toggleStudentSelection = (id) => {
        setCoForm(prev => ({
            ...prev,
            students: prev.students.includes(id)
                ? prev.students.filter(s => s !== id)
                : [...prev.students, id]
        }));
    };

    const handleSelectAll = (checked) => {
        setSelectAllStudents(checked);
        setCoForm(prev => ({
            ...prev,
            students: checked ? filteredCoStudents.map(s => s._id) : []
        }));
    };

    // Compute unique filter options from students
    const coYears = ['All', 1, 2, 3, 4];
    const coSections = ['All', ...new Set(students.map(s => s.studentProfile?.section).filter(Boolean))].sort();
    const coBranches = ['All', ...new Set(students.map(s => s.studentProfile?.branch).filter(Boolean))].sort();

    // Filter students for counsellor selection
    const now = new Date();
    const filteredCoStudents = students.filter(s => {
        const month = now.getMonth() + 1;
        const yearDiff = now.getFullYear() - (s.studentProfile?.admissionYear || now.getFullYear());
        const yr = Math.max(1, Math.min(4, month >= 7 ? yearDiff + 1 : yearDiff));
        return (
            (coFilterYear === 'All' || String(yr) === String(coFilterYear)) &&
            (coFilterSection === 'All' || s.studentProfile?.section === coFilterSection) &&
            (coFilterBranch === 'All' || s.studentProfile?.branch === coFilterBranch)
        );
    });

    return (
        <Layout>
            <div className="page-title">🎯 Assign Roles</div>

            {/* Tab Switcher */}
            <div className="ar-tabs">
                <button className={`ar-tab ${activeSection === 'class-teacher' ? 'ar-tab--active' : ''}`}
                    onClick={() => setActiveSection('class-teacher')}>
                    <FaChalkboardTeacher /> Class Teacher
                </button>
                <button className={`ar-tab ${activeSection === 'counsellor' ? 'ar-tab--active' : ''}`}
                    onClick={() => setActiveSection('counsellor')}>
                    <FaUserFriends /> Counsellor / Mentor
                </button>
            </div>

            {/* ═══ CLASS TEACHER ═══ */}
            {activeSection === 'class-teacher' && (
                <div className="ar-section">
                    <div className="card ar-form-card">
                        <div className="card-title"><FaPlus /> Assign Class Teacher</div>
                        <form className="ar-form" onSubmit={assignCT}>
                            <div className="ar-form-row">
                                <div className="ar-field">
                                    <label>Faculty</label>
                                    <select value={ctForm.faculty} onChange={e => setCtForm({ ...ctForm, faculty: e.target.value })} required className="form-control">
                                        <option value="">— Select Faculty —</option>
                                        {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.role})</option>)}
                                    </select>
                                </div>
                                <div className="ar-field">
                                    <label>Year</label>
                                    <select value={ctForm.year} onChange={e => setCtForm({ ...ctForm, year: e.target.value })} required className="form-control">
                                        <option value="">Year</option>
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="ar-field">
                                    <label>Semester</label>
                                    <select value={ctForm.semester} onChange={e => setCtForm({ ...ctForm, semester: e.target.value })} required className="form-control">
                                        <option value="">Sem</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="ar-field">
                                    <label>Section</label>
                                    <select value={ctForm.section} onChange={e => setCtForm({ ...ctForm, section: e.target.value })} required className="form-control">
                                        <option value="">Sec</option>
                                        {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="ar-field">
                                    <label>Academic Year</label>
                                    <select value={ctForm.academicYear} onChange={e => setCtForm({ ...ctForm, academicYear: e.target.value })} className="form-control">
                                        <option value="2024-25">2024-25</option>
                                        <option value="2023-24">2023-24</option>
                                        <option value="2025-26">2025-26</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary ar-assign-btn">
                                <FaPlus /> Assign Class Teacher
                            </button>
                        </form>
                    </div>

                    {/* Current Assignments */}
                    <div className="card">
                        <div className="card-title">Current Class Teacher Assignments</div>
                        {loading ? <p>Loading...</p> : classAssignments.length === 0 ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No class teacher assignments yet.</p>
                        ) : (
                            <div className="table-container">
                                <table className="table ar-table">
                                    <thead>
                                        <tr>
                                            <th>Faculty</th>
                                            <th>Year</th>
                                            <th>Sem</th>
                                            <th>Section</th>
                                            <th>Academic Year</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classAssignments.map(a => (
                                            <tr key={a._id}>
                                                <td><strong>{a.faculty?.name}</strong></td>
                                                <td>{a.year}</td>
                                                <td>{a.semester}</td>
                                                <td>{a.section}</td>
                                                <td>{a.academicYear}</td>
                                                <td>
                                                    <button className="btn ar-remove-btn" onClick={() => removeCT(a._id)}>
                                                        <FaTrash /> Remove
                                                    </button>
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

            {/* ═══ COUNSELLOR ═══ */}
            {activeSection === 'counsellor' && (
                <div className="ar-section">
                    <div className="card ar-form-card">
                        <div className="card-title"><FaPlus /> Assign Counsellor / Mentor</div>
                        <form className="ar-form" onSubmit={assignCounsellor}>
                            <div className="ar-form-row">
                                <div className="ar-field" style={{ flex: 2 }}>
                                    <label>Faculty (Counsellor)</label>
                                    <select value={coForm.faculty} onChange={e => setCoForm({ ...coForm, faculty: e.target.value })} required className="form-control">
                                        <option value="">— Select Faculty —</option>
                                        {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.role})</option>)}
                                    </select>
                                </div>
                                <div className="ar-field">
                                    <label>Academic Year</label>
                                    <select value={coForm.academicYear} onChange={e => setCoForm({ ...coForm, academicYear: e.target.value })} className="form-control">
                                        <option value="2024-25">2024-25</option>
                                        <option value="2023-24">2023-24</option>
                                        <option value="2025-26">2025-26</option>
                                    </select>
                                </div>
                            </div>

                            {/* Student filters + selection */}
                            <div className="ar-students-section">
                                <div className="ar-student-filters">
                                    <select value={coFilterYear} onChange={e => setCoFilterYear(e.target.value)} className="form-control" style={{ minWidth: 100, flex: 1 }}>
                                        {coYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : `Year ${y}`}</option>)}
                                    </select>
                                    <select value={coFilterSection} onChange={e => setCoFilterSection(e.target.value)} className="form-control" style={{ minWidth: 120, flex: 1 }}>
                                        {coSections.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>)}
                                    </select>
                                    <select value={coFilterBranch} onChange={e => setCoFilterBranch(e.target.value)} className="form-control" style={{ minWidth: 120, flex: 1 }}>
                                        {coBranches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Branches' : b}</option>)}
                                    </select>
                                    <button type="button" className="btn btn-primary"
                                        style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                        onClick={() => setCoForm(prev => ({
                                            ...prev,
                                            students: [...new Set([...prev.students, ...filteredCoStudents.map(s => s._id)])]
                                        }))}>
                                        ＋ Select Filtered ({filteredCoStudents.length})
                                    </button>
                                    <button type="button" className="btn"
                                        style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #dde3f0', whiteSpace: 'nowrap' }}
                                        onClick={() => { setCoFilterYear('All'); setCoFilterSection('All'); setCoFilterBranch('All'); }}>Clear Filters</button>
                                </div>
                                <div className="ar-students-header">
                                    <label className="ar-select-all">
                                        <input type="checkbox" checked={selectAllStudents} onChange={e => handleSelectAll(e.target.checked)} />
                                        Select All Filtered ({filteredCoStudents.length} shown of {students.length})
                                    </label>
                                    <span className="ar-selected-count">{coForm.students.length} selected</span>
                                </div>
                                <div className="ar-students-grid">
                                    {filteredCoStudents.map(s => (
                                        <label key={s._id} className={`ar-student-chip ${coForm.students.includes(s._id) ? 'ar-chip--selected' : ''}`}>
                                            <input type="checkbox" checked={coForm.students.includes(s._id)}
                                                onChange={() => toggleStudentSelection(s._id)} />
                                            <span className="ar-chip-name">{s.name}</span>
                                            <span className="ar-chip-roll">{s.studentProfile?.rollNumber || ''}</span>
                                        </label>
                                    ))}
                                    {filteredCoStudents.length === 0 && (
                                        <p style={{ color: '#94a3b8', fontSize: '0.82rem', gridColumn: '1 / -1' }}>No students match the selected filters.</p>
                                    )}
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary ar-assign-btn">
                                <FaPlus /> Assign Counsellor
                            </button>
                        </form>
                    </div>

                    {/* Current Counsellor Assignments */}
                    <div className="card">
                        <div className="card-title">Current Counsellor Assignments</div>
                        {loading ? <p>Loading...</p> : counsellorAssignments.length === 0 ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center' }}>No counsellor assignments yet.</p>
                        ) : (
                            counsellorAssignments.map(a => (
                                <div key={a._id} className="ar-counsellor-card">
                                    <div className="ar-co-header">
                                        <div>
                                            <strong>{a.faculty?.name}</strong>
                                            <span className="ar-co-year">{a.academicYear}</span>
                                        </div>
                                        <button className="btn ar-remove-btn" onClick={() => removeCounsellor(a._id)}>
                                            <FaTrash /> Remove
                                        </button>
                                    </div>
                                    <div className="ar-co-students">
                                        {a.students?.map(s => (
                                            <span key={s._id} className="ar-co-student-chip">{s.name}</span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default AssignRoles;
