/* Service Worker – SiWaWi Karteikarten
   Strategie: erst Cache, im Hintergrund auf neue Version prüfen.
   Gespeicherte Daten (localStorage) werden vom Service Worker nie angefasst. */
var VERSION = 'cd877ecef66b';
var CACHE = 'siwawi-' + VERSION;
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    })
  );
  // Beim allerersten Start sofort aktiv werden; Updates warten auf „Neu laden“
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('siwawi-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var isNav = req.mode === 'navigate';
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var key = isNav ? './index.html' : req;
      return cache.match(key, { ignoreSearch: true }).then(function (cached) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(isNav ? './index.html' : req, res.clone());
          return res;
        }).catch(function () { return null; });
        if (cached) { event.waitUntil(net); return cached; }
        return net.then(function (res) { return res || cache.match('./index.html') || new Response('Offline', { status: 503, statusText: 'Offline' }); });
      });
    })
  );
});
