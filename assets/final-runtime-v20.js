(() => {
  'use strict';
  const VERSION = '20.0.0';
  const setHeight = () => document.documentElement.style.setProperty('--app-height', `${window.visualViewport?.height || window.innerHeight}px`);
  setHeight();
  addEventListener('resize', setHeight, { passive: true });
  window.visualViewport?.addEventListener('resize', setHeight, { passive: true });

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.nexusVersion = VERSION;
    document.querySelector('.nexus-mobile-nav')?.remove();

    // Prevent stale drafts from reopening as if they were a sent chat.
    const input = document.getElementById('promptInput');
    if (input && !location.search && !location.hash) {
      input.value = '';
      input.style.height = '';
    }

    // Keep auth modal at the top when switching login/signup.
    const auth = document.getElementById('authModalBackdrop');
    auth?.addEventListener('click', event => {
      if (event.target.closest('[data-auth-mode]')) {
        requestAnimationFrame(() => document.querySelector('.auth-startup-main')?.scrollTo({ top: 0, behavior: 'smooth' }));
      }
    });

    // One-time cleanup of caches older than V20.
    const key = 'nexus-v20-cache-cleaned';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      if ('caches' in window) caches.keys().then(keys => Promise.all(keys.filter(k => !k.includes('v20')).map(k => caches.delete(k)))).catch(() => {});
    }
  });
})();
