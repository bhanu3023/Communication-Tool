import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Packages that every route needs anyway, so they are worth pinning into stable, long-cached
// chunks of their own rather than letting Rollup fold them into the entry (which changes hash on
// every commit and would make users re-download React each deploy).
const ALWAYS_EAGER = [
  '/node_modules/react/',
  '/node_modules/react-dom/',
  '/node_modules/scheduler/',
  '/node_modules/react-router/',
  '/node_modules/react-router-dom/',
  '/node_modules/@remix-run/',
];

// The MUI/Emotion runtime — the styling engine itself, as opposed to the components built on it.
// This part IS on the critical path (theme.js and CssBaseline pull it in before anything renders)
// and it is order-sensitive, so it stays welded into one chunk.
const MUI_CORE = ['@emotion', '@mui/system', '@mui/utils', '@mui/base', '@mui/material/styles'];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Routes are lazy-loaded (see App.jsx) and the big, rarely-changing vendors get their own
    // chunks so they stay cached across deploys.
    //
    // The earlier version of this function ended in `return 'vendor'`, which quietly undid most
    // of the code splitting: a catch-all forces EVERY node_modules module into one of three
    // eagerly-preloaded chunks, whether or not the first screen needs it. All 843 @mui modules
    // landed in one 338 kB chunk on the critical path — Autocomplete, Tooltip, Dialog, Snackbar
    // and the 57 kB of popper.js behind them — even though only lazy pages ever use them, and
    // Lighthouse duly reported 136 kB of unused JavaScript.
    //
    // Returning undefined instead hands the decision back to Rollup, which places a module with
    // whichever chunks actually import it. Component code now travels with the page that uses
    // it. This is a packaging change only: the same modules run in the same order — Rollup still
    // guarantees each module lands in exactly one chunk, so Emotion stays a singleton and styles
    // are inserted at render time exactly as before.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // MSAL is only needed to sign in, but it is large and changes rarely.
          if (id.includes('@azure/msal')) return 'msal';
          if (ALWAYS_EAGER.some((p) => id.includes(p))) return 'react';
          if (MUI_CORE.some((p) => id.includes(p))) return 'mui-core';
          return undefined;
        },
      },
    },
    // The remaining warning threshold is about the msal chunk, which is irreducible without
    // touching the sign-in flow. Raised so the build stays quiet-by-default and a NEW regression
    // is what makes noise.
    chunkSizeWarningLimit: 700,
  },
});
