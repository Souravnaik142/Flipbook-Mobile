const CACHE_NAME = 'flipbook-cache-v2';
const OFFLINE_URLS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'yourcourse.pdf',
  'page-flip.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js',
  'https://cdn.jsdelivr.net/npm/page-flip/dist/css/page-flip.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request).then((res) => {
        try {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        } catch (e) {}
        return res;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
