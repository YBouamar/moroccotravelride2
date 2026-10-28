// Dev-only kill switch: a service worker left on localhost:3000 by another project keeps serving
// stale chunks ("module factory is not available"). Browsers re-fetch /sw.js to update it, get
// this script, which clears its caches, unregisters itself and reloads the open tabs.
// The app registers no service worker, so production answers 404.
const KILL_SWITCH = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;

export function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 });
  }
  return new Response(KILL_SWITCH, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
