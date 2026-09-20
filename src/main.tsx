import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('ZOSUF root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Service worker lifecycle.
 *
 * The worker calls skipWaiting() on install, so a new deploy activates as soon
 * as it is fetched. We reload exactly once when control changes — but only if a
 * worker was already controlling the page, otherwise the very first install
 * would reload a perfectly fresh page. This is what removes the "old build
 * until you hard-refresh" behaviour on Cloudflare Pages.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for a newer deploy when the tab comes back into view.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
