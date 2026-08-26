import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RequireAuth from './components/RequireAuth.jsx';

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
