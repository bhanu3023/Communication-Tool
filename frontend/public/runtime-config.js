// Runtime configuration — read when the page loads, NOT compiled into the bundle. Vite copies
// public/ verbatim, so this file can be edited on a running server (or mounted over in the
// container, or substituted by an entrypoint) to change what the app does with no rebuild,
// no toolchain, and no Node.js.
//
// Every other VITE_* var in this app is frozen into the bundle at build time, which is why
// changing the Hotjar id used to mean rebuilding the image. It no longer does.
window.__APP_CONFIG__ = {
  // Hotjar Site ID, digits only. Deliberately NOT a real id: no value is hardcoded in the repo.
  //
  // The `__NAME__` form is recognised as "not set" by utils/runtimeConfig.js, so an
  // UNsubstituted placeholder falls through to the build-time VITE_HOTJAR_SITE_ID (from the
  // gitignored .env) instead of being used as a literal id. Both unset = Hotjar fully off:
  // no script requested, no session recorded.
  //
  // To set it at runtime, replace this placeholder with the id on the deployed server.
  hotjarSiteId: "__HOTJAR_SITE_ID__",
};
