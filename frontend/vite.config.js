import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // The app shipped as ONE ~996 kB chunk, so first paint waited on every page and
    // every vendor library at once. Routes are lazy-loaded (see App.jsx) and the big,
    // rarely-changing vendors get their own chunks so they stay cached across deploys.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // MSAL is only needed to sign in, but it is large and changes rarely.
          if (id.includes('@azure/msal')) return 'msal';
          // MUI + Emotion dominate the bundle; one chunk keeps their init order intact.
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          return 'vendor';
        },
      },
    },
    // The remaining warning threshold is about the mui chunk, which is irreducible
    // without dropping the component library. Raised so the build stays quiet-by-default
    // and a NEW regression is what makes noise.
    chunkSizeWarningLimit: 700,
  },
});
