// Self-Destructing Service Worker
// Instantly unregisters itself and reloads any active client tabs to clear service worker traps.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll())
      .then(clients => {
        clients.forEach(client => {
          if (client.url) {
            client.navigate(client.url);
          }
        });
      })
  );
});
