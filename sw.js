const CACHE_NAME = 'flipcard-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon.png'
];

// Install Service Worker & Simpan Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Gunakan Cache saat Offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cache jika ada, jika tidak fetch dari internet
                return response || fetch(event.request);
            })
    );
});

// Update Service Worker jika ada versi baru
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
