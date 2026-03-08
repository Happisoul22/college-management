import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaUsers, FaSearch, FaDownload, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './MyStudents.css';

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

const MyStudents = () => {
    const { user } = useContext(AuthContext);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [classAssignments, setClassAssignments] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Get class assignments for this faculty
            const assignRes = await api.get('/assignments/class/my');
            const assignments = assignRes.data.data || [];
            setClassAssignments(assignments);

            // Get all students in department
            const dept = user?.facultyProfile?.department || '';
            const stuRes = await api.get(`/analytics/department-users?type=Student${dept ? `&department=${dept}` : ''}`);
            const allStudents = stuRes.data.data || [];

            if (assignments.length > 0) {
                // Only show students in the class teacher's assigned year+section
                const filtered = allStudents.filter(s => {
                    const studentYear = getYearFromAdmission(s.studentProfile?.admissionYear);
                    return assignments.some(
                        a => Number(a.year) === studentYear && a.section === s.studentProfile?.section
                    );
                });
                setStudents(filtered);
            } else {
                // Not a class teacher — show all dept students (HOD / unassigned)
                setStudents(allStudents);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    // Derive unique sections dynamically from loaded students
    const availableSections = [...new Set(
        students.map(s => s.studentProfile?.section).filter(Boolean)
    )].sort();

    const filteredStudents = students.filter(s => {
        const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.studentProfile?.rollNumber?.toLowerCase().includes(search.toLowerCase());
        const matchYear = !yearFilter || String(getYearFromAdmission(s.studentProfile?.admissionYear)) === yearFilter;
        const matchSection = !sectionFilter || s.studentProfile?.section === sectionFilter;
        return matchSearch && matchYear && matchSection;
    });

    return (
        <Layout>
            <div className="page-title">👥 My Students</div>

            {/* Class Assignments Info */}
            {classAssignments.length > 0 && (
                <div className="ms-assignments-bar">
                    <span className="ms-assign-label">Assigned as Class Teacher:</span>
                    {classAssignments.map(a => (
                        <span key={a._id} className="ms-assign-chip">
                            Year {a.year} — Sem {a.semester} — Sec {a.section}
                        </span>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="card ms-filter-card">
                <div className="ms-filter-row">
                    <div className="ms-search">
                        <FaSearch className="ms-search-icon" />
                        <input
                            type="text" placeholder="Search by name or roll number..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="form-control ms-search-input"
                        />
                    </div>
                    <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="form-control ms-year-select">
                        <option value="">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                    </select>
                    <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="form-control ms-year-select">
                        <option value="">All Sections</option>
                        {availableSections.map(sec => (
                            <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="card">
                <div className="card-title"><FaUsers /> Students ({filteredStudents.length})</div>
                {loading ? <p>Loading...</p> : (
                    <div className="table-container">
                        <table className="table ms-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Roll Number</th>
                                    <th>Section</th>
                                    <th>Year</th>
                                    <th>Email</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length > 0 ? filteredStudents.map((stu, i) => (
                                    <tr key={stu.id}>
                                        <td>{i + 1}</td>
                                        <td><strong>{stu.name}</strong></td>
                                        <td>{stu.studentProfile?.rollNumber || '—'}</td>
                                        <td>{stu.studentProfile?.section || '—'}</td>
                                        <td>{getYearFromAdmission(stu.studentProfile?.admissionYear) || '—'}</td>
                                        <td>{stu.email}</td>
                                        <td>
                                            <Link to={`/student-profile/${stu.id}`} className="btn ms-view-btn">
                                                <FaEye /> View Profile
                                            </Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center' }}>No students found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MyStudents;
