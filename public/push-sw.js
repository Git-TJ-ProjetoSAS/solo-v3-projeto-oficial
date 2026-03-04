// Push notification handler - imported by the main service worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, data: notifData } = data;

    event.waitUntil(
      self.registration.showNotification(title || 'Solo V3', {
        body: body || '',
        icon: icon || '/pwa-192x192.png',
        badge: badge || '/pwa-192x192.png',
        tag: tag || 'default',
        vibrate: [200, 100, 200],
        data: notifData || {},
        actions: [
          { action: 'open', title: 'Ver detalhes' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      })
    );
  } catch (e) {
    console.error('Push event error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlPath = event.notification.data?.url || '/client/irrigacao';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlPath) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlPath);
      }
    })
  );
});
