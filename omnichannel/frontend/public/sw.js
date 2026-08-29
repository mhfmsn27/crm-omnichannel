// PWA Service Worker 2.0 for CRMHUB OMNICHANNEL
const CACHE_NAME = 'crmhub-pwa-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(() => {});
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
    // Only cache GET requests for same origin or static assets
    if (event.request.method !== 'GET') return;
    
    // Ignore API requests or socket connections for caching
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache).catch(() => {});
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/index.html');
                });
            })
    );
});

// Listen to Push Notifications
self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Pesan Baru', body: event.data.text() };
        }
    }

    const title = data.title || 'CRMHUB Omnichannel';
    const options = {
        body: data.body || 'Ada pesan baru dari pelanggan.',
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        data: data.url || '/inbox',
        tag: data.tag || 'new-message',
        renotify: true,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Click to Open / Focus App & Deep Link
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data || '/inbox';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
