// ============================================================================
// Service Worker Push & Notification Click Handlers
// ADR-007: Multiplatform Web Push Notifications & Extensible Event Registry
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Smart Shopping',
      body: event.data.text() || 'Nowe powiadomienie',
    };
  }

  const title = payload.title || 'Smart Shopping';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'smart-shopping-default',
    renotify: true,
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
    },
    vibrate: payload.vibrate || [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open with the application origin, navigate and focus it
      for (const client of windowClients) {
        if ('navigate' in client && client.url.includes(self.location.origin)) {
          return client.navigate(targetUrl).then((focusedClient) => {
            if (focusedClient && 'focus' in focusedClient) {
              return focusedClient.focus();
            }
            return client.focus();
          });
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
