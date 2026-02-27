import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import {
    FaArrowLeft, FaIdBadge, FaPhone, FaGraduationCap,
    FaBriefcase, FaBuilding, FaCalendarAlt, FaBook,
    FaChalkboardTeacher, FaEnvelope, FaLayerGroup
} from 'react-icons/fa';
import './FacultyProfile.css';

const ROLE_COLORS = {
    HOD: '#f97316',
    ClassTeacher: '#22c55e',
    Faculty: '#3b82f6',
};

const FacultyProfile = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get(`/analytics/faculty/${id}`);
                setData(res.data.data);
            } catch (err) {
                console.error(err);
                setError('Could not load faculty profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    if (loading) return (
        <Layout>
            <div className="fp-loading">Loading faculty profile...</div>
        </Layout>
    );

    if (error || !data) return (
        <Layout>
            <div className="fp-error">{error || 'Faculty not found.'}</div>
        </Layout>
    );

    const { faculty, classAssignment, subjects } = data;
    const fp = faculty.facultyProfile || {};
    const roleColor = ROLE_COLORS[faculty.role] || '#64748b';

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Group subjects by semester
    const subjectsBySem = {};
    subjects.forEach(s => {
        if (!subjectsBySem[s.semester]) subjectsBySem[s.semester] = [];
        subjectsBySem[s.semester].push(s);
    });

    return (
        <Layout>
            <Link to="/dashboard" className="fp-back-link">
                <FaArrowLeft /> Back to Dashboard
            </Link>

            {/* ── HEADER CARD ── */}
            <div className="fp-header-card">
                <div className="fp-avatar">
                    {faculty.name?.charAt(0)?.toUpperCase() || 'F'}
                </div>
                <div className="fp-header-info">
                    <h2 className="fp-name">{faculty.name}</h2>
                    <div className="fp-meta">
                        <span><FaEnvelope /> {faculty.email}</span>
                        <span><FaIdBadge /> {fp.facultyId || '—'}</span>
                        <span>
                            <span className="fp-role-badge" style={{ background: roleColor }}>
                                {faculty.role}
                            </span>
                        </span>
                    </div>
                </div>
                {/* Stat pills */}
                <div className="fp-stat-pills">
                    <div className="fp-stat-pill">
                        <div className="fp-pill-value">{fp.experience || 0}</div>
                        <div className="fp-pill-label">Yrs Exp.</div>
                    </div>
                    <div className="fp-stat-pill">
                        <div className="fp-pill-value">{subjects.length}</div>
                        <div className="fp-pill-label">Subjects</div>
                    </div>
                    <div className="fp-stat-pill">
                        <div className="fp-pill-value">{Object.keys(subjectsBySem).length}</div>
                        <div className="fp-pill-label">Semesters</div>
                    </div>
                </div>
            </div>

            <div className="fp-body">
                {/* ── LEFT COLUMN ── */}
                <div className="fp-left">

                    {/* Personal Info */}
                    <div className="fp-card">
                        <div className="fp-card-title"><FaIdBadge /> Faculty Details</div>
                        <div className="fp-detail-grid">
                            <div className="fp-detail-item">
                                <FaPhone className="fp-detail-icon" />
                                <div>
                                    <div className="fp-detail-label">Phone</div>
                                    <div className="fp-detail-value">{fp.phone || '—'}</div>
                                </div>
                            </div>
                            <div className="fp-detail-item">
                                <FaGraduationCap className="fp-detail-icon" />
                                <div>
                                    <div className="fp-detail-label">Qualification</div>
                                    <div className="fp-detail-value">{fp.qualification || '—'}</div>
                                </div>
                            </div>
                            <div className="fp-detail-item">
                                <FaBriefcase className="fp-detail-icon" />
                                <div>
                                    <div className="fp-detail-label">Experience</div>
                                    <div className="fp-detail-value">{fp.experience ? `${fp.experience} years` : '—'}</div>
                                </div>
                            </div>
                            <div className="fp-detail-item">
                                <FaBuilding className="fp-detail-icon" />
                                <div>
                                    <div className="fp-detail-label">Department</div>
                                    <div className="fp-detail-value">{fp.department || '—'}</div>
                                </div>
                            </div>
                            <div className="fp-detail-item">
                                <FaCalendarAlt className="fp-detail-icon" />
                                <div>
                                    <div className="fp-detail-label">Date of Joining</div>
                                    <div className="fp-detail-value">{formatDate(fp.dateOfJoining)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Class Teacher Assignment */}
                    <div className="fp-card">
                        <div className="fp-card-title"><FaChalkboardTeacher /> Class Teacher Assignment</div>
                        {classAssignment ? (
                            <div className="fp-ct-grid">
                                <div className="fp-ct-item">
                                    <div className="fp-ct-label">Section</div>
                                    <div className="fp-ct-value fp-ct-section">{classAssignment.section}</div>
                                </div>
                                <div className="fp-ct-item">
                                    <div className="fp-ct-label">Year</div>
                                    <div className="fp-ct-value">{ordinal(classAssignment.year)} Year</div>
                                </div>
                                <div className="fp-ct-item">
                                    <div className="fp-ct-label">Semester</div>
                                    <div className="fp-ct-value">Semester {classAssignment.semester}</div>
                                </div>
                                <div className="fp-ct-item">
                                    <div className="fp-ct-label">Department</div>
                                    <div className="fp-ct-value">{classAssignment.department}</div>
                                </div>
                                <div className="fp-ct-item fp-ct-wide">
                                    <div className="fp-ct-label">Academic Year</div>
                                    <div className="fp-ct-value">{classAssignment.academicYear}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="fp-empty-state">
                                <FaChalkboardTeacher className="fp-empty-icon" />
                                <p>Not assigned as Class Teacher</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN — Subjects ── */}
                <div className="fp-right">
                    <div className="fp-card fp-subjects-card">
                        <div className="fp-card-title"><FaBook /> Teaching Subjects</div>

                        {subjects.length === 0 ? (
                            <div className="fp-empty-state">
                                <FaBook className="fp-empty-icon" />
                                <p>No subjects assigned yet</p>
                            </div>
                        ) : (
                            Object.entries(subjectsBySem).sort(([a], [b]) => a - b).map(([sem, semSubjects]) => (
                                <div key={sem} className="fp-sem-group">
                                    <div className="fp-sem-header">
                                        <FaLayerGroup /> Semester {sem}
                                        <span className="fp-sem-count">{semSubjects.length} subject{semSubjects.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="fp-subjects-grid">
                                        {semSubjects.map(subj => (
                                            <div key={subj._id} className="fp-subject-card">
                                                <div className="fp-subj-code">{subj.code}</div>
                                                <div className="fp-subj-name">{subj.name}</div>
                                                <div className="fp-subj-meta">
                                                    <span className={`fp-subj-type fp-type--${subj.type?.toLowerCase()}`}>{subj.type}</span>
                                                    <span className="fp-subj-credits">{subj.credits} cr</span>
                                                    {subj.section && <span className="fp-subj-section">Sec {subj.section}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FacultyProfile;
