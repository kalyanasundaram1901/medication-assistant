/* eslint-disable no-restricted-globals */

self.addEventListener('push', function (event) {
    let data = { title: 'New Message', body: 'You have a new notification.' };
    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: data,
        vibrate: [100, 50, 100],
        actions: [
            { action: 'confirm', title: 'Taken ✅' },
            { action: 'snooze', title: 'Snooze ⏳' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const confirmation_id = event.notification.data.id;

    // Logic to handle click or actions
    if (event.action === 'confirm') {
        // We could make an API call here if we had the token
        // For now, let's just open the app
        event.waitUntil(clients.openWindow('/'));
    } else {
        event.waitUntil(clients.openWindow('/'));
    }
});
