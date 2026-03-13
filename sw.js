// 🔥 BYPASS CACHE SERVICE WORKER
const CACHE_VERSION = 'v-no-cache';

// 1. Install & Skip Waiting (പുതിയ ഫയൽ വന്നാൽ ഉടൻ അപ്ഡേറ്റ് ആവാൻ)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 2. Activate & Clear All Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. Fetch - എപ്പോഴും നെറ്റിൽ നിന്നും മാത്രം എടുക്കുക (No Cache)
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});