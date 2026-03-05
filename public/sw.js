self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('qr-share-v1').then(cache => {
      return cache.addAll([
        '/',
        '/style.css'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});