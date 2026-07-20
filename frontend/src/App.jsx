import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/employee/Dashboard';
import AssessmentHub from './pages/assessment/AssessmentHub';
import Listening from './pages/assessment/Listening';
import Speaking from './pages/assessment/Speaking';
import Writing from './pages/assessment/Writing';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EmployeeDetail from './pages/manager/EmployeeDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Employee */}
      <Route
        element={
          <ProtectedRoute role="EMPLOYEE">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assessment" element={<AssessmentHub />} />
        <Route path="/assessment/listening" element={<Listening />} />
        <Route path="/assessment/speaking" element={<Speaking />} />
        <Route path="/assessment/writing" element={<Writing />} />
      </Route>

      {/* Manager */}
      <Route
        element={
          <ProtectedRoute role="MANAGER">
            <AppLayout />
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
