// PWA Service Worker for CRMHUB OMNICHANNEL
const CACHE_NAME = 'crmhub-pwa-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
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

// Click to Open / Focus App
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
