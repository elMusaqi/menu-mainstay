// Ganti nama cache agar browser tahu ada update kodingan baru
const CACHE_NAME = 'mainstay-app-v3';

// Daftar file yang harus disimpan di memori HP (Offline Mode)
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Proses Install: Menyimpan file ke memori (Cache)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache berhasil dibuka');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Paksa langsung aktif
});

// Proses Activate: Menghapus memori (Cache) kodingan yang lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Proses Fetch: Memanggil data (Jika offline, ambil dari memori)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, tampilkan. Jika tidak, minta ke internet.
        return response || fetch(event.request);
      })
  );
});
