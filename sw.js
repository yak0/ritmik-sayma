/* =========================================================
   Ritmik Sayma Macerası — çevrimdışı çalışma (service worker)
   İlk açılışta tüm oyun dosyalarını tablete kaydeder; sonra
   internet ve bilgisayar olmadan da çalışır. İnternet varken
   arka planda yeni sürümü indirir (bir sonraki açılışta görünür).
   Dosyaları güncelleyince VERSION değerini artırın.
   ========================================================= */
const VERSION = 'v2';
const CACHE = 'ritmik-sayma-' + VERSION;
const FONT_CACHE = 'ritmik-sayma-fonts';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css',
  'js/util.js', 'js/audio.js', 'js/voice.js', 'js/fx.js', 'js/app.js',
  'js/games/learn.js', 'js/games/balloon.js', 'js/games/rhythm.js', 'js/games/train.js', 'js/games/rocket.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Oyun dosyaları: önce kayıtlı kopya, arka planda güncelle
  if (url.origin === self.location.origin) {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => null);
    e.waitUntil(net.then(() => undefined));
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(cached =>
        cached || net.then(res => res || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
      )
    );
    return;
  }

  // Yazı tipi (Google Fonts): bir kez indir, hep sakla
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(() => Response.error())))
    );
  }
});
