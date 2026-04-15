const CACHE_NAME = 'dwisma-portal-v1';

// Aset lokal yang akan di-cache untuk akses offline
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/img/Logo Dwisma.png',
    '/img/favicon.ico',
    '/img/Logo CBT.png',
    '/img/Logo Dapodik.png',
    '/img/Logo Kelas Virtual.png',
    '/img/Logo Pustaka.png',
    '/img/Logo Rapot.png',
    '/img/Logo pemprov.png',
    '/img/background.jpeg',
    '/img/logo-erapor-sma.png',
    '/img/logoruanggtk.png',
    '/img/logosispala.png',
    '/img/logososiologi.png',
];

// Install: cache semua aset lokal
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching aset lokal...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate: hapus cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Menghapus cache lama:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch: Network-first untuk halaman utama, Cache-first untuk aset gambar
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Hanya handle request dari origin sendiri (bukan link eksternal)
    if (url.origin !== self.location.origin) return;

    // Strategi: Network first, fallback ke cache
    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                // Simpan response terbaru ke cache
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
                }
                return networkResponse;
            })
            .catch(() => {
                // Jika offline, gunakan cache
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    // Fallback: tampilkan halaman utama jika navigasi
                    if (request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
