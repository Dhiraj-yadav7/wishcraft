const CACHE_NAME = 'surprise-saas-cache-v1';
const PRE_CACHE_RESOURCES = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/generator.html',
  '/view.html',
  '/src/css/style.css',
  '/src/css/auth.css',
  '/src/css/dashboard.css',
  '/src/css/generator.css',
  '/src/js/auth.js',
  '/src/js/dashboard.js',
  '/src/js/generator.js',
  '/src/js/viewer.js',
  '/manifest.json'
];

// Service Worker Install & Pre-cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Activate & Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor: Stale-While-Revalidate
self.addEventListener('fetch', event => {
  // Only intercept HTTP/HTTPS GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Avoid intercepting API routes
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Normalize clean URLs to match cached HTML files
  const url = new URL(event.request.url);
  let cacheKey = event.request;
  
  if (url.pathname !== '/' && !url.pathname.includes('.') && !url.pathname.endsWith('/')) {
    // Search cache for the .html version
    cacheKey = url.pathname + '.html';
  }

  event.respondWith(
    caches.match(cacheKey)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Fetch updated version in the background
          fetch(event.request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {}); // ignore offline failures
          
          return cachedResponse;
        }

        return fetch(event.request);
      })
  );
});

// Push notification event listener (SaaS push notifications support)
self.addEventListener('push', event => {
  let data = { title: 'Surprise Card Notification 🎂', body: 'Someone signed your guestbook!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=SurpriseApp',
    badge: 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=SurpriseApp',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
