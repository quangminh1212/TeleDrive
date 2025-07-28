// TeleDrive Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = 'teledrive-v1.0.0';
const STATIC_CACHE = 'teledrive-static-v1.0.0';
const DYNAMIC_CACHE = 'teledrive-dynamic-v1.0.0';

// Files to cache for offline use
const STATIC_FILES = [
  '/',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/manifest.json',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/get_files',
  '/api/folders',
  '/api/analytics/dashboard'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          // For API requests, try to update cache in background
          if (isApiRequest(request.url)) {
            updateCacheInBackground(request);
          }
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache the response
            const responseToCache = response.clone();
            
            if (isStaticFile(request.url)) {
              caches.open(STATIC_CACHE)
                .then(cache => cache.put(request, responseToCache));
            } else if (isCacheableApi(request.url)) {
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(request, responseToCache));
            }
            
            return response;
          })
          .catch(error => {
            console.log('Service Worker: Fetch failed, serving offline page', error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
            
            // Return offline icon for image requests
            if (request.destination === 'image') {
              return caches.match('/static/icons/offline.png');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'upload-files') {
    event.waitUntil(syncUploadFiles());
  } else if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from TeleDrive',
    icon: '/static/icons/icon-192x192.png',
    badge: '/static/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/static/icons/view-24x24.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/icons/close-24x24.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('TeleDrive', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
function isStaticFile(url) {
  return STATIC_FILES.some(file => url.includes(file)) ||
         url.includes('/static/') ||
         url.includes('fonts.googleapis.com');
}

function isApiRequest(url) {
  return url.includes('/api/');
}

function isCacheableApi(url) {
  return CACHEABLE_APIs.some(api => url.includes(api));
}

function updateCacheInBackground(request) {
  fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        caches.open(DYNAMIC_CACHE)
          .then(cache => cache.put(request, response.clone()));
      }
    })
    .catch(error => {
      console.log('Service Worker: Background update failed', error);
    });
}

async function syncUploadFiles() {
  try {
    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: upload.formData
        });
        
        if (response.ok) {
          await removePendingUpload(upload.id);
          console.log('Service Worker: Upload synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Upload sync failed', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Sync upload files failed', error);
  }
}

async function syncOfflineData() {
  try {
    // Sync any offline data changes
    console.log('Service Worker: Syncing offline data');
    
    // Update file list cache
    const response = await fetch('/api/get_files');
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/get_files', response.clone());
    }
  } catch (error) {
    console.error('Service Worker: Sync offline data failed', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingUploads() {
  // Implementation would use IndexedDB to store pending uploads
  return [];
}

async function removePendingUpload(id) {
  // Implementation would remove upload from IndexedDB
  console.log('Removing pending upload:', id);
}

// Message handling from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_UPDATE') {
    // Force cache update
    caches.delete(DYNAMIC_CACHE);
  }
});

console.log('Service Worker: Loaded successfully');
