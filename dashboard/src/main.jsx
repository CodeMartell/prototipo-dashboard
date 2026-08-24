import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { isAuthenticated } from './services/api';

/**
 * Bloqueia acesso ao /dashboard sem sessão válida — manda pro /login.
 * Checagem simples de "existe token" no localStorage; se o token
 * estiver expirado, a primeira chamada autenticada na API já vai
 * disparar UnauthorizedError e o App.jsx redireciona também.
 */
function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
