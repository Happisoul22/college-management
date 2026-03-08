import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { FaCalendarCheck, FaSave, FaSearch, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BlockchainBadge from '../../components/BlockchainBadge';
import './AttendanceMarking.css';

const AttendanceMarking = () => {
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedSubjectInfo, setSelectedSubjectInfo] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState(1);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            // Only load subjects assigned to this faculty member
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
            const dept = subj?.department || department;
            const stuRes = await api.get(`/analytics/department-users?type=Student${dept ? `&department=${dept}` : ''}`);
            let stuList = stuRes.data.data || [];

            // Filter students by the subject's semester (using admissionYear to derive current semester)
            if (subj?.semester) {
                const now = new Date();
                const currentMonth = now.getMonth() + 1; // 1-12
                const currentYear = now.getFullYear();

                stuList = stuList.filter(stu => {
                    const admissionYear = stu.studentProfile?.admissionYear;
                    if (!admissionYear) return false;
                    const yearDiff = currentYear - admissionYear;
                    // Mirror backend semester virtual logic
                    const stuSemester = currentMonth >= 7
                        ? (yearDiff * 2) + 1
                        : (yearDiff * 2);
                    const effectiveSem = stuSemester > 0 ? stuSemester : 1;
                    return effectiveSem === subj.semester;
                });
            }

            // Further filter by section if the subject has one specified
            if (subj?.section) {
                stuList = stuList.filter(stu =>
                    !stu.studentProfile?.section || stu.studentProfile.section === subj.section
                );
            }

            setStudents(stuList);
            // Default all to Present
            const data = {};
            stuList.forEach(s => { data[s.id || s._id] = 'Present'; });
            // Check existing attendance
            try {
                const attRes = await api.get(`/attendance?subject=${selectedSubject}&date=${date}`);
                (attRes.data.data || []).forEach(a => {
                    const sid = a.student?.id || a.student?._id || a.student;
                    if (data[sid] !== undefined) data[sid] = a.status;
                });
            } catch (e) { /* no existing attendance */ }
            setAttendanceData(data);
            setLoaded(true);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };


    const toggleStatus = (studentId) => {
        setAttendanceData(prev => {
            const current = prev[studentId];
            const next = current === 'Present' ? 'Absent' : current === 'Absent' ? 'OD' : 'Present';
            return { ...prev, [studentId]: next };
        });
    };

    const markAllPresent = () => {
        const data = {};
        students.forEach(s => { data[s.id || s._id] = 'Present'; });
        setAttendanceData(data);
    };

    const saveAttendance = async () => {
        if (!selectedSubject) return;
        setSaving(true);
        try {
            const entries = Object.entries(attendanceData).map(([student, status]) => ({ student, status }));
            await api.post('/attendance', {
                subject: selectedSubject,
                date,
                period,
                entries
            });
            toast.success('Attendance saved successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const counts = {
        present: Object.values(attendanceData).filter(s => s === 'Present').length,
        absent: Object.values(attendanceData).filter(s => s === 'Absent').length,
        od: Object.values(attendanceData).filter(s => s === 'OD').length,
    };


    return (
        <Layout>
            <div className="page-title">📋 Attendance Marking</div>

            <div className="card att-filter-card">
                <div className="card-title">Select Subject & Date</div>
                <div className="att-filter-row">
                    <div className="att-filter-field">
                        <label>Subject</label>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="form-control">
                            <option value="">— Select —</option>
                            {subjects.length === 0
                                ? <option disabled>No subjects assigned to you yet</option>
                                : subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.code} — {s.name}</option>)
                            }
                        </select>
                    </div>
                    <div className="att-filter-field att-date-field">
                        <label>Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-control" max={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="att-filter-field att-period-field">
                        <label>Period</label>
                        <select value={period} onChange={e => setPeriod(Number(e.target.value))} className="form-control">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <option key={p} value={p}>Period {p}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary att-load-btn" onClick={loadStudents}>
                        <FaSearch /> Load
                    </button>
                </div>
            </div>

            {students.length > 0 && (
                <div className="card att-main-card">
                    <div className="att-header">
                        <div className="card-title" style={{ marginBottom: 0 }}>
                            <FaCalendarCheck /> {selectedSubjectInfo?.code} — {date} — Period {period}
                        </div>
                        <div className="att-actions">
                            <button className="btn att-btn-all" onClick={markAllPresent}>
                                <FaCheckCircle /> Mark All Present
                            </button>
                            <button className="btn btn-primary" onClick={saveAttendance} disabled={saving}>
                                <FaSave /> {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    </div>

                    {/* Summary Chips */}
                    <div className="att-summary">
                        <span className="att-chip att-chip--present">Present: {counts.present}</span>
                        <span className="att-chip att-chip--absent">Absent: {counts.absent}</span>
                        <span className="att-chip att-chip--od">OD: {counts.od}</span>
                        <span className="att-chip att-chip--total">Total: {students.length}</span>
                    </div>

                    <div className="att-grid">
                        {students.map((stu, i) => (
                            <div
                                key={stu.id || stu._id}
                                className={`att-student-card att-status--${(attendanceData[stu.id || stu._id] || 'Present').toLowerCase()}`}
                                onClick={() => toggleStatus(stu.id || stu._id)}
                            >
                                <div className="att-student-num">{i + 1}</div>
                                <div className="att-student-info">
                                    <div className="att-student-name">{stu.name}</div>
                                    <div className="att-student-roll">{stu.studentProfile?.rollNumber || '—'}</div>
                                </div>
                                <div className={`att-status-badge att-badge--${(attendanceData[stu.id || stu._id] || 'Present').toLowerCase()}`}>
                                    {attendanceData[stu.id || stu._id] || 'Present'}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="att-hint">Click a student card to cycle: Present → Absent → OD → Present</p>
                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>🔗 Blockchain Status:</span>
                        <BlockchainBadge type="attendance" recordId="status" compact showButton={false} />
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Records are hashed on-chain after saving</span>
                    </div>
                </div>
            )}

            {!loading && loaded && students.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    No students found for Semester {selectedSubjectInfo?.semester} in {selectedSubjectInfo?.department}.
                    <br /><small>Check that students have their <strong>Admission Year</strong> set correctly.</small>
                </div>
            )}

            {loading && <div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading students...</div>}
        </Layout>
    );
};

export default AttendanceMarking;
