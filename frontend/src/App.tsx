import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { NewPrediction } from './pages/NewPrediction';
import { PredictionHistory } from './pages/PredictionHistory';
import { Analytics } from './pages/Analytics';
import { ModelInfo } from './pages/ModelInfo';
import { Profile } from './pages/Profile';
import { ManagerIntentions } from './pages/ManagerIntentions';

// Student Portal Components & Pages
import { StudentLayout } from './components/student/StudentLayout';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentSchedule } from './pages/student/StudentSchedule';
import { StudentMealPlans } from './pages/student/StudentMealPlans';
import { StudentFeedback } from './pages/student/StudentFeedback';
import { StudentNotifications } from './pages/student/StudentNotifications';
import { StudentProfile } from './pages/student/StudentProfile';

/**
 * StudentRoute: Strict role guard.
 * Only allows authenticated students.
 * Redirects unauthenticated users to /login and managers to /dashboard.
 */
const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAF7]">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1B4332] mx-auto"
            role="status"
          >
            <span className="sr-only">Checking authentication...</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[#68746C]">Loading student portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict separation: Non-student users cannot access student views
  if (user.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * ManagerRoute: Strict role guard.
 * Only allows authenticated mess managers and staff.
 * Redirects unauthenticated users to /login and students to /student/dashboard.
 */
const ManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB] mx-auto"
            role="status"
          >
            <span className="sr-only">Checking authentication...</span>
          </div>
          <p className="mt-4 text-xs font-medium text-[#64748B]">Verifying manager credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict separation: Students cannot access mess manager administration
  if (user.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * RootRedirect: Directs logged-in users straight to their respective portal based on role.
 */
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Role-Based Redirection */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Student Portal Routes (Strictly for Students) */}
          <Route
            path="/student"
            element={
              <StudentRoute>
                <StudentLayout />
              </StudentRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="plans" element={<StudentMealPlans />} />
            <Route path="feedback" element={<StudentFeedback />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* Protected Mess Manager Portal Routes (Strictly for Managers/Staff) */}
          <Route
            path="/"
            element={
              <ManagerRoute>
                <Layout />
              </ManagerRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="intentions" element={<ManagerIntentions />} />
            <Route path="predictions/new" element={<NewPrediction />} />
            <Route path="predictions/history" element={<PredictionHistory />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="model-info" element={<ModelInfo />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-[#F9FAF7] p-4 text-center">
                <div className="max-w-md bg-white border border-[#E8ECE6] rounded-xl p-8 shadow-sm">
                  <h1 className="text-2xl font-bold text-[#1A1D1B]">404 - Page Not Found</h1>
                  <p className="mt-2 text-xs text-[#68746C]">
                    The requested page could not be located in the college mess system.
                  </p>
                  <a
                    href="/"
                    className="mt-5 inline-block px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-md hover:bg-[#2D6A4F] transition-colors"
                  >
                    Return to Portal
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
