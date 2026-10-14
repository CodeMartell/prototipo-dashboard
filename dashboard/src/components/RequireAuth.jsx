import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';
import { usePermission } from '../hooks/usePermission';

/**
 * Bloqueia acesso ao /dashboard sem sessão válida — manda pro /login.
 * Checagem simples de "existe token" no localStorage; se o token
 * estiver expirado, a primeira chamada autenticada na API já vai
 * disparar UnauthorizedError e o App.jsx redireciona também.
 */
export default function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

/**
 * Route guard baseado em permissão granular.
 * Redireciona para /dashboard se o usuário não tiver a permissão.
 *
 * Uso:
 *   <RequirePermission permission="users:read" fallback={<Navigate to="/" />}>
 *     <UserManagementPage />
 *   </RequirePermission>
 */
export function RequirePermission({ permission, permissions, children, fallback = null }) {
  // Aceita permission (string única) ou permissions (array — OR lógico)
  const codes = permissions ?? (permission ? [permission] : []);
  const allowed = usePermission(...codes);

  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!allowed) return fallback ?? <Navigate to="/" replace />;
  return children;
}

