import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import DashboardLayout from './layouts/DashboardLayout';
import ExamLayout from './layouts/ExamLayout';

// Every page is code-split. Statically importing all of them put the manager screens and
// all three assessment pages into the first download, so signing in meant waiting on code
// for screens you may never open. The guards and layouts stay eager — they are small and
// on the path to every route anyway.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/employee/Dashboard'));
const Test = lazy(() => import('./pages/employee/Test'));
const Feedback = lazy(() => import('./pages/employee/Feedback'));
const AICoach = lazy(() => import('./pages/employee/AICoach'));
const Instructions = lazy(() => import('./pages/employee/Instructions'));
const AssessmentHub = lazy(() => import('./pages/assessment/AssessmentHub'));
const Listening = lazy(() => import('./pages/assessment/Listening'));
const Speaking = lazy(() => import('./pages/assessment/Speaking'));
const Writing = lazy(() => import('./pages/assessment/Writing'));
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const EmployeeDetail = lazy(() => import('./pages/manager/EmployeeDetail'));
const ManagerAccess = lazy(() => import('./pages/manager/ManagerAccess'));

// Sidebar nav for each role (label, icon, path, active-match).
const EMPLOYEE_NAV = [
  { label: 'Dashboard', icon: <SpaceDashboardIcon />, path: '/dashboard', match: (p) => p === '/dashboard' },
  { label: 'Test', icon: <AssignmentIcon />, path: '/test', match: (p) => p.startsWith('/test') || p.startsWith('/assessment') },
  { label: 'AI Coach', icon: <AutoAwesomeIcon />, path: '/coach', match: (p) => p.startsWith('/coach') },
  { label: 'Feedback', icon: <RateReviewIcon />, path: '/feedback', match: (p) => p.startsWith('/feedback') },
  { label: 'About', icon: <InfoOutlinedIcon />, path: '/about', match: (p) => p.startsWith('/about') },
];

const MANAGER_NAV = [
  { label: 'Team', icon: <GroupsIcon />, path: '/manager', match: (p) => p === '/manager' || p.startsWith('/manager/employee') },
  {
    label: 'User Access',
    icon: <AdminPanelSettingsIcon />,
    path: '/manager/access',
    match: (p) => p.startsWith('/manager/access'),
    adminOnly: true,
  },
];

export default function App() {
  return (
    // One boundary around all routes: a lazy chunk that is still in flight shows the same
    // LoadingScreen the pages themselves use while fetching, so a route change never flashes
    // empty chrome. Without this, React throws on the first lazy render.
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Employee */}
        <Route
          element={
            <ProtectedRoute role="EMPLOYEE">
              <DashboardLayout nav={EMPLOYEE_NAV} adminNav={MANAGER_NAV} />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/test" element={<Test />} />
          <Route path="/about" element={<Instructions />} />
          <Route path="/instructions" element={<Navigate to="/about" replace />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/assessment" element={<AssessmentHub />} />
          <Route path="/level-2" element={<Navigate to="/test?level=2" replace />} />
        </Route>

        {/* A test in progress gets NO dashboard chrome — see ExamLayout. */}
        <Route
          element={
            <ProtectedRoute role="EMPLOYEE">
              <ExamLayout />
            </ProtectedRoute>
          }
        >
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
          <Route path="/manager/access" element={<ManagerAccess />} />
          <Route path="/manager/employee/:id" element={<EmployeeDetail />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
