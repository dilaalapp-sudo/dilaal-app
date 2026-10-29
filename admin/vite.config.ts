import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * DILAAL Admin Panel — standalone Vite project.
 *
 * - Port 3001 so it runs alongside the marketplace/backend (dilaal-main) on 3000.
 * - In development, /api/* is proxied to the Express server in dilaal-main, so
 *   the admin app makes same-origin API calls (no CORS needed).
 * - In production, build with VITE_API_BASE_URL set to the API origin, or serve
 *   the static dist/ behind the same reverse proxy as the API.
 */
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3001,
    strictPort: true,
  },
}));
