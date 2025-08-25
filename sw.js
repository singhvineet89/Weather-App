/* sw.js */
const SW_VERSION = 'v1.0.0';
const PRECACHE = `precache-${SW_VERSION}`;
const RUNTIME = `runtime-${SW_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './offline.html',

  // Background + UI images used by your app
  './assets/assets/bg.jpg',
  './assets/assets/message/search-city.png',
  './assets/assets/message/not-found.png',

  // Weather icons you actually use (add the rest as needed)
  './assets/assets/weather/clear.svg',
  './assets/assets/weather/clouds.svg',
  './assets/assets/weather/drizzle.svg',
  './assets/assets/weather/rain.svg',
  './assets/assets/weather/snow.svg',
  './assets/assets/weather/thunderstorm.svg',
  './assets/assets/weather/atmosphere.svg',

  // PWA icons
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-192.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting(); // activate new SW ASAP
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== PRECACHE && key !== RUNTIME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) HTML navigations: network-first, fallback to offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  // 2) Same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) OpenWeather API: network-first, fallback to cache if available
  if (url.hostname.includes('api.openweathermap.org')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 4) Default: try network then cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
