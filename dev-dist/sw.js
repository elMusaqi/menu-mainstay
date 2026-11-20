/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-a454db71'], (function (workbox) { 'use strict';

  importScripts("/sw-custom.js");
  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "/index.html",
    "revision": "0.ghhoi9jt4sg"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    allowlist: [/^\/$/],
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(({
    url
  }) => /\/(menus|inventory|stok|master_topping|master_kategori|master_varian|store_settings)/i.test(url.pathname) || url.pathname.endsWith("menus.json") || url.pathname.endsWith("inventory_raw.json"), new workbox.StaleWhileRevalidate({
    "cacheName": "mainstay-pos-data-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 60,
      maxAgeSeconds: 604800
    })]
  }), 'GET');
  workbox.registerRoute(({
    request
  }) => request.destination === "image", new workbox.StaleWhileRevalidate({
    "cacheName": "mainstay-pos-images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 150,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.hostname.includes("cdn.tailwindcss.com") || url.hostname.includes("cdnjs.cloudflare.com") || url.hostname.includes("d3js.org") || url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com") || url.hostname.includes("gstatic.com"), new workbox.StaleWhileRevalidate({
    "cacheName": "mainstay-pos-cdn-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 80,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.endsWith(".mp3"), new workbox.CacheFirst({
    "cacheName": "mainstay-pos-audio-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
