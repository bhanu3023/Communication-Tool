/**
 * Hotjar — session recordings and heatmaps of how people use the portal.
 *
 * Loaded for EVERY signed-in user, not just admins: Hotjar records the browser the script
 * runs in, so limiting it to admins would only ever record the admin. Recordings are viewed
 * on hotjar.com by whoever holds the account, which is where the "admin only" part lives —
 * there is nothing to gate inside this app.
 *
 * Inert unless a site id is configured. The id is resolved at RUNTIME from
 * public/runtime-config.js, falling back to the build-time VITE_HOTJAR_SITE_ID — so changing it
 * no longer requires rebuilding the image. See utils/runtimeConfig.js.
 *
 * Note this sends employee identity to a third party and records them while they take a
 * graded assessment. That was a deliberate product decision, not an oversight; if it is ever
 * revisited, blank the id in runtime-config.js AND rebuild without the build arg (a blank
 * runtime value falls through to the baked-in one).
 */

import { HOTJAR_SITE_ID } from './runtimeConfig';

const SCRIPT_ID = 'hotjar-snippet';

// Snippet version Hotjar expects in both _hjSettings and the script URL. Bumping this is
// Hotjar's call, not ours — it changes only when they ship a new loader contract.
const SNIPPET_VERSION = 6;

/** True when a site id is configured, at runtime or baked in at build time. */
export const hotjarEnabled = () => Boolean(HOTJAR_SITE_ID);

/**
 * Injects the official Hotjar snippet once.
 *
 * Idempotent on purpose: a second call is a no-op, so React StrictMode's double-invoke in
 * development cannot open two recordings for one page view.
 *
 * @returns {boolean} true only when this call actually injected the script.
 */
export function initHotjar() {
  if (!hotjarEnabled()) return false;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.hj || document.getElementById(SCRIPT_ID)) return false;

  // A non-numeric id would silently request hotjar-NaN.js and fail with nothing in the console
  // pointing at the cause — a typo'd id and a deliberately disabled Hotjar would look identical
  // to whoever is debugging. Say so instead.
  if (!/^\d+$/.test(HOTJAR_SITE_ID)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[analytics] Ignoring hotjarSiteId="${HOTJAR_SITE_ID}": a Hotjar Site ID is digits only ` +
        `(e.g. "1234567"). Find it under Settings → Sites & Organizations in Hotjar. Recording is off.`,
    );
    return false;
  }

  try {
    // The queue has to exist before the remote script loads, so calls made during the first
    // render — identify, in particular — are replayed instead of dropped on the floor.
    window.hj =
      window.hj ||
      function hj(...args) {
        (window.hj.q = window.hj.q || []).push(args);
      };
    // Number, not string: Hotjar's own snippet emits hjid as a numeric literal and the remote
    // script reads it back. The digits-only guard above means Number() cannot NaN here.
    window._hjSettings = { hjid: Number(HOTJAR_SITE_ID), hjsv: SNIPPET_VERSION };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://static.hotjar.com/c/hotjar-${HOTJAR_SITE_ID}.js?sv=${SNIPPET_VERSION}`;
    document.head.appendChild(script);
    return true;
  } catch {
    // Analytics must never take the app down with it.
    return false;
  }
}

/**
 * Attaches the signed-in person to their recordings, so a session can be traced to a name
 * rather than an anonymous visitor — the whole point of watching usage here.
 *
 * Identified by the internal user id, not email: it is opaque, stable across an email change,
 * and every signer-in is an internal employee via Azure AD, so there is no cross-tenant
 * collision to worry about.
 *
 * Called on every profile change; Hotjar treats repeat identify calls as updates. Filtering
 * recordings by these attributes is a paid Hotjar feature — on a tier without it the call is
 * accepted and ignored, so this is safe to ship regardless of plan.
 *
 * @returns {boolean} true only when an identify call was actually sent.
 */
export function identifyHotjar(profile) {
  if (!hotjarEnabled() || !profile) return false;
  if (typeof window === 'undefined' || typeof window.hj !== 'function') return false;

  try {
    window.hj('identify', String(profile.id), {
      name: profile.name,
      // Lowercased so one person signing in as Jane.Doe@ and jane.doe@ is not two Hotjar users.
      email: (profile.email || '').trim().toLowerCase(),
      role: profile.role || 'UNKNOWN',
      team: profile.team,
      // Lets recordings be filtered to the people an admin actually manages.
      manager: profile.manager,
    });
    return true;
  } catch {
    /* never break the app for analytics */
    return false;
  }
}
