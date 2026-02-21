/* eslint-disable no-restricted-globals */

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
