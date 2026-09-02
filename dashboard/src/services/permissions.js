export function canAccessAnalytics(user) {
  return user?.role === 'ADMIN';
}

/**
 * Lançamento manual altera a base que alimenta o dashboard — o backend
 * exige ADMIN nas rotas de escrita, então a UI segue a mesma regra.
 */
export function canEditKpiData(user) {
  return user?.role === 'ADMIN';
}
