import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaBook, FaFlask, FaProjectDiagram, FaMicrophone } from 'react-icons/fa';
import './MySubjects.css';

const TYPE_ICONS = {
    Theory: <FaBook />,
    Lab: <FaFlask />,
    Project: <FaProjectDiagram />,
    Seminar: <FaMicrophone />,
};

// Compute current semester from admissionYear
const computeSemester = (admissionYear) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const yearDiff = currentYear - admissionYear;
    const sem = currentMonth >= 7 ? (yearDiff * 2) + 1 : (yearDiff * 2);
    return Math.max(1, Math.min(sem, 8));
};

const MySubjects = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [maxSem, setMaxSem] = useState(null);
    const [selectedSem, setSelectedSem] = useState(null);
    const [branch, setBranch] = useState(null);

    useEffect(() => {
        const admYear = user?.studentProfile?.admissionYear;
        const br = user?.studentProfile?.branch;
        setBranch(br);
        if (admYear) {
            const sem = computeSemester(admYear);
            setMaxSem(sem);
            setSelectedSem(sem);
            fetchSubjects(br, sem);
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchSubjects = async (dept, sem) => {
        setLoading(true);
        try {
            // Map branch names to the short department codes used in subject strings
            let deptCode = dept;
            if (dept === 'Computer Science and Engineering') deptCode = 'CSE';
            else if (dept === 'Electronics and Communication Engineering') deptCode = 'ECE';
            else if (dept === 'Mechanical Engineering') deptCode = 'ME';
            else if (dept === 'Civil Engineering') deptCode = 'CE';
            else if (dept === 'Electrical and Electronics Engineering') deptCode = 'EEE';

            const params = new URLSearchParams();
            if (deptCode) params.append('department', deptCode);
            if (sem) params.append('semester', sem);
            const res = await api.get(`/subjects?${params}`);
            setSubjects(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSemChange = (sem) => {
        setSelectedSem(sem);
        fetchSubjects(branch, sem);
    };

    return (
        <Layout>
            <div className="msub-header">
                <div className="msub-title-block">
                    <div className="page-title">My Subjects</div>
                    {selectedSem && branch && (
                        <div className="msub-meta-badge">
                            <span>{branch}</span>
                            <span className="msub-sep">·</span>
                            <span>Semester {selectedSem}</span>
                        </div>
                    )}
                </div>

                {/* Semester switcher */}
                {maxSem && (
                    <div className="msub-sem-selector">
                        {Array.from({ length: maxSem }, (_, i) => i + 1).map(sem => (
                            <button
                                key={sem}
                                className={`msub-sem-btn ${selectedSem === sem ? 'msub-sem-btn--active' : ''}`}
                                onClick={() => handleSemChange(sem)}
                            >
                                Sem {sem}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="msub-loading">Loading subjects...</div>
            ) : !user?.studentProfile?.admissionYear ? (
                <div className="msub-empty">
                    <FaBook className="msub-empty-icon" />
                    <p>Your admission year is not set. Contact your HOD to update your profile.</p>
                </div>
            ) : subjects.length === 0 ? (
                <div className="msub-empty">
                    <FaBook className="msub-empty-icon" />
                    <p>No subjects found for Semester {selectedSem} in {branch}.</p>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4 }}>
                        Try selecting a different semester above, or ask your HOD to add subjects for this semester.
                    </p>
                </div>
            ) : (
                <>
                    <div className="msub-count-bar">
                        {subjects.length} subject{subjects.length !== 1 ? 's' : ''} this semester
                    </div>
                    <div className="msub-grid">
                        {subjects.map(subj => (
                            <div
                                key={subj.id || subj._id}
                                className={`msub-card msub-type--${subj.type?.toLowerCase()}`}
                                onClick={() => navigate(`/my-subjects/${subj.id || subj._id}`)}
                            >
                                <div className="msub-card-top">
                                    <div className="msub-type-icon">{TYPE_ICONS[subj.type] || <FaBook />}</div>
                                    <span className={`msub-type-badge msub-badge--${subj.type?.toLowerCase()}`}>{subj.type}</span>
                                </div>

                                <div className="msub-card-code">{subj.code}</div>
                                <div className="msub-card-name">{subj.name}</div>

                                <div className="msub-card-footer">
                                    <div className="msub-faculty-row">
                                        {subj.faculty ? (
                                            <>
                                                <div className="msub-faculty-avatar">
                                                    {subj.faculty.name?.charAt(0)}
                                                </div>
                                                <span className="msub-faculty-name">{subj.faculty.name}</span>
                                            </>
                                        ) : (
                                            <span className="msub-no-faculty">Faculty not assigned</span>
                                        )}
                                    </div>
                                    <div className="msub-credits-pill">{subj.credits} cr</div>
                                </div>

                                <div className="msub-card-arrow">View Details →</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Layout>
    );
};

export default MySubjects;
