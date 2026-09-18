/**
 * src/services/permissions.js
 * Sistema de permissões baseado em códigos granulares (RBAC).
 * O backend é a fonte da verdade — o frontend usa permissões apenas para UI.
 */

import { getCurrentUser } from './api.js';


/**
 * Verifica se o usuário tem uma permissão específica.
 * @param {object|null} user - Objeto do usuário com permissions[]
 * @param {string} code - Código da permissão, ex: "kpi:write_manual"
 */
export function hasPermission(user, code) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(code);
}


/**
 * Verifica se o usuário tem qualquer uma das permissões listadas (OR).
 * @param {object|null} user
 * @param {string[]} codes
 */
export function hasAnyPermission(user, codes) {
  return codes.some((code) => hasPermission(user, code));
}

// ---------------------------------------------------------------------------
// Wrappers de retrocompatibilidade — mantêm a API pública anterior
// ---------------------------------------------------------------------------

export function canAccessAnalytics(user) {
  // Analytics requer ADMIN (role check mantido para compatibilidade)
  return user?.role === 'ADMIN';
}

/**
 * Lançamento manual altera a base que alimenta o dashboard —
 * o backend exige kpi:write_manual.
 */
export function canEditKpiData(user) {
  return hasPermission(user, 'kpi:write_manual');
}

export function canDeleteKpiData(user, record) {
  if (!hasPermission(user, 'kpi:delete')) return false;
  if (user?.role === 'ADMIN') return true;
  // GESTOR só pode excluir o que ele mesmo lançou manualmente —
  // mesma regra já aplicada em dashboard_service.py::delete_kpi_record
  return record?.submitted_by === user?.id;
}


export function canManageUsers(user) {
  return hasPermission(user, 'users:write');
}

export function canReadUsers(user) {
  return hasPermission(user, 'users:read');
}

export function canAssignRoles(user) {
  return hasPermission(user, 'users:assign_role');
}

export function canReadAuditLog(user) {
  return hasAnyPermission(user, ['audit:read_all', 'audit:read_scoped']);
}

export function canReadAllAuditLog(user) {
  return hasPermission(user, 'audit:read_all');
}

export function canManageActionPlans(user) {
  return hasPermission(user, 'action_plans:write');
}

