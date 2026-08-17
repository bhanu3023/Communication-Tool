/**
 * Hotjar — session recordings and heatmaps of how people use the portal.
 *
 * Loaded for EVERY signed-in user, not just admins: Hotjar records the browser the script
 * runs in, so limiting it to admins would only ever record the admin. Recordings are viewed
 * on hotjar.com by whoever holds the account, which is where the "admin only" part lives —
 * there is nothing to gate inside this app.
 *
 * Inert unless VITE_HOTJAR_SITE_ID is set. Vite bakes VITE_* at BUILD time, so the site id
 * has to be a build arg (see frontend/Dockerfile and docker-compose.yml) — setting it in a
 * running container does nothing.
 *
 * Note this sends employee identity to a third party and records them while they take a
 * graded assessment. That was a deliberate product decision, not an oversight; if it is ever
 * revisited, unset the site id and the script stops loading.
 */

const SITE_ID = import.meta.env.VITE_HOTJAR_SITE_ID;
const VERSION = 6;

/** True when a site id was baked in at build time. */
export const hotjarEnabled = () => Boolean(SITE_ID);

/**
 * Injects the official Hotjar snippet once. Safe to call repeatedly — a second call is a
 * no-op, so React StrictMode's double-invoke in development cannot load it twice.
 */
export function initHotjar() {
  if (!SITE_ID || typeof window === 'undefined' || window.hj) {
    return;
  }
  try {
    window.hj =
      window.hj ||
      function hj(...args) {
        (window.hj.q = window.hj.q || []).push(args);
      };
    window._hjSettings = { hjid: Number(SITE_ID), hjsv: VERSION };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${window._hjSettings.hjid}.js?sv=${window._hjSettings.hjsv}`;
    document.head.appendChild(script);
  } catch {
    // Analytics must never take the app down with it.
  }
}

/**
 * Attaches the signed-in person to their recordings, so a session can be traced to a name
 * rather than an anonymous visitor — the whole point of watching usage here.
 *
 * Called on every profile change; Hotjar treats repeat identify calls as updates.
 */
export function identifyHotjar(profile) {
  if (!SITE_ID || !profile || typeof window === 'undefined' || !window.hj) {
    return;
  }
  try {
    window.hj('identify', String(profile.id), {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      team: profile.team,
      // Lets recordings be filtered to the people an admin actually manages.
      manager: profile.manager,
    });
  } catch {
    /* never break the app for analytics */
  }
}
