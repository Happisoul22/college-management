import { useState, useEffect, useContext } from 'react';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaBook, FaPlus, FaTrash, FaUserTie, FaTimes, FaChalkboard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './SubjectsPage.css';

const DEPARTMENTS = ['CSE', 'CSE-AI', 'CSE-DS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

// ─── HOD: smart "Add & Assign Subject" panel ─────────────────────────────────
const AddAssignPanel = ({ faculty, onDone }) => {
    const [step, setStep] = useState({ year: '', semester: '', department: '' });
    const [subjectList, setSubjectList] = useState([]);
    const [selected, setSelected] = useState('');          // selected subject _id
    const [selectedInfo, setSelectedInfo] = useState(null);
    const [assignFaculty, setAssignFaculty] = useState('');
    const [assignSection, setAssignSection] = useState('');
    const [loading, setLoading] = useState(false);

    // When year + sem + dept are set, fetch matching subjects
    useEffect(() => {
        if (step.year && step.semester && step.department) {
            setSelected('');
            setSelectedInfo(null);
            setAssignFaculty('');
            setAssignSection('');
            fetchSubjectsForSelection();
        } else {
            setSubjectList([]);
        }
    }, [step.year, step.semester, step.department]);

    const fetchSubjectsForSelection = async () => {
        try {
            setLoading(true);
            const res = await api.get(
                `/subjects?year=${step.year}&semester=${step.semester}&department=${step.department}`
            );
            setSubjectList(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectSelect = (id) => {
        setSelected(id);
        const info = subjectList.find(s => s._id === id);
        setSelectedInfo(info || null);
    };

    const handleAssign = async () => {
        if (!selected || !assignFaculty) return toast.warn('Select both a subject and a faculty');
        try {
            await api.put(`/subjects/${selected}/assign`, {
                faculty: assignFaculty,
                section: assignSection
            });
            toast.success('Subject assigned to faculty!');
            setSelected('');
            setSelectedInfo(null);
            setAssignFaculty('');
            setAssignSection('');
            fetchSubjectsForSelection();
            onDone();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Failed to assign');
        }
    };

    return (
        <div className="card subj-form-card">
            <div className="card-title"><FaChalkboard /> Assign Subject to Faculty</div>

            {/* Step 1: Selectors */}
            <div className="subj-form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                    <label>Year</label>
                    <select className="form-control" value={step.year}
                        onChange={e => setStep({ ...step, year: e.target.value })}>
                        <option value="">Select Year</option>
                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Semester</label>
                    <select className="form-control" value={step.semester}
                        onChange={e => setStep({ ...step, semester: e.target.value })}
                        disabled={!step.year}>
                        <option value="">Select Semester</option>
                        {step.year && [1, 2].map(offset => {
                            const sem = (Number(step.year) - 1) * 2 + offset;
                            return <option key={sem} value={sem}>Semester {sem}</option>;
                        })}
                    </select>
                </div>
                <div className="form-group">
                    <label>Branch</label>
                    <select className="form-control" value={step.department}
                        onChange={e => setStep({ ...step, department: e.target.value })}
                        disabled={!step.semester}>
                        <option value="">Select Branch</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Step 2: Subject selection */}
            {step.department && (
                <div className="subj-form-grid" style={{ marginBottom: 16 }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Subject</label>
                        {loading ? <p style={{ color: '#64748b' }}>Loading subjects…</p>
                            : subjectList.length === 0
                                ? <p style={{ color: '#f59e0b', fontWeight: 600 }}>
                                    No subjects found. Make sure subjects are seeded for this Year/Sem/Branch.
                                </p>
                                : (
                                    <select className="form-control" value={selected}
                                        onChange={e => handleSubjectSelect(e.target.value)}>
                                        <option value="">— Select Subject —</option>
                                        {subjectList.map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} {s.faculty ? '✅ (assigned)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                )
                        }
                    </div>

                    {/* Auto-filled subject code */}
                    {selectedInfo && (
                        <>
                            <div className="form-group">
                                <label>Subject Code (auto)</label>
                                <input className="form-control" value={selectedInfo.code} readOnly
                                    style={{ background: '#f8fafc', color: '#64748b' }} />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <input className="form-control" value={selectedInfo.type} readOnly
                                    style={{ background: '#f8fafc', color: '#64748b' }} />
                            </div>
                            <div className="form-group">
                                <label>Credits</label>
                                <input className="form-control" value={selectedInfo.credits} readOnly
                                    style={{ background: '#f8fafc', color: '#64748b' }} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Step 3: Assign Faculty */}
            {selectedInfo && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
                    <div className="form-group" style={{ minWidth: 200 }}>
                        <label>Section</label>
                        <select className="form-control" value={assignSection}
                            onChange={e => setAssignSection(e.target.value)}>
                            <option value="">Any / All sections</option>
                            {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                        <label>Assign Faculty <span style={{ color: '#ef4444' }}>*</span></label>
                        <select className="form-control" value={assignFaculty}
                            onChange={e => setAssignFaculty(e.target.value)}>
                            <option value="">— Select Faculty —</option>
                            {faculty.map(f => (
                                <option key={f._id} value={f._id}>
                                    {f.name} ({f.role})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-primary"
                        style={{ padding: '10px 24px', alignSelf: 'flex-end', marginBottom: 2 }}
                        disabled={!assignFaculty}
                        onClick={handleAssign}>
                        <FaUserTie style={{ marginRight: 6 }} /> Assign
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── Main SubjectsPage ────────────────────────────────────────────────────────
const SubjectsPage = () => {
    const { user } = useContext(AuthContext);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(user?.role);
    const isFaculty = ['Faculty', 'ClassTeacher'].includes(user?.role);

    const [subjects, setSubjects] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subjects');
    const [filterDept, setFilterDept] = useState('');
    const [filterSem, setFilterSem] = useState('');

    useEffect(() => { fetchSubjects(); }, [filterDept, filterSem]);
    useEffect(() => { if (isHOD) fetchFaculty(); }, [isHOD]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            if (isFaculty) {
                const res = await api.get('/subjects/my');
                setSubjects(res.data.data);
            } else {
                let q = '?';
                if (filterDept) q += `department=${filterDept}&`;
                if (filterSem) q += `semester=${filterSem}`;
                const res = await api.get(`/subjects${q}`);
                setSubjects(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculty = async () => {
        try {
            const dept = user?.facultyProfile?.department || '';
            const res = await api.get(
                `/analytics/department-users?type=Faculty${dept ? `&department=${dept}` : ''}`
            );
            setFaculty(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this subject?')) return;
        try {
            await api.delete(`/subjects/${id}`);
            toast.success('Subject deleted');
            fetchSubjects();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleUnassign = async (id) => {
        try {
            await api.put(`/subjects/${id}/unassign`);
            toast.success('Faculty unassigned');
            fetchSubjects();
        } catch (err) {
            toast.error('Failed to unassign');
        }
    };

    return (
        <Layout>
            <div className="page-title">📚 Subjects</div>

            {isHOD && (
                <div className="ar-tabs" style={{ marginBottom: 20 }}>
                    <button className={`ar-tab ${activeTab === 'subjects' ? 'ar-tab--active' : ''}`}
                        onClick={() => setActiveTab('subjects')}>
                        <FaBook /> Subject List
                    </button>
                    <button className={`ar-tab ${activeTab === 'assign' ? 'ar-tab--active' : ''}`}
                        onClick={() => setActiveTab('assign')}>
                        <FaUserTie /> Assign Faculty
                    </button>
                </div>
            )}

            {/* ══ ASSIGN FACULTY TAB ══ */}
            {activeTab === 'assign' && isHOD && (
                <AddAssignPanel faculty={faculty} onDone={fetchSubjects} />
            )}

            {/* ══ SUBJECT LIST TAB ══ */}
            {(activeTab === 'subjects' || isFaculty) && (
                <>
                    {isHOD && (
                        <div className="card subj-filter-card">
                            <div className="subj-filter-row">
                                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="form-control">
                                    <option value="">All Branches</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={filterSem} onChange={e => setFilterSem(e.target.value)} className="form-control">
                                    <option value="">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-title">
                            <FaBook /> {isFaculty ? 'My Subjects' : 'All Subjects'} ({subjects.length})
                        </div>
                        {loading ? <p>Loading...</p> : (
                            <div className="table-container">
                                <table className="table subj-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Code</th>
                                            <th>Name</th>
                                            <th>Dept</th>
                                            <th>Year / Sem</th>
                                            <th>Credits</th>
                                            <th>Type</th>
                                            {isHOD && <th>Assigned Faculty</th>}
                                            {isHOD && <th>Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects.length > 0 ? subjects.map((s, i) => (
                                            <tr key={s._id}>
                                                <td>{i + 1}</td>
                                                <td><strong>{s.code}</strong></td>
                                                <td>{s.name}</td>
                                                <td>{s.department}</td>
                                                <td>Y{s.year} / S{s.semester}</td>
                                                <td>{s.credits}</td>
                                                <td>
                                                    <span className={`subj-type subj-type--${s.type?.toLowerCase()}`}>{s.type}</span>
                                                </td>
                                                {isHOD && (
                                                    <td>
                                                        {s.faculty
                                                            ? <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                                                {s.faculty.name}{s.section ? ` · Sec ${s.section}` : ''}
                                                            </span>
                                                            : <span style={{ color: '#94a3b8' }}>—</span>
                                                        }
                                                    </td>
                                                )}
                                                {isHOD && (
                                                    <td style={{ display: 'flex', gap: 6 }}>
                                                        {s.faculty && (
                                                            <button className="btn btn-secondary"
                                                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                                                onClick={() => handleUnassign(s._id)}
                                                                title="Remove faculty assignment">
                                                                <FaTimes />
                                                            </button>
                                                        )}
                                                        <button className="btn ar-remove-btn"
                                                            onClick={() => handleDelete(s._id)}>
                                                            <FaTrash />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={isHOD ? 9 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                                                    {isFaculty
                                                        ? 'No subjects assigned to you yet. Contact your HOD.'
                                                        : 'No subjects found for the selected filters.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </Layout>
    );
};

export default SubjectsPage;
