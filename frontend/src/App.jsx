import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunchOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
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
//
// `lazy()` only starts its import when React first tries to RENDER the component, and on a cold
// load that is a long way off: the whole bundle has to parse, MSAL has to settle, AuthContext has
// to resolve, and the route guard has to pass. Only then does the browser learn it needs one more
// file — a full round trip appended to the end of the critical path, every time. Keeping the
// factory on the component lets main.jsx ask for the page a user is already navigating to at the
// same moment the bundle starts up. React.lazy reuses the promise, so this cannot load a page
// twice and cannot change what renders; it only moves the request earlier.
const lazyPage = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

const Login = lazyPage(() => import('./pages/Login'));
const Dashboard = lazyPage(() => import('./pages/employee/Dashboard'));
const Feedback = lazyPage(() => import('./pages/employee/Feedback'));
const AICoach = lazyPage(() => import('./pages/employee/AICoach'));
const Level2 = lazyPage(() => import('./pages/employee/Level2'));
const Level3 = lazyPage(() => import('./pages/employee/Level3'));
const AssessmentHub = lazyPage(() => import('./pages/assessment/AssessmentHub'));
const Listening = lazyPage(() => import('./pages/assessment/Listening'));
const Speaking = lazyPage(() => import('./pages/assessment/Speaking'));
const Writing = lazyPage(() => import('./pages/assessment/Writing'));
const ManagerDashboard = lazyPage(() => import('./pages/manager/ManagerDashboard'));
const EmployeeDetail = lazyPage(() => import('./pages/manager/EmployeeDetail'));
const ManagerAccess = lazyPage(() => import('./pages/manager/ManagerAccess'));

// Longest prefix wins, so /manager/employee/7 does not preload the team list. Anything not
// listed — an unknown path, or the "/" redirect — simply preloads nothing.
const ROUTE_CHUNKS = [
  ['/login', Login],
  ['/dashboard', Dashboard],
  ['/level-2', Level2],
  ['/level-3', Level3],
  ['/coach', AICoach],
  ['/feedback', Feedback],
  ['/assessment', AssessmentHub],
  ['/assessment/listening', Listening],
  ['/assessment/speaking', Speaking],
  ['/assessment/writing', Writing],
  ['/manager', ManagerDashboard],
  ['/manager/access', ManagerAccess],
  ['/manager/employee', EmployeeDetail],
].sort((a, b) => b[0].length - a[0].length);

/**
 * Starts downloading the page chunk for `pathname`, if there is one.
 *
 * Called once at start-up. Deliberately forgiving: a rejection here is not the user's problem —
 * React will request the same chunk again when it renders, and report the failure then.
 */
export function preloadRouteChunk(pathname) {
  const match = ROUTE_CHUNKS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (match) match[1].preload().catch(() => {});
}

// Sidebar nav for each role (label, icon, path, active-match).
const EMPLOYEE_NAV = [
  { label: 'Level 1', icon: <SpaceDashboardIcon />, path: '/dashboard', match: (p) => p === '/dashboard' || p.startsWith('/assessment') },
  { label: 'Level 2', icon: <RocketLaunchIcon />, path: '/level-2', match: (p) => p.startsWith('/level-2') },
  {
    label: 'Level 3',
    icon: <WorkspacePremiumIcon />,
    path: '/level-3',
    match: (p) => p.startsWith('/level-3'),
  },
  { label: 'AI Coach', icon: <AutoAwesomeIcon />, path: '/coach', match: (p) => p.startsWith('/coach') },
  { label: 'Feedback', icon: <RateReviewIcon />, path: '/feedback', match: (p) => p.startsWith('/feedback') },
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
              <DashboardLayout nav={EMPLOYEE_NAV} />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/level-2" element={<Level2 />} />
          <Route path="/level-3" element={<Level3 />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/assessment" element={<AssessmentHub />} />
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
