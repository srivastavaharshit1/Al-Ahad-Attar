import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Handle dynamic chunk loading errors (e.g. after a new release when cached tabs request obsolete chunk hashes)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error encountered, checking reload policy:', event);
  const lastReload = sessionStorage.getItem('al_ahad_last_chunk_reload');
  const now = Date.now();
  // Prevent infinite reload loop: only auto-reload once within 10 seconds
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('al_ahad_last_chunk_reload', String(now));
    window.location.reload();
  } else {
    console.error('Vite preload error occurred repeatedly within 10s. Halting auto-reload to avoid loop.');
  }
});

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </HelmetProvider>
  </StrictMode>,
);

