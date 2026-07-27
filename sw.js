/* 国民工作台 · Service Worker（离线缓存 + 启动拉取云端） */
const CACHE = 'guomin-v1';
const ASSETS = ['./', './index.html', './css/style.css', './manifest.json', './icon-192.png', './icon-512.png',
  './js/store.js', './js/ui.js', './js/sync.js', './js/reminders.js', './js/app.js',
  './js/modules/cases.js', './js/modules/live.js', './js/modules/douyin.js', './js/modules/health.js', './js/modules/global.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  // 只缓存同源 GET 请求；JSONBin 等跨域请求直通
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
    const cp = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return resp;
  }).catch(() => caches.match('./index.html'))));
});
