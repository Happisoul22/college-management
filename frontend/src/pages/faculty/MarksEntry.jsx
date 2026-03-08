import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { FaPen, FaSave, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BlockchainBadge from '../../components/BlockchainBadge';
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
            const subj = subjects.find(s => (s.id || s._id) === selectedSubject);
            setSelectedSubjectInfo(subj);
            // Get students filtered by department, section, and year
            let stuUrl = `/analytics/department-users?type=Student`;
            if (subj?.department) stuUrl += `&department=${subj.department}`;
            if (subj?.section) stuUrl += `&section=${subj.section}`;
            if (subj?.year) stuUrl += `&year=${subj.year}`;
            const stuRes = await api.get(stuUrl);
            setStudents(stuRes.data.data || []);
            // Get existing marks
            const marksRes = await api.get(`/marks?subject=${selectedSubject}&academicYear=${academicYear}`);
            const existing = marksRes.data.data || [];
            setExistingMarks(existing);
            // Pre-fill marks data
            const data = {};
            existing.forEach(m => {
                const sid = m.studentId || m.student?.id || m.student?._id || m.student;
                data[sid] = {
                    assignment1: m.internal?.assignment1 || 0,
                    assignment2: m.internal?.assignment2 || 0
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
                    assignment1: marks.assignment1 || 0,
                    assignment2: marks.assignment2 || 0
                },
                external: {}
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
                                <option key={s.id || s._id} value={s.id || s._id}>{s.code} — {s.name} (Sem {s.semester}{s.section ? `, Sec ${s.section}` : ''})</option>
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
                                    <th>Assignment 1 (50)</th>
                                    <th>Assignment 2 (50)</th>
                                    <th>Total</th>
                                    <th>🔗</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((stu, i) => {
                                    const m = marksData[stu.id || stu._id] || {};
                                    const total = (m.assignment1 || 0) + (m.assignment2 || 0);
                                    return (
                                        <tr key={stu.id || stu._id}>
                                            <td>{i + 1}</td>
                                            <td><strong>{stu.name}</strong></td>
                                            <td>{stu.studentProfile?.rollNumber || '—'}</td>
                                            <td>
                                                <input type="number" min="0" max="50" className="me-input"
                                                    value={m.assignment1 || ''} onChange={e => handleMarkChange(stu.id || stu._id, 'assignment1', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" max="50" className="me-input"
                                                    value={m.assignment2 || ''} onChange={e => handleMarkChange(stu.id || stu._id, 'assignment2', e.target.value)} />
                                            </td>
                                            <td className="me-total">{total}</td>
                                            <td>
                                                {existingMarks.find(em => (em.studentId || em.student?.id || em.student?._id || em.student) === (stu.id || stu._id)) && (
                                                    <BlockchainBadge
                                                        type="marks"
                                                        recordId={existingMarks.find(em => (em.studentId || em.student?.id || em.student?._id || em.student) === (stu.id || stu._id)).id || existingMarks.find(em => (em.studentId || em.student?.id || em.student?._id || em.student) === (stu.id || stu._id))._id}
                                                        compact
                                                        showButton={false}
                                                    />
                                                )}
                                            </td>
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
