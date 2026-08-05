/** True when the user can open manager API routes and the team portal. */
export const isManagerPortalUser = (profile) =>
  profile?.role === 'MANAGER' || profile?.role === 'ADMIN' || !!profile?.admin;

/** Where to send someone right after login. */
export const homeForRole = (profile) => {
  if (profile?.role === 'MANAGER' && !profile?.admin) return '/manager';
  return '/dashboard';
};
