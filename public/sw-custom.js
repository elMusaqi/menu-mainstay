// =========================================================================
// MAINSTAY DRINK POS & E-MENU - SERVICE WORKER CUSTOM EXTENSIONS
// Dimuat oleh Service Worker Workbox (importScripts) untuk Stale-While-Revalidate
// Katalog Menu, Background Sync, Periodic Sync, & Notifikasi Web.
// =========================================================================

const MENU_SWR_CACHE_NAME = 'mainstay-pos-menu-catalog-swr-v2';
const MENU_IMG_SWR_CACHE_NAME = 'mainstay-pos-menu-images-swr-v1';
const MENU_SWR_PATH_REGEX = /\/(menus|categories|master_kategori|master_topping|master_varian|store_settings|inventory_raw|loyalty_rewards|vouchers)(\.json)?$/i;
const MENU_IMG_EXT_REGEX = /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i;

function isMenuCatalogSWRRequest(request) {
  if (!request || request.method !== 'GET') return false;
  try {
    const url = new URL(request.url);
    const isFirebaseJson =
      (url.hostname.includes('firebasedatabase.app') || url.hostname.includes('firebaseio.com')) &&
      MENU_SWR_PATH_REGEX.test(url.pathname);
    const isLocalCatalogJson =
      url.origin === self.location.origin &&
      (MENU_SWR_PATH_REGEX.test(url.pathname) || url.pathname.startsWith('/api/menus'));
    return isFirebaseJson || isLocalCatalogJson;
  } catch (e) {
    return false;
  }
}

function isMenuImageSWRRequest(request) {
  if (!request || request.method !== 'GET') return false;
  try {
    const url = new URL(request.url);
    if (request.destination === 'image') return true;
    if (url.hostname.includes('firebasestorage.googleapis.com') && MENU_IMG_EXT_REGEX.test(url.pathname)) return true;
    return url.origin === self.location.origin && MENU_IMG_EXT_REGEX.test(url.pathname);
  } catch (e) {
    return false;
  }
}

async function fetchWithTimeout(request, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (_) {}
  }, timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleMenuCatalogStaleWhileRevalidate(event) {
  const cache = await caches.open(MENU_SWR_CACHE_NAME);
  const cachedResponse = await cache.match(event.request);
  let cachedText = null;
  if (cachedResponse) {
    try {
      cachedText = await cachedResponse.clone().text();
    } catch (_) {}
  }

  const networkRevalidationPromise = fetchWithTimeout(event.request, 4500)
    .then(async (networkResponse) => {
      if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
        let freshText = null;
        try {
          freshText = await networkResponse.clone().text();
        } catch (_) {}

        await cache.put(event.request, networkResponse.clone());

        // Broadcast jika ada pembaruan konten dibandingkan cache lama
        if (freshText !== null && freshText !== cachedText) {
          try {
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            clients.forEach((client) => {
              client.postMessage({
                type: 'CATALOG_SWR_REVALIDATED',
                url: event.request.url,
                payload: freshText,
                timestamp: Date.now()
              });
            });
          } catch (_) {}
        }
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  if (cachedResponse) {
    event.waitUntil(networkRevalidationPromise);
    return cachedResponse;
  }

  const freshResponse = await networkRevalidationPromise;
  if (freshResponse) return freshResponse;

  return new Response(JSON.stringify({}), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleMenuImageStaleWhileRevalidate(event) {
  const cache = await caches.open(MENU_IMG_SWR_CACHE_NAME);
  const cachedResponse = await cache.match(event.request);

  const networkPromise = fetchWithTimeout(event.request, 6000)
    .then(async (networkResponse) => {
      if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
        await cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  if (cachedResponse) {
    event.waitUntil(networkPromise);
    return cachedResponse;
  }

  const freshResponse = await networkPromise;
  if (freshResponse) return freshResponse;

  return new Response('', { status: 504, statusText: 'Image Offline Fallback' });
}

self.addEventListener('fetch', (event) => {
  if (isMenuCatalogSWRRequest(event.request)) {
    event.respondWith(handleMenuCatalogStaleWhileRevalidate(event));
    return;
  }
  if (isMenuImageSWRRequest(event.request)) {
    event.respondWith(handleMenuImageStaleWhileRevalidate(event));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-orders' || event.tag === 'sync-mainstay') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC_TRIGGERED',
            tag: event.tag,
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-report-sync' || event.tag === 'mainstay-scheduled-tasks') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PERIODIC_DAILY_REPORT_TRIGGER',
            tag: event.tag,
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CHECK_CACHE_STATUS' && event.source) {
    caches.keys().then((keys) => {
      event.source.postMessage({
        type: 'CACHE_STATUS_RESULT',
        caches: keys
      });
    });
  }

  if (event.data.type === 'TRIGGER_DAILY_REPORT_NOTIF' && event.data.payload) {
    const payload = event.data.payload;
    const title = payload.title || '📊 Laporan Harian 23:59 Siap Dikirim ke WA Owner';
    const options = {
      body: payload.body || 'Klik untuk membuka WhatsApp dan mengirimkan rekap omzet, stok, dan absensi hari ini ke Owner.',
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      tag: 'mainstay-daily-report-2359',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      data: {
        waUrl: payload.waUrl,
        reportDate: payload.reportDate,
        summary: payload.summary
      },
      actions: [
        { action: 'open_wa', title: '📲 Kirim WhatsApp Owner' },
        { action: 'view_pos', title: '👁️ Buka Aplikasi POS' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const waUrl = data.waUrl;

  if (event.action === 'open_wa' && waUrl) {
    event.waitUntil(self.clients.openWindow(waUrl));
    return;
  }

  if (waUrl && (!event.action || event.action === '')) {
    event.waitUntil(self.clients.openWindow(waUrl));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
