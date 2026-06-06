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
import ComplianceLogs from './pages/compliance/ComplianceLogs';
import AdminLayout from './pages/admin/AdminLayout';
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
              <Route path="/compliance"            element={<ComplianceLogs />} />
              <Route path="/analytics"             element={<Analytics />} />
              
              {/* Admin settings integrated into main layout */}
              <Route element={<AdminLayout />}>
                <Route path="/admin/settings" element={<SystemSettings />} />
                <Route path="/admin/logs"     element={<AuditLogs />} />
                <Route path="/admin" element={<Navigate to="/admin/settings" replace />} />
              </Route>

              {/* Phase 4 sandbox — remove after verification */}
              <Route path="/ui-sandbox" element={<UiSandbox />} />
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
