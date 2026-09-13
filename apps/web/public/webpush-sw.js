// Web Push Service Worker for native push notifications

self.addEventListener('push', async (event) => {
  try {
    // Check if there's a focused client - if so, skip showing notification
    // (the client can handle it via the message event)
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = clientList.some((client) => client.focused === true);

    if (hasFocusedClient) {
      // Post message to focused client for foreground handling
      const data = event.data ? event.data.json() : {};
      clientList.forEach((client) => {
        if (client.focused) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            payload: data,
          });
        }
      });
      return;
    }

    // Parse the push message data
    const data = event.data ? event.data.json() : {};

    const notificationTitle =
      data.title && String(data.title).trim() !== '' ? data.title : 'New notification';
    const notificationOptions = {
      body: data.body || '',
      icon: data.icon || '/favicon/web-app-manifest-192x192.png',
      badge: '/favicon/favicon-96x96.png',
      data: {
        url: data.link || '/',
      },
      // Require interaction to ensure user notices the notification
      requireInteraction: false,
      // Auto-close after a while
      tag: 'podverse-notification-' + Date.now(),
    };

    // Add image if available
    if (data.image) {
      notificationOptions.image = data.image;
    }

    event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
  } catch (e) {
    console.error('Push event error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        const existing = clientList.find((client) => 'focus' in client);
        if (existing !== undefined && typeof existing.navigate === 'function') {
          return existing.navigate(absoluteUrl).then((navigated) => {
            const focused = navigated ?? existing;
            return 'focus' in focused ? focused.focus() : existing.focus();
          });
        }
        if (existing !== undefined) {
          return existing.focus();
        }
        return clients.openWindow(absoluteUrl);
      })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
