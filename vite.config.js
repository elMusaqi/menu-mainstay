import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      devOptions: {
        enabled: true,
        type: 'classic'
      },
      workbox: {
        globPatterns: [
          'index.html',
          'assets/*.{js,css}',
          'fontawesome/css/*.css',
          'fontawesome/webfonts/*.woff2',
          'manifest.json',
          'sw-custom.js',
          'logo-192.png',
          'logo-512.png',
          'pwa-maskable-512x512.png',
          'apple-touch-icon.png',
          'banner*.png',
          'qris-mainstay.png',
          'notif-mainstay.mp3'
        ],
        globIgnores: ['assets/aistudio/**', 'sw.js', 'workbox-*.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['/sw-custom.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              ((url.hostname.includes('firebasedatabase.app') || url.hostname.includes('firebaseio.com')) &&
                /\/(menus|master_kategori|master_topping|master_varian|store_settings|inventory_raw)\.json$/i.test(url.pathname)) ||
              /\/(menus|inventory|stok|master_topping|master_kategori|master_varian|store_settings)(\.json)?$/i.test(url.pathname) ||
              url.pathname.endsWith('menus.json') ||
              url.pathname.endsWith('inventory_raw.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mainstay-pos-menu-catalog-swr',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' ||
              url.hostname.includes('firebasestorage.googleapis.com') ||
              url.hostname.includes('firebasestorage.app'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mainstay-pos-images-cache',
              expiration: {
                maxEntries: 180,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('cdn.tailwindcss.com') ||
              url.hostname.includes('cdnjs.cloudflare.com') ||
              url.hostname.includes('d3js.org') ||
              url.hostname.includes('fonts.googleapis.com') ||
              url.hostname.includes('fonts.gstatic.com') ||
              url.hostname.includes('gstatic.com'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'mainstay-pos-cdn-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mainstay-pos-audio-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) return 'vendor-jspdf';
            if (id.includes('html5-qrcode')) return 'vendor-qr-scanner';
            if (id.includes('d3')) return 'vendor-d3';
            if (id.includes('qrcode')) return 'vendor-qrcode';
          }
        }
      }
    }
  }
});
