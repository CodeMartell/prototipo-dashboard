import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import RequireAuth, { RequirePermission } from './components/RequireAuth.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rota padrão → Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Página de autenticação */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard principal — protegido */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />

        {/* Página de Perfil e Governança — protegida */}
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        {/* Gestão de Usuários — protegida por permissões (ADMIN e TI_SUPORTE) */}
        <Route
          path="/usuarios"
          element={
            <RequirePermission permissions={['users:read', 'users:write']} fallback={<Navigate to="/dashboard" replace />}>
              <UserManagementPage />
            </RequirePermission>
          }
        />

        {/* Trilha de Auditoria (Audit Log) — protegida por permissões (ADMIN, AUDITORIA, TI_SUPORTE) */}
        <Route
          path="/auditoria"
          element={
            <RequirePermission permissions={['audit:read_all', 'audit:read_scoped']} fallback={<Navigate to="/dashboard" replace />}>
              <AuditPage />
            </RequirePermission>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

