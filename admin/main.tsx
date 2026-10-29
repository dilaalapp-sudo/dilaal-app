import React from 'react';
import ReactDOM from 'react-dom/client';
// Shared design tokens (Tailwind theme) — copied from the marketplace so this
// app has zero runtime coupling to the marketplace source tree.
import './index.css';
import App from './App';

/**
 * DILAAL Admin Panel — application entry point.
 * Independent from the marketplace app (src/main.tsx); shares only the
 * Supabase project (via env vars) and the CSS design tokens.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);