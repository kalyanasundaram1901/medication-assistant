/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'med-assist-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo192.png',
    '/logo512.png',
    '/favicon.ico'
];

// Install a service worker
self.addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Cache and return requests
self.addEventListener('fetch', event => {
    // Only cache GET requests from our own origin (static assets)
    if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request).then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Don't cache the service worker itself
                        if (event.request.url.includes('custom-sw.js')) {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    });
                })
        );
    }
});


// Update a service worker
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

// This event listener wakes up even if the browser is closed (on Android/Windows)
self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();

            const options = {
                body: data.body,
                icon: '/logo192.png',
                badge: '/logo192.png',
                vibrate: [200, 100, 200, 100, 200], // Vibration pattern
                tag: 'medication-reminder-' + data.id, // Grouping
                renotify: true, // Make it pop up even if another notification is active
                requireInteraction: true, // Stays visible until user interacts (WhatsApp style)
                data: {
                    id: data.id,
                    name: data.name
                },
                actions: [
                    { action: 'confirm', title: 'Taken ✅' },
                    { action: 'snooze', title: 'Snooze 5m ⏳' }
                ]
            };

            const title = data.title || "💊 Medicine Time";

            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        } catch (e) {
            console.error("Error showing push notification:", e);
        }
    }
});

// Handling clicks when the OS notification is tapped
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Focus existing window or open a new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            if (windowClients.length > 0) {
                return windowClients[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});

