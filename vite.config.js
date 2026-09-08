// Vite, added in turn 015 when decision 0008 ("the frontend has no build step")
// was superseded by 0012.
//
// Deliberately minimal. The interesting parts of this project are in `src/` and
// `netlify/functions/`, and none of them know this file exists — the migration
// swapped a frontend, not an application.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The app lives in web/, where the single HTML file used to. Keeping the
  // directory means netlify.toml, the deploy history and every reference in the
  // documentation still point at the same place.
  root: 'web',

  plugins: [react()],

  build: {
    // web/dist. Gitignored; Netlify builds it.
    outDir: 'dist',
    emptyOutDir: true,
    // The whole point of a build step, per 0012: an unresolved import is now a
    // build failure rather than a blank screen at runtime.
    sourcemap: true,
  },

  server: {
    port: 5173,
    // `netlify dev` runs this and proxies /api/* to the functions itself, so
    // there is no proxy configuration here. Running `vite` alone serves the
    // page with no backend, which is the honest failure: every fetch 404s and
    // the page says the archive and the case could not be loaded.
    strictPort: true,
  },
});
