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

self.addEventListener('fetch', function (event) {
    // 🔥 FIX: Google Apps Script നെ സർവീസ് വർക്കർ ക്യാഷ് ചെയ്യാതിരിക്കാൻ
    if (event.request.url.includes("script.google.com") || event.request.url.includes("script.googleusercontent.com")) {
        // ഇന്റർനെറ്റിൽ നിന്ന് നേരിട്ട് ഡാറ്റ എടുക്കാൻ അനുവദിക്കുന്നു
        return;
    }

    // നിങ്ങളുടെ ബാക്കിയുള്ള പഴയ കോഡുകൾ താഴെ...
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});