import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import FacultyRegister from './pages/FacultyRegister';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import FacultyDashboard from './pages/dashboard/FacultyDashboard';
import Achievements from './pages/Achievements';
import StudentAnalytics from './pages/StudentAnalytics';
import Analytics from './pages/Analytics';
import Leaves from './pages/Leaves';
// Student pages
import MySubjects from './pages/student/MySubjects';
import SubjectDetail from './pages/student/SubjectDetail';
// Faculty pages
import MarksEntry from './pages/faculty/MarksEntry';
import MyStudents from './pages/faculty/MyStudents';
import StudentProfile from './pages/faculty/StudentProfile';
import SubjectsPage from './pages/faculty/SubjectsPage';
import FacultyAchievements from './pages/faculty/FacultyAchievements';
import FacultyAnalytics from './pages/faculty/FacultyAnalytics';
import CounsellorDashboard from './pages/faculty/CounsellorDashboard';
// HOD pages
import AssignRoles from './pages/hod/AssignRoles';
import FacultyProfile from './pages/hod/FacultyProfile';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" />;
    }

    return children;
};

// Route Dispatcher based on Role
const DashboardRouter = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    if (user?.role === 'Student') {
        return <StudentDashboard />;
    } else if (['Faculty', 'HOD', 'Principal', 'Admin', 'ClassTeacher'].includes(user?.role)) {
        return <FacultyDashboard />;
    } else {
        return (
            <div style={{ padding: '20px' }}>
                <h1>Welcome {user?.role}</h1>
                <p>Dashboard under construction for this role.</p>
            </div>
        );
    }
};

const FACULTY_ROLES = ['Faculty', 'ClassTeacher', 'HOD', 'Principal', 'Admin'];
const HOD_ROLES = ['HOD', 'Principal', 'Admin'];

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/faculty-register" element={<FacultyRegister />} />

            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <DashboardRouter />
                </ProtectedRoute>
            } />

            <Route path="/achievements" element={
                <ProtectedRoute allowedRoles={['Student']}>
                    <Achievements />
                </ProtectedRoute>
            } />

            <Route path="/leaves" element={
                <ProtectedRoute>
                    <Leaves />
                </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/my-subjects" element={
                <ProtectedRoute allowedRoles={['Student']}>
                    <MySubjects />
                </ProtectedRoute>
            } />

            <Route path="/my-subjects/:id" element={
                <ProtectedRoute allowedRoles={['Student']}>
                    <SubjectDetail />
                </ProtectedRoute>
            } />

            <Route path="/analytics" element={
                <ProtectedRoute allowedRoles={HOD_ROLES}>
                    <Analytics />
                </ProtectedRoute>
            } />

            <Route path="/student-analytics" element={
                <ProtectedRoute allowedRoles={['Student']}>
                    <StudentAnalytics />
                </ProtectedRoute>
            } />

            {/* Faculty Routes */}
            <Route path="/marks-entry" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <MarksEntry />
                </ProtectedRoute>
            } />

            <Route path="/subjects" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <SubjectsPage />
                </ProtectedRoute>
            } />

            <Route path="/my-students" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <MyStudents />
                </ProtectedRoute>
            } />

            <Route path="/student-profile/:id" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <StudentProfile />
                </ProtectedRoute>
            } />

            <Route path="/faculty-achievements" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <FacultyAchievements />
                </ProtectedRoute>
            } />

            <Route path="/faculty-analytics" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <FacultyAnalytics />
                </ProtectedRoute>
            } />

            <Route path="/counsellor-dashboard" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <CounsellorDashboard />
                </ProtectedRoute>
            } />

            {/* HOD Routes */}
            <Route path="/assign-roles" element={
                <ProtectedRoute allowedRoles={HOD_ROLES}>
                    <AssignRoles />
                </ProtectedRoute>
            } />

            <Route path="/faculty-profile/:id" element={
                <ProtectedRoute allowedRoles={HOD_ROLES}>
                    <FacultyProfile />
                </ProtectedRoute>
            } />

            {/* Faculty Dashboard alias */}
            <Route path="/approvals" element={
                <ProtectedRoute allowedRoles={FACULTY_ROLES}>
                    <FacultyDashboard />
                </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

export default App;
