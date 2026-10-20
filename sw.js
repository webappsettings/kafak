/* Network-only application releases; never reuse HTTP-cached HTML or scripts. */
const RELEASE = '20261020a';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).map(key => caches.delete(key)));
  await self.clients.claim();
  for (const client of await self.clients.matchAll({type:'window'})) client.postMessage({type:'KAFAK_RELEASE',release:RELEASE});
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // An old admin's Reload Data action must load the migrated application too.
  if (url.hostname === 'script.google.com' && url.searchParams.get('action') === 'getAllOrders') {
    event.respondWith((async () => {
      const client = await self.clients.get(event.clientId);
      if (client && new URL(client.url).pathname.endsWith('/admin.html')) {
        const next = new URL(client.url); next.searchParams.set('_release', RELEASE);
        await client.navigate(next.href);
        return new Response(JSON.stringify({result:'error',message:'Updating application'}),{headers:{'Content-Type':'application/json'}});
      }
      return fetch(event.request,{cache:'no-store'});
    })());
    return;
  }
  if (url.origin === self.location.origin && (event.request.mode === 'navigate' || ['script','style'].includes(event.request.destination))) {
    event.respondWith(fetch(event.request,{cache:'no-store'}));
  }
});
