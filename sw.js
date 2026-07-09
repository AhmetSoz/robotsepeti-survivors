'use strict';
// ─── Service Worker: uygulama gibi kurulum + çevrimdışı oynanış ───
// Statik dosyalar önbelleğe alınır; /api/ (skor tablosu) her zaman ağdan gider.

const CACHE = 'rs-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/utils.js',
  './js/font.js',
  './js/audio.js',
  './js/input.js',
  './js/data.js',
  './js/meta.js',
  './js/missions.js',
  './js/sprites.js',
  './js/world.js',
  './js/entities.js',
  './js/game.js',
  './js/ui.js',
  './js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // skor API'si: daima ağ (önbelleğe alma)
  if (url.pathname.includes('/api/')) return;
  // statikler: önce ağ, düşerse önbellek (güncel kalır, offline da çalışır)
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
