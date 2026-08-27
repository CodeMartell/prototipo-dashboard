export function canAccessAnalytics(user) {
  return user?.role === 'ADMIN';
}
