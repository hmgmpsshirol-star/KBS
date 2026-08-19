// MDM ವರದಿ - Service Worker
// ಆ್ಯಪ್ ಶೆಲ್ ಅನ್ನು ಕ್ಯಾಶ್ ಮಾಡಿ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿಯೂ ಬಳಸಬಹುದಾಗಿಸುತ್ತದೆ.

const CACHE_NAME = 'mdm-vardi-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ಇನ್‌ಸ್ಟಾಲ್: ಆ್ಯಪ್ ಶೆಲ್ ಫೈಲ್‌ಗಳನ್ನು ಕ್ಯಾಶ್ ಮಾಡಿ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ಆಕ್ಟಿವೇಟ್: ಹಳೆಯ ಕ್ಯಾಶ್‌ಗಳನ್ನು ಅಳಿಸಿ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ಫೆಚ್: ಆ್ಯಪ್ ಶೆಲ್‌ಗೆ cache-first, ಉಳಿದೆಲ್ಲಕ್ಕೂ network-first (ವಿಫಲವಾದರೆ ಕ್ಯಾಶ್‌ಗೆ ಹಿಂತಿರುಗಿ)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // App shell: cache first, then network, and refresh cache in background
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    // Third-party (fonts, xlsx, html2pdf CDN): network first, fall back to cache
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => caches.match(req))
    );
  }
});
