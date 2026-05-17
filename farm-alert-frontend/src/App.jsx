import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import UiSandbox from './pages/sandbox/UiSandbox';
import FarmList from './pages/Farms/FarmList';
import FarmForm from './pages/Farms/FarmForm';
import DiseaseLibrary from './pages/Diseases/DiseaseLibrary';
import DiseaseReports from './pages/reports/DiseaseReports';
import ReportDetail from './pages/reports/ReportDetail';
import OutbreakAlerts from './pages/outbreaks/OutbreakAlerts';
import Dashboard from './pages/Dashboard/Dashboard';
import DiseaseMap from './pages/Map/DiseaseMap';
import Analytics from './pages/Analytics/Analytics';
import PestControlLog from './pages/pestControl/PestControlLog';
import PestControlForm from './pages/pestControl/PestControlForm';
import PestLibrary from './pages/pestControl/PestLibrary';
import SetupPassword from './pages/auth/SetupPassword';
import AdminLayout from './pages/admin/AdminLayout';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';

// ---------------------------------------------------------------------------
// Temporary placeholder pages — replaced in Phase 5+ with real components
// ---------------------------------------------------------------------------
function PlaceholderPage({ name }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '0.5rem',
      color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-body)',
    }}>
      <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</p>
      <p style={{ fontSize: 'var(--text-sm)' }}>Coming in a future phase.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — root router shell
// ---------------------------------------------------------------------------
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            {/* Password-change gate — full-screen, no Layout */}
            <Route path="/setup-password" element={<SetupPassword />} />

            {/* Layout wraps all inner protected pages with Sidebar + Navbar */}
            <Route element={<Layout />}>
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/farms"          element={<FarmList />} />
              <Route path="/farms/new"      element={<FarmForm />} />
              <Route path="/farms/:id/edit" element={<FarmForm />} />
              <Route path="/diseases"       element={<DiseaseLibrary />} />
              <Route path="/reports"        element={<DiseaseReports />} />
              <Route path="/reports/:id"    element={<ReportDetail />} />
              <Route path="/outbreaks"      element={<OutbreakAlerts />} />
              <Route path="/map"            element={<DiseaseMap />} />
              <Route path="/pest-control"          element={<PestControlLog />} />
              <Route path="/pest-control/new"      element={<PestControlForm />} />
              <Route path="/pest-control/:id/edit" element={<PestControlForm />} />
              <Route path="/pest-library"           element={<PestLibrary />} />
              <Route path="/analytics"             element={<Analytics />} />
              {/* Phase 4 sandbox — remove after verification */}
              <Route path="/ui-sandbox" element={<UiSandbox />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<Layout />}>
              <Route element={<AdminLayout />}>
                <Route index path="/admin" element={<Navigate to="/admin/users" replace />} />
                <Route path="/admin/users"    element={<UserManagement />} />
                <Route path="/admin/settings" element={<SystemSettings />} />
                <Route path="/admin/logs"     element={<AuditLogs />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback — redirect root to dashboard (ProtectedRoute handles auth check) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 — catch all unknown paths */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
