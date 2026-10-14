/**
 * src/hooks/usePermission.js
 * Hook React para verificar permissões do usuário logado.
 *
 * Uso:
 *   const canEdit = usePermission('kpi:write_manual');
 *   const canAudit = usePermission('audit:read_all', 'audit:read_scoped'); // OR lógico
 */
import { useMemo } from 'react';
import { getCurrentUser } from '../services/api';
import { hasPermission, hasAnyPermission } from '../services/permissions';

/**
 * @param {...string} codes - Um ou mais códigos de permissão (OR lógico entre eles)
 * @returns {boolean}
 */
export function usePermission(...codes) {
  const user = getCurrentUser();
  return useMemo(() => {
    if (!user) return false;
    if (codes.length === 0) return false;
    if (codes.length === 1) return hasPermission(user, codes[0]);
    return hasAnyPermission(user, codes);
  }, [user, codes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default usePermission;
