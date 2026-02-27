import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { FaPen, FaSave, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './MarksEntry.css';

const MarksEntry = () => {
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedSubjectInfo, setSelectedSubjectInfo] = useState(null);
    const [academicYear, setAcademicYear] = useState('2024-25');
    const [marksData, setMarksData] = useState({});
    const [existingMarks, setExistingMarks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchSubjects(); }, []);

    const fetchSubjects = async () => {
        try {
            // Only show subjects assigned to this faculty
            const res = await api.get('/subjects/my');
            setSubjects(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadStudents = async () => {
        if (!selectedSubject) return toast.warn('Please select a subject');
        setLoading(true);
        try {
            const subj = subjects.find(s => s._id === selectedSubject);
            setSelectedSubjectInfo(subj);
            // Get students in the department
            const stuRes = await api.get(`/analytics/department-users?type=Student${subj?.department ? `&department=${subj.department}` : ''}`);
            setStudents(stuRes.data.data || []);
            // Get existing marks
            const marksRes = await api.get(`/marks?subject=${selectedSubject}&academicYear=${academicYear}`);
            const existing = marksRes.data.data || [];
            setExistingMarks(existing);
            // Pre-fill marks data
            const data = {};
            existing.forEach(m => {
                data[m.student?._id || m.student] = {
                    mid1: m.internal?.mid1 || 0,
                    mid2: m.internal?.mid2 || 0,
                    assignments: m.internal?.assignments || 0,
                    attendance: m.internal?.attendance || 0,
                    examScore: m.external?.examScore || 0
                };
            });
            setMarksData(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, field, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: Number(value) || 0
            }
        }));
    };

    const saveMarks = async () => {
        if (!selectedSubject || !selectedSubjectInfo) return;
        setSaving(true);
        try {
            const entries = Object.entries(marksData).map(([studentId, marks]) => ({
                student: studentId,
                internal: {
                    mid1: marks.mid1 || 0,
                    mid2: marks.mid2 || 0,
                    assignments: marks.assignments || 0,
                    attendance: marks.attendance || 0
                },
                external: {
                    examScore: marks.examScore || 0
                }
            }));
            await api.post('/marks/bulk', {
                subject: selectedSubject,
                semester: selectedSubjectInfo.semester,
                year: selectedSubjectInfo.year,
                academicYear,
                entries
            });
            toast.success('Marks saved successfully!');
            loadStudents(); // Refresh
        } catch (err) {
            console.error(err);
            toast.error('Failed to save marks');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="page-title">📝 Marks Entry</div>

            {/* Filter Bar */}
            <div className="card me-filter-card">
                <div className="card-title">Select Subject &amp; Load Students</div>
                <div className="me-filter-row">
                    <div className="me-filter-field">
                        <label>Subject</label>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="form-control">
                            <option value="">— Select Subject —</option>
                            {subjects.length === 0 && <option disabled>No subjects assigned to you yet</option>}
                            {subjects.map(s => (
                                <option key={s._id} value={s._id}>{s.code} — {s.name} (Sem {s.semester}{s.section ? `, Sec ${s.section}` : ''})</option>
                            ))}
                        </select>
                    </div>
                    <div className="me-filter-field">
                        <label>Academic Year</label>
                        <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="form-control">
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2025-26">2025-26</option>
                        </select>
                    </div>
                    <button className="btn btn-primary me-load-btn" onClick={loadStudents}>
                        <FaSearch /> Load Students
                    </button>
                </div>
            </div>

            {/* Marks Table */}
            {students.length > 0 && (
                <div className="card me-marks-card">
                    <div className="me-marks-header">
                        <div className="card-title">
                            <FaPen /> {selectedSubjectInfo?.code} — {selectedSubjectInfo?.name}
                            <span className="me-badge">Sem {selectedSubjectInfo?.semester} | {selectedSubjectInfo?.credits} Credits</span>
                        </div>
                        <button className="btn btn-primary" onClick={saveMarks} disabled={saving}>
                            <FaSave /> {saving ? 'Saving...' : 'Save All Marks'}
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="table me-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student Name</th>
                                    <th>Roll No</th>
                                    <th>Mid-1 (30)</th>
                                    <th>Mid-2 (30)</th>
                                    <th>Assignments (20)</th>
                                    <th>Attendance (10)</th>
                                    <th>External (100)</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((stu, i) => {
                                    const m = marksData[stu._id] || {};
                                    const total = (m.mid1 || 0) + (m.mid2 || 0) + (m.assignments || 0) + (m.attendance || 0) + (m.examScore || 0);
                                    return (
                                        <tr key={stu._id}>
                                            <td>{i + 1}</td>
                                            <td><strong>{stu.name}</strong></td>
                                            <td>{stu.studentProfile?.rollNumber || '—'}</td>
                                            <td>
                                                <input type="number" min="0" max="30" className="me-input"
                                                    value={m.mid1 || ''} onChange={e => handleMarkChange(stu._id, 'mid1', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="30" className="me-input"
                                                    value={m.mid2 || ''} onChange={e => handleMarkChange(stu._id, 'mid2', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="20" className="me-input"
                                                    value={m.assignments || ''} onChange={e => handleMarkChange(stu._id, 'assignments', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="10" className="me-input"
                                                    value={m.attendance || ''} onChange={e => handleMarkChange(stu._id, 'attendance', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="100" className="me-input"
                                                    value={m.examScore || ''} onChange={e => handleMarkChange(stu._id, 'examScore', e.target.value)} />
                                            </td>
                                            <td className="me-total">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading students...</div>}
        </Layout>
    );
};

export default MarksEntry;
