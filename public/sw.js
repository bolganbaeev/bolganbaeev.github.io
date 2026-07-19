const CACHE_NAME = "ubt-runtime-cache-v6";

const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/1.png",
  "/2.png",
  "/3.png",
  "/4.png"
];

const DATA_ASSETS = [
  "/test/data/catalog.json",
  "/users/ranking.json"
];

const PRECACHE_ASSETS = [...new Set([...APP_SHELL_ASSETS, ...DATA_ASSETS])];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      PRECACHE_ASSETS.map((asset) =>
        cache.add(asset).then(() => asset)
      )
    );
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) {
      console.warn(`[SW] Precache partially failed: ${failed.length} asset(s).`);
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function shouldUseNetworkFirst(request) {
  const accept = request.headers.get("accept") || "";
  const url = new URL(request.url);
  return (
    request.mode === "navigate" ||
    accept.includes("text/html") ||
    accept.includes("text/css") ||
    accept.includes("javascript") ||
    accept.includes("application/json") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json")
  );
}

async function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return response;
  }
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (!isSameOrigin(requestUrl)) return;

  if (shouldUseNetworkFirst(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => putInCache(request, response))
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
