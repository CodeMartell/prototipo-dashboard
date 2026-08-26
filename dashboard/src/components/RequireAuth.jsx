import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';

/**
 * Bloqueia acesso ao /dashboard sem sessão válida — manda pro /login.
 * Checagem simples de "existe token" no localStorage; se o token
 * estiver expirado, a primeira chamada autenticada na API já vai
 * disparar UnauthorizedError e o App.jsx redireciona também.
 */
export default function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}
