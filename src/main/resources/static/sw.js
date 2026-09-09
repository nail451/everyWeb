/**
 * SERVICE WORKER - минимальная версия для тестирования
 */

console.log('📦 Service Worker script loaded');

self.addEventListener('install', function(event) {
    console.log('📦 Service Worker installing...');
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker activated');
    event.waitUntil(
        clients.claim().then(() => {
            console.log('✅ Clients claimed');
        })
    );
});

self.addEventListener('push', function(event) {
    console.log('📨 Push event received:', event);

    let data = {
        title: '🔔 Будильник',
        body: 'Время!',
        icon: '🔔',
        tag: 'alarm',
        requireInteraction: true
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            data = { ...data, ...parsed };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || '🔔',
            tag: data.tag || 'alarm_' + Date.now(),
            requireInteraction: data.requireInteraction !== false,
            actions: [
                { action: 'snooze', title: '⏰ Отложить' },
                { action: 'dismiss', title: '✖️ Закрыть' }
            ]
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notification clicked:', event);
    event.notification.close();

    if (event.action === 'snooze') {
        const snoozeTime = Date.now() + 5 * 60 * 1000;
        event.waitUntil(
            self.registration.showNotification('⏰ Будильник отложен', {
                body: `Следующее срабатывание в ${new Date(snoozeTime).toLocaleTimeString()}`,
                icon: '⏰',
                tag: 'snoozed_' + Date.now(),
                requireInteraction: false
            })
        );
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});