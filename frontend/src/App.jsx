import { Navigate, Route, Routes } from 'react-router-dom';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/employee/Dashboard';
import Feedback from './pages/employee/Feedback';
import AICoach from './pages/employee/AICoach';
import AssessmentHub from './pages/assessment/AssessmentHub';
import Listening from './pages/assessment/Listening';
import Speaking from './pages/assessment/Speaking';
import Writing from './pages/assessment/Writing';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EmployeeDetail from './pages/manager/EmployeeDetail';

// Sidebar nav for each role (label, icon, path, active-match).
const EMPLOYEE_NAV = [
  { label: 'Test Dashboard', icon: <SpaceDashboardIcon />, path: '/dashboard', match: (p) => p === '/dashboard' || p.startsWith('/assessment') },
  { label: 'AI Coach', icon: <AutoAwesomeIcon />, path: '/coach', match: (p) => p.startsWith('/coach') },
  { label: 'Feedback', icon: <RateReviewIcon />, path: '/feedback', match: (p) => p.startsWith('/feedback') },
];

const MANAGER_NAV = [
  { label: 'Team', icon: <GroupsIcon />, path: '/manager', match: (p) => p.startsWith('/manager') },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Employee */}
      <Route
        element={
          <ProtectedRoute role="EMPLOYEE">
            <DashboardLayout nav={EMPLOYEE_NAV} />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/coach" element={<AICoach />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/assessment" element={<AssessmentHub />} />
        <Route path="/assessment/listening" element={<Listening />} />
        <Route path="/assessment/speaking" element={<Speaking />} />
        <Route path="/assessment/writing" element={<Writing />} />
      </Route>

      {/* Manager */}
      <Route
        element={
          <ProtectedRoute role="MANAGER">
            <DashboardLayout nav={MANAGER_NAV} />
          </ProtectedRoute>
        }
      >
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/employee/:id" element={<EmployeeDetail />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
