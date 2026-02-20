const CACHE_NAME = 'kafak-app-v2';

// കാഷെ ചെയ്യേണ്ട പ്രധാന ഫയലുകൾ
const urlsToCache = [
    './order.html',
    './admin.html',
    './custom.js',
    './admin.js',
    './translations.js',
    './logo.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

// ഇന്റർനെറ്റ് ഉണ്ടെങ്കിൽ പുതിയ ഡാറ്റ എടുക്കും, അല്ലെങ്കിൽ പഴയ സേവ് ചെയ്ത ഡാറ്റ കാണിക്കും
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});