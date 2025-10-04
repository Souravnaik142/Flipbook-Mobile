const CACHE_NAME = 'flipbook-cache-v2';
const OFFLINE_URLS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'yourcourse.pdf',
  'page-flip.wav',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js',
  'https://cdn.jsdelivr.net/npm/page-flip/dist/css/page-flip.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) return resp;
      return fetch(event.request).then(fetchRes => {
        // Cache responses when possible
        return caches.open(CACHE_NAME).then(cache => {
          try { cache.put(event.request, fetchRes.clone()); } catch(e) {}
          return fetchRes;
        });
      }).catch(() => {
        // fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
