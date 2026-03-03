import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EstateFiles from './pages/EstateFiles';
import EstateFileDetail from './pages/EstateFileDetail';
import EstateFileForm from './pages/EstateFileForm';
import AssetDetail from './pages/AssetDetail';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import AuditLogs from './pages/AuditLogs';
import ImportData from './pages/ImportData';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) {
    return <div className="main-content"><div className="alert alert-error">Access denied. Insufficient permissions.</div></div>;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/estate-files" element={<EstateFiles />} />
        <Route path="/estate-files/new" element={
          <ProtectedRoute roles={['ADMIN', 'OFFICER', 'CLERK']}>
            <EstateFileForm />
          </ProtectedRoute>
        } />
        <Route path="/estate-files/:id" element={<EstateFileDetail />} />
        <Route path="/estate-files/:id/edit" element={
          <ProtectedRoute roles={['ADMIN', 'OFFICER', 'CLERK']}>
            <EstateFileForm />
          </ProtectedRoute>
        } />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/import" element={
          <ProtectedRoute roles={['ADMIN', 'OFFICER']}>
            <ImportData />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute roles={['ADMIN', 'AUDITOR']}>
            <AuditLogs />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
