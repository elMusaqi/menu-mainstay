const CACHE_NAME = 'mainstay-pos-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './logo-192.png',
  './logo-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Install & Cache semua aset awal
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Membuka cache dan menyimpan aset utama.');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. Bersihkan cache versi lama jika ada pembaruan aplikasi
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache versi lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Strategi Fetch (Bypass Firebase & Sheets, Cache untuk aset UI)
self.addEventListener('fetch', event => {
  // Abaikan request ekstensi Chrome
  if (!(event.request.url.startsWith('http:') || event.request.url.startsWith('https:'))) {
    return;
  }

  // PENTING: Jangan cache request ke Firebase Database atau Google Sheets
  // agar data pesanan Kasir/Owner selalu REAL-TIME dan tidak error nyangkut.
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('script.google.com') || event.request.url.includes('googleapis.com')) {
    return;
  }

  // Jalankan Network First, Fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Jika internet di HP putus, kembalikan dari Cache
        return caches.match(event.request);
      })
  );
});
