import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPermission,
  hasAnyPermission,
  canEditKpiData,
  canDeleteKpiData,
  canManageUsers,
  canReadUsers,
  canAssignRoles,
  canReadAuditLog,
  canReadAllAuditLog,
  canManageActionPlans,
} from './permissions.js';

test('hasPermission returns false for null or undefined user', () => {
  assert.equal(hasPermission(null, 'dashboard:read'), false);
  assert.equal(hasPermission(undefined, 'dashboard:read'), false);
});

test('ADMIN has access to all permissions by role or explicit permission', () => {
  const admin = { role: 'ADMIN', permissions: [] };
  assert.equal(hasPermission(admin, 'dashboard:read'), true);
  assert.equal(hasPermission(admin, 'kpi:write_manual'), true);
  assert.equal(hasPermission(admin, 'users:assign_role'), true);
  assert.equal(canEditKpiData(admin), true);
  assert.equal(canDeleteKpiData(admin), true);
  assert.equal(canManageUsers(admin), true);
  assert.equal(canReadUsers(admin), true);
  assert.equal(canAssignRoles(admin), true);
  assert.equal(canReadAllAuditLog(admin), true);
  assert.equal(canManageActionPlans(admin), true);
});

test('GESTOR has kpi and action_plans permissions but no users or audit permissions', () => {
  const gestor = {
    id: 'gestor-1',
    role: 'GESTOR',
    permissions: [
      'dashboard:read',
      'kpi:write_manual',
      'kpi:delete',
      'action_plans:read',
      'action_plans:write',
      'action_plans:delete',
    ],
  };

  assert.equal(canEditKpiData(gestor), true);
  assert.equal(canDeleteKpiData(gestor, { submitted_by: 'gestor-1' }), true);
  assert.equal(canDeleteKpiData(gestor, { submitted_by: 'other-user' }), false);
  assert.equal(canDeleteKpiData(gestor, { submitted_by: null }), false);
  assert.equal(canDeleteKpiData(gestor, null), false);
  assert.equal(canManageActionPlans(gestor), true);
  assert.equal(canReadUsers(gestor), false);
  assert.equal(canManageUsers(gestor), false);
  assert.equal(canAssignRoles(gestor), false);
  assert.equal(canReadAuditLog(gestor), false);
  assert.equal(canReadAllAuditLog(gestor), false);
});


test('TI_SUPORTE has users management and scoped audit permissions', () => {
  const ti = {
    role: 'TI_SUPORTE',
    permissions: [
      'dashboard:read',
      'users:read',
      'users:write',
      'users:assign_role',
      'audit:read_scoped',
      'action_plans:read',
    ],
  };

  assert.equal(canReadUsers(ti), true);
  assert.equal(canManageUsers(ti), true);
  assert.equal(canAssignRoles(ti), true);
  assert.equal(canReadAuditLog(ti), true);
  assert.equal(canReadAllAuditLog(ti), false); // Apenas scoped!
  assert.equal(canEditKpiData(ti), false);
  assert.equal(canDeleteKpiData(ti), false);
  assert.equal(canManageActionPlans(ti), false);
});

test('AUDITORIA has unrestricted audit log read', () => {
  const auditoria = {
    role: 'AUDITORIA',
    permissions: ['dashboard:read', 'action_plans:read', 'audit:read_all'],
  };

  assert.equal(canReadAuditLog(auditoria), true);
  assert.equal(canReadAllAuditLog(auditoria), true);
  assert.equal(canReadUsers(auditoria), false);
  assert.equal(canManageUsers(auditoria), false);
  assert.equal(canEditKpiData(auditoria), false);
});

test('VIEWER has only read permissions', () => {
  const viewer = {
    role: 'VIEWER',
    permissions: ['dashboard:read', 'action_plans:read'],
  };

  assert.equal(hasPermission(viewer, 'dashboard:read'), true);
  assert.equal(hasPermission(viewer, 'action_plans:read'), true);
  assert.equal(canEditKpiData(viewer), false);
  assert.equal(canDeleteKpiData(viewer), false);
  assert.equal(canManageUsers(viewer), false);
  assert.equal(canReadUsers(viewer), false);
  assert.equal(canAssignRoles(viewer), false);
  assert.equal(canReadAuditLog(viewer), false);
  assert.equal(canManageActionPlans(viewer), false);
});

test('hasAnyPermission evaluates logical OR correctly', () => {
  const user = { role: 'TI_SUPORTE', permissions: ['users:read'] };
  assert.equal(hasAnyPermission(user, ['kpi:write_manual', 'users:read']), true);
  assert.equal(hasAnyPermission(user, ['kpi:write_manual', 'audit:read_all']), false);
});
