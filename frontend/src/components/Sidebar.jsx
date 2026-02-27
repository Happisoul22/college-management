import { Link, useLocation } from 'react-router-dom';
import {
    FaClipboardList, FaFileAlt, FaChartPie, FaChartBar,
    FaSignOutAlt, FaHome, FaUserGraduate, FaChalkboardTeacher,
    FaPen, FaCalendarCheck, FaUsers, FaUsersCog, FaBook
} from 'react-icons/fa';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

/* Inline SRIT Logo SVG */
const SRITEmblem = () => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <circle cx="20" cy="20" r="19" stroke="white" strokeWidth="1.5" fill="none" />
        <path d="M10 28 L20 8 L30 28 Z" fill="white" opacity="0.9" />
        <rect x="14" y="21" width="12" height="2.5" fill="#0d2b5e" rx="1" />
        <circle cx="20" cy="15" r="3.5" fill="#f4a820" />
        <path d="M7 30 L33 30" stroke="white" strokeWidth="1.5" />
    </svg>
);

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const isActive = (path) => location.pathname === path ? 'active' : '';
    const isFaculty = ['Faculty', 'HOD', 'Principal', 'ClassTeacher', 'Admin'].includes(user?.role);
    const isHOD = ['HOD', 'Principal', 'Admin'].includes(user?.role);
    const isClassTeacher = user?.role === 'ClassTeacher' || isHOD;

    return (
        <div className="sidebar">
            {/* ---- Logo Header ---- */}
            <div className="sidebar-header">
                <div className="sidebar-logo-icon">
                    <SRITEmblem />
                </div>
                <div className="sidebar-logo-text">
                    <div className="logo-title">SRIT Portal</div>
                    <div className="logo-subtitle">Academic Analytics</div>
                </div>
            </div>

            {/* ---- User Profile Badge ---- */}
            {user && (
                <div className="sidebar-profile">
                    <div className="sidebar-profile-avatar">
                        {user.facultyProfile?.photo ? (
                            <img src={user.facultyProfile.photo} alt={user.name} />
                        ) : (
                            <span>{user.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                    </div>
                    <div className="sidebar-profile-info">
                        <div className="sidebar-profile-name">{user.name}</div>
                        <div className={`sidebar-role-badge sidebar-role--${user.role?.toLowerCase()}`}>
                            {user.role}
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Navigation ---- */}
            <div className="sidebar-menu">
                <div className="menu-section-label">Main</div>

                <Link to="/dashboard" className={`menu-item ${isActive('/dashboard')}`}>
                    <FaHome /> Dashboard
                </Link>

                {/* Student Menu */}
                {user?.role === 'Student' && (
                    <>
                        <div className="menu-section-label">Student</div>
                        <Link to="/my-subjects" className={`menu-item ${location.pathname.startsWith('/my-subjects') ? 'active' : ''}`}>
                            <FaBook /> My Subjects
                        </Link>
                        <Link to="/achievements" className={`menu-item ${isActive('/achievements')}`}>
                            <FaClipboardList /> Achievements
                        </Link>
                        <Link to="/student-analytics" className={`menu-item ${isActive('/student-analytics')}`}>
                            <FaChartBar /> Analytics
                        </Link>
                        <Link to="/leaves" className={`menu-item ${isActive('/leaves')}`}>
                            <FaFileAlt /> Leave Requests
                        </Link>
                    </>
                )}

                {/* Faculty Menu */}
                {isFaculty && (
                    <>
                        <div className="menu-section-label">Academics</div>
                        <Link to="/marks-entry" className={`menu-item ${isActive('/marks-entry')}`}>
                            <FaPen /> Marks Entry
                        </Link>
                        <Link to="/attendance-marking" className={`menu-item ${isActive('/attendance-marking')}`}>
                            <FaCalendarCheck /> Attendance
                        </Link>
                        <Link to="/subjects" className={`menu-item ${isActive('/subjects')}`}>
                            <FaBook /> Subjects
                        </Link>

                        <div className="menu-section-label">Management</div>
                        <Link to="/approvals" className={`menu-item ${isActive('/approvals')}`}>
                            <FaClipboardList /> Verification
                        </Link>
                        <Link to="/leaves" className={`menu-item ${isActive('/leaves')}`}>
                            <FaFileAlt /> Leave Approvals
                        </Link>
                    </>
                )}

                {/* Class Teacher */}
                {isClassTeacher && (
                    <>
                        <div className="menu-section-label">Class Teacher</div>
                        <Link to="/my-students" className={`menu-item ${isActive('/my-students')}`}>
                            <FaUsers /> My Students
                        </Link>
                    </>
                )}

                {/* HOD Menu */}
                {isHOD && (
                    <>
                        <div className="menu-section-label">HOD Controls</div>
                        <Link to="/assign-roles" className={`menu-item ${isActive('/assign-roles')}`}>
                            <FaUsersCog /> Assign Roles
                        </Link>
                        <Link to="/analytics" className={`menu-item ${isActive('/analytics')}`}>
                            <FaChartPie /> Analytics
                        </Link>
                    </>
                )}

                <div className="menu-section-label">Account</div>
                <div className="menu-item" onClick={logout} style={{ cursor: 'pointer' }}>
                    <FaSignOutAlt /> Logout
                </div>
            </div>

            {/* ---- Footer ---- */}
            <div className="sidebar-footer">
                <div className="sidebar-footer-text">
                    © 2024 SRIT Ananthapuramu<br />
                    Autonomous | NAAC Accredited
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
