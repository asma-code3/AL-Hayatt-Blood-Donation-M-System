import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import { useAuth } from './Context/auth-context';
import { BloodProvider } from './Context/BloodContext';
import { AdminLayout } from './components/layout';
import Login from './extra-modules/auth/Login';
import AuditLog from './extra-modules/admin/AuditLog';
import GenerateReport from './extra-modules/reports/GenerateReport';
import ManageUsers from './extra-modules/admin/ManageUsers';
import DataStorageUpdates from './extra-modules/system/DataStorageUpdates';
import BloodInventory from './modules/BloodInventory';
import BloodRequests from './modules/BloodRequests';
import Dashboard from './modules/Dashboard';
import DonationHistory from './modules/DonationHistory';
import DonorRegistration from './modules/DonorRegistration';
import PatientRegistration from './modules/PatientRegistration';

const roleAccess = {
  Administrator: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests', 'reports', 'data-storage-updates', 'manage-users', 'audit-log'],
  Staff: ['dashboard', 'donors', 'patients', 'inventory', 'history', 'requests', 'reports'],
  Doctor: ['dashboard', 'patients', 'history', 'requests', 'reports'],
};

const defaultRouteByRole = {
  Administrator: '/dashboard',
  Staff: '/dashboard',
  Doctor: '/dashboard',
};

const PrivateRoute = ({ children }) => {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return null;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ children, featureKey }) => {
  const { user } = useAuth();
  const allowedFeatures = user?.role ? roleAccess[user.role] || [] : roleAccess.Administrator;
  const fallback = user?.role ? defaultRouteByRole[user.role] || '/dashboard' : '/dashboard';

  return allowedFeatures.includes(featureKey) ? children : <Navigate to={fallback} replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <BloodProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <PrivateRoute>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <RoleRoute featureKey="dashboard">
                    <Dashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/donorregistration"
                element={
                  <RoleRoute featureKey="donors">
                    <DonorRegistration />
                  </RoleRoute>
                }
              />
              <Route
                path="/patientregistration"
                element={
                  <RoleRoute featureKey="patients">
                    <PatientRegistration />
                  </RoleRoute>
                }
              />
              <Route
                path="/bloodinventory"
                element={
                  <RoleRoute featureKey="inventory">
                    <BloodInventory />
                  </RoleRoute>
                }
              />
              <Route
                path="/donationhistory"
                element={
                  <RoleRoute featureKey="history">
                    <DonationHistory />
                  </RoleRoute>
                }
              />
              <Route
                path="/bloodrequests"
                element={
                  <RoleRoute featureKey="requests">
                    <BloodRequests />
                  </RoleRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRoute featureKey="reports">
                    <GenerateReport />
                  </RoleRoute>
                }
              />
              <Route
                path="/datastorageupdates"
                element={
                  <RoleRoute featureKey="data-storage-updates">
                    <DataStorageUpdates />
                  </RoleRoute>
                }
              />
              <Route
                path="/manageusers"
                element={
                  <RoleRoute featureKey="manage-users">
                    <ManageUsers />
                  </RoleRoute>
                }
              />
              <Route
                path="/auditlog"
                element={
                  <RoleRoute featureKey="audit-log">
                    <AuditLog />
                  </RoleRoute>
                }
              />
              <Route path="/recordblood" element={<Navigate to="/donationhistory" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Router>
      </BloodProvider>
    </AuthProvider>
  );
};

export default App;
