import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import { FaBook, FaChalkboardTeacher, FaFlask, FaProjectDiagram, FaMicrophone } from 'react-icons/fa';
import './MySubjects.css';

const TYPE_ICONS = {
    Theory: <FaBook />,
    Lab: <FaFlask />,
    Project: <FaProjectDiagram />,
    Seminar: <FaMicrophone />,
};

const MySEMESTER_LABEL = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
};

// Compute current semester from admissionYear (mirrors backend virtual)
const computeSemester = (admissionYear) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const yearDiff = currentYear - admissionYear;
    const sem = currentMonth >= 7 ? (yearDiff * 2) + 1 : (yearDiff * 2);
    return sem > 0 ? sem : 1;
};

const MySubjects = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentSem, setCurrentSem] = useState(null);
    const [branch, setBranch] = useState(null);

    useEffect(() => {
        // Derive branch and semester from the logged-in student profile
        const admYear = user?.studentProfile?.admissionYear;
        const br = user?.studentProfile?.branch;
        setBranch(br);
        if (admYear) {
            const sem = computeSemester(admYear);
            setCurrentSem(sem);
            fetchSubjects(br, sem);
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchSubjects = async (dept, sem) => {
        try {
            const params = new URLSearchParams();
            if (dept) params.append('department', dept);
            if (sem) params.append('semester', sem);
            const res = await api.get(`/subjects?${params}`);
            setSubjects(res.data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="msub-header">
                <div className="msub-title-block">
                    <div className="page-title">My Subjects</div>
                    {currentSem && branch && (
                        <div className="msub-meta-badge">
                            <span>{branch}</span>
                            <span className="msub-sep">·</span>
                            <span>Semester {currentSem}</span>
                        </div>
                    )}
                </div>
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
                    <p>No subjects found for Semester {currentSem} in {branch}.</p>
                </div>
            ) : (
                <>
                    <div className="msub-count-bar">
                        {subjects.length} subject{subjects.length !== 1 ? 's' : ''} this semester
                    </div>
                    <div className="msub-grid">
                        {subjects.map(subj => (
                            <div
                                key={subj._id}
                                className={`msub-card msub-type--${subj.type?.toLowerCase()}`}
                                onClick={() => navigate(`/my-subjects/${subj._id}`)}
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
