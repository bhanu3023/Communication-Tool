// Small wrappers around the Fullscreen API (with webkit fallback).
// enterFullscreen must be called from within a user gesture (e.g. a click handler).

export function enterFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) {
    try {
      const result = req.call(el);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      /* ignored — fullscreen is best-effort */
    }
  }
}

export function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (document.fullscreenElement && exit) {
    try {
      const result = exit.call(document);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {
      /* ignored */
    }
  }
}
