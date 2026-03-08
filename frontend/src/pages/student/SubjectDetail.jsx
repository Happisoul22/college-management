import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import AuthContext from '../../context/AuthContext';
import api from '../../api/axios';
import {
    FaArrowLeft, FaBook, FaUser, FaEnvelope, FaPhone,
    FaChartBar, FaCalendarCheck, FaAward, FaExclamationTriangle
} from 'react-icons/fa';
import './SubjectDetail.css';

const ATT_COLOR = (pct) => pct >= 75 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

const SubjectDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [subject, setSubject] = useState(null);
    const [marks, setMarks] = useState(null);
    const [attData, setAttData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [subjRes, marksRes, attRes] = await Promise.all([
                    api.get(`/subjects/${id}`),
                    api.get(`/marks?student=${user.id || user._id}&subject=${id}`).catch(() => ({ data: { data: [] } })),
                    api.get(`/attendance/summary/${user.id || user._id}`).catch(() => ({ data: { data: null } })),
                ]);
                setSubject(subjRes.data.data);

                // Marks: first entry for this subject
                const marksArr = marksRes.data.data || [];
                setMarks(marksArr[0] || null);

                // Attendance: find matching subject entry
                const summary = attRes.data.data;
                if (summary?.subjects) {
                    const code = subjRes.data.data?.code;
                    const found = summary.subjects.find(s =>
                        s.subjectCode === code || s.subject === subjRes.data.data?.name
                    );
                    setAttData(found || null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [id, user]);

    if (loading) return (
        <Layout><div className="sdet-loading">Loading subject details...</div></Layout>
    );
    if (!subject) return (
        <Layout><div className="sdet-error">Subject not found.</div></Layout>
    );

    const fp = subject.faculty?.facultyProfile || {};
    const attPct = attData?.percentage ?? null;
    const totalClasses = attData?.total ?? 0;
    const presentClasses = attData?.present ?? 0;

    const midAvg = marks
        ? ((marks.internal?.mid1 || 0) + (marks.internal?.mid2 || 0)) / 2
        : null;

    return (
        <Layout>
            <Link to="/my-subjects" className="sdet-back">
                <FaArrowLeft /> Back to My Subjects
            </Link>

            {/* ── Header ── */}
            <div className={`sdet-header sdet-type--${subject.type?.toLowerCase()}`}>
                <div className="sdet-header-left">
                    <div className="sdet-subject-code">{subject.code}</div>
                    <h2 className="sdet-subject-name">{subject.name}</h2>
                    <div className="sdet-subject-meta">
                        <span className={`sdet-type-badge sdet-badge--${subject.type?.toLowerCase()}`}>{subject.type}</span>
                        <span>Semester {subject.semester}</span>
                        <span>Year {subject.year}</span>
                        <span>{subject.department}</span>
                        <span>{subject.credits} Credits</span>
                    </div>
                </div>
            </div>

            <div className="sdet-body">
                {/* ── LEFT ── */}
                <div className="sdet-left">

                    {/* Faculty Card */}
                    <div className="sdet-card">
                        <div className="sdet-card-title"><FaUser /> Faculty</div>
                        {subject.faculty ? (
                            <div className="sdet-faculty-block">
                                <div className="sdet-fac-avatar">
                                    {subject.faculty.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="sdet-fac-info">
                                    <div className="sdet-fac-name">{subject.faculty.name}</div>
                                    <div className="sdet-fac-sub">
                                        <FaEnvelope /> {subject.faculty.email}
                                    </div>
                                    {fp.phone && (
                                        <div className="sdet-fac-sub">
                                            <FaPhone /> {fp.phone}
                                        </div>
                                    )}
                                    {fp.qualification && (
                                        <div className="sdet-fac-sub sdet-qual">{fp.qualification}</div>
                                    )}
                                    {fp.experience && (
                                        <div className="sdet-fac-sub">{fp.experience} yrs experience</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="sdet-unassigned">Faculty not yet assigned for this subject.</div>
                        )}
                    </div>

                    {/* Attendance Card */}
                    <div className="sdet-card">
                        <div className="sdet-card-title"><FaCalendarCheck /> Attendance</div>
                        {attData ? (
                            <>
                                <div className="sdet-att-ring-wrap">
                                    <div className="sdet-att-ring">
                                        <svg viewBox="0 0 80 80">
                                            <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                            <circle
                                                cx="40" cy="40" r="34"
                                                fill="none"
                                                stroke={ATT_COLOR(attPct)}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 34}`}
                                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - attPct / 100)}`}
                                                transform="rotate(-90 40 40)"
                                            />
                                        </svg>
                                        <div className="sdet-att-pct" style={{ color: ATT_COLOR(attPct) }}>
                                            {attPct}%
                                        </div>
                                    </div>
                                </div>
                                <div className="sdet-att-stats">
                                    <div className="sdet-att-stat"><span>{totalClasses}</span>Total Classes</div>
                                    <div className="sdet-att-stat"><span>{presentClasses}</span>Present</div>
                                    <div className="sdet-att-stat"><span>{totalClasses - presentClasses}</span>Absent</div>
                                </div>
                                {attPct < 75 && (
                                    <div className="sdet-att-warning">
                                        <FaExclamationTriangle /> Attendance below 75% — at risk!
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="sdet-unassigned">No attendance data recorded yet.</div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT ── */}
                <div className="sdet-right">
                    {/* Marks Card */}
                    <div className="sdet-card">
                        <div className="sdet-card-title"><FaChartBar /> Internal Marks</div>
                        {marks ? (
                            <>
                                <div className="sdet-marks-grid">
                                    <div className="sdet-marks-item sdet-marks--mid1">
                                        <div className="sdet-marks-label">Mid-1</div>
                                        <div className="sdet-marks-val">{marks.internal?.mid1 ?? '—'}</div>
                                        <div className="sdet-marks-max">/ 30</div>
                                    </div>
                                    <div className="sdet-marks-item sdet-marks--mid2">
                                        <div className="sdet-marks-label">Mid-2</div>
                                        <div className="sdet-marks-val">{marks.internal?.mid2 ?? '—'}</div>
                                        <div className="sdet-marks-max">/ 30</div>
                                    </div>
                                    <div className="sdet-marks-item sdet-marks--assign">
                                        <div className="sdet-marks-label">Assignments</div>
                                        <div className="sdet-marks-val">{marks.internal?.assignments ?? '—'}</div>
                                        <div className="sdet-marks-max">/ 10</div>
                                    </div>
                                    <div className="sdet-marks-item sdet-marks--internal">
                                        <div className="sdet-marks-label">Internal Total</div>
                                        <div className="sdet-marks-val sdet-marks-big">{marks.internalTotal ?? '—'}</div>
                                        <div className="sdet-marks-max">/ 40</div>
                                    </div>
                                </div>

                                <div className="sdet-marks-bar-wrap">
                                    <div className="sdet-marks-bar-label">
                                        <span>Internal Score</span>
                                        <span>{marks.internalTotal ?? 0} / 40</span>
                                    </div>
                                    <div className="sdet-marks-bar">
                                        <div
                                            className="sdet-marks-bar-fill"
                                            style={{ width: `${((marks.internalTotal || 0) / 40) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {marks.externalTotal != null && (
                                    <div className="sdet-ext-marks">
                                        <div className="sdet-ext-label">External Marks</div>
                                        <div className="sdet-ext-val">
                                            {marks.externalTotal} <span>/ 60</span>
                                        </div>
                                    </div>
                                )}

                                {marks.grade && (
                                    <div className="sdet-grade-row">
                                        <FaAward />
                                        <span className={`sdet-grade sdet-grade--${marks.grade?.replace('+', 'plus')}`}>
                                            {marks.grade}
                                        </span>
                                        <span className="sdet-total-marks">Total: {marks.totalMarks ?? '—'} / 100</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="sdet-unassigned">Marks not yet entered for this subject.</div>
                        )}
                    </div>

                    {/* Subject info card */}
                    <div className="sdet-card sdet-info-card">
                        <div className="sdet-card-title"><FaBook /> Subject Info</div>
                        <div className="sdet-info-grid">
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Subject Code</div>
                                <div className="sdet-info-val">{subject.code}</div>
                            </div>
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Department</div>
                                <div className="sdet-info-val">{subject.department}</div>
                            </div>
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Semester</div>
                                <div className="sdet-info-val">{subject.semester}</div>
                            </div>
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Year</div>
                                <div className="sdet-info-val">{subject.year}</div>
                            </div>
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Credits</div>
                                <div className="sdet-info-val">{subject.credits}</div>
                            </div>
                            <div className="sdet-info-item">
                                <div className="sdet-info-label">Type</div>
                                <div className="sdet-info-val">{subject.type}</div>
                            </div>
                            {subject.section && (
                                <div className="sdet-info-item">
                                    <div className="sdet-info-label">Section</div>
                                    <div className="sdet-info-val">{subject.section}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SubjectDetail;
