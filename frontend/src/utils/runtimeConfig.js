/**
 * Resolves configuration that may be set at RUNTIME (public/runtime-config.js, editable on a
 * running server) or at BUILD time (a VITE_* var frozen into the bundle by Vite).
 *
 * Runtime wins. That ordering is the whole point: an image built without a value can be switched
 * on by editing one line on the server, with no rebuild.
 *
 * Lives in utils/ rather than a new config/ folder — see .claude/rules/architecture-boundaries.md,
 * which bars new frontend top-level folders without an architect decision.
 */

const runtime =
  typeof window !== 'undefined' && window.__APP_CONFIG__ ? window.__APP_CONFIG__ : {};

/**
 * Treated as "not set": undefined, null, blank, and the `__PLACEHOLDER__` shape that container
 * entrypoints substitute at start-up — an UNsubstituted placeholder must fall through to the next
 * source, never be used as a real value.
 */
function isUnset(value) {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  return !trimmed || /^__.*__$/.test(trimmed);
}

function resolve(runtimeValue, buildTimeValue) {
  for (const raw of [runtimeValue, buildTimeValue]) {
    if (!isUnset(raw)) return raw.trim();
  }
  return '';
}

/**
 * Hotjar Site ID. Not a secret — it ships in client-side JS.
 *
 * Asymmetry worth knowing: writing an id into runtime-config.js turns recording ON for a bundle
 * built without one. Writing "" there cannot turn it OFF, because a blank runtime value falls
 * through to the baked-in build value. To disable a bundle that has an id baked in, rebuild
 * without the build arg.
 */
export const HOTJAR_SITE_ID = resolve(
  runtime.hotjarSiteId,
  import.meta.env.VITE_HOTJAR_SITE_ID,
);
