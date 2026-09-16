/* Minimaler Offline-Cache. Beim Ändern der Dateien CACHE hochzählen. */
var CACHE = 'mylittlejoy-v5';
var FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/activities.js',
  './js/joycards.js',
  './js/state.js',
  './js/beachworld.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

/* GitHub Pages liefert alles mit "Cache-Control: max-age=600" aus. Ein
   normaler fetch() wird deshalb bis zu zehn Minuten lang aus dem
   HTTP-Cache des Browsers bedient - auch hier im Service Worker. Updates
   kaemen dadurch verspaetet an, obwohl die Strategie network-first ist.
   Ein frisch aus der URL gebauter Request mit cache:"reload" umgeht das.
   Bewusst aus der URL gebaut und nicht aus e.request: aus einem Request
   im Modus "navigate" laesst sich kein neuer Request konstruieren. */
function freshRequest(url) {
  return new Request(url, { cache: 'reload', credentials: 'same-origin' });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network-first: online sieht man immer die aktuelle Version,
   offline kommt die zuletzt gespeicherte. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // nur eigene Dateien

  e.respondWith(
    fetch(freshRequest(url.href)).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
