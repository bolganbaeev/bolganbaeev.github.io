const CACHE_NAME = "ubt-runtime-cache-v5";

const APP_SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./test/style.css",
  "./test/app.js",
  "./chart.js",
  "./libs/mammoth.browser.min.js",
  "./libs/jszip.min.js",
  "./libs/docx-preview.min.js",
  "./1.png",
  "./2.png",
  "./3.png",
  "./4.png",
  "./avatar.jpg",
  "./avatars/roma.jpg",
  "./avatars/sayan.jpg",
  "./mendeleev.jpg",
  "./erigish.png"
];

const DATA_ASSETS = [
  "./materials-data/catalog.json",
  "./materials-data/topics/his-medieval-cities.json",
  "./materials-data/topics/inf-1-1.json",
  "./materials-data/topics/inf-1-2.json",
  "./materials-data/topics/inf-1-3.json",
  "./materials-data/topics/inf-1-4.json",
  "./materials-data/topics/inf-10-1-1.json",
  "./materials-data/topics/inf-2-1.json",
  "./materials-data/topics/inf-2-2.json",
  "./materials-data/topics/inf-2-5.json",
  "./materials-data/topics/inf-4-1.json",
  "./materials-data/topics/inf-4-3.json",
  "./materials-data/topics/math-algebra-base.json",
  "./blocks-data/anki/history/1916-1920.json",
  "./blocks-data/anki/history/1920-1930.json",
  "./blocks-data/anki/history/1930.json",
  "./blocks-data/anki/history/1941-1945.json",
  "./blocks-data/anki/history/1945-85.json",
  "./blocks-data/anki/history/1991-2025.json",
  "./test/data/1.1.json",
  "./test/data/1.2.json",
  "./test/data/1.3.json",
  "./test/data/1.4.json",
  "./test/data/10.1.1.json",
  "./test/data/1991.json",
  "./test/data/2.1.json",
  "./test/data/2.2.json",
  "./test/data/2.5.json",
  "./test/data/3.1.json",
  "./test/data/4.1.json",
  "./test/data/4.3.json",
  "./test/data/SD.json",
  "./test/data/XiX60-70.json",
  "./test/data/altynorda.json",
  "./test/data/css.json",
  "./test/data/ezhelgi.json",
  "./test/data/eset.json",
  "./test/data/juz40info.json",
  "./test/data/juz40tarih.json",
  "./test/data/khanat-v2.json",
  "./test/data/khanatedel.json",
  "./test/data/koterilis.json",
  "./test/data/kz-history-10-test-1.json",
  "./test/data/1920-30.json",
  "./test/data/1907.json",
  "./test/data/mongolshapkyn.json",
  "./test/data/nogai.json",
  "./test/data/python.json",
  "./test/data/qarakhan.json",
  "./test/data/67-68.json",
  "./test/data/syrymdatuly.json",
  "./test/data/tokyrau.json",
  "./test/data/turik.json",
  "./test/data/turikmadinet.json",
  "./test/data/ulyOtan.json",
  "./test/data/xvmadinet.json",
  "./test/data/zhongar.json",
  "./users/ranking.json",
  "./users/41c991eb6a66242c0454191244278183ce58cf4a6bcd372f799e4b9cc01886af.json",
  "./users/9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0.json",
  "./users/a33805cfe8452895be97edd6552029f20be635f67944c9c8978004f84b502649.json"
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
      // Keep SW install successful even if a few optional files are unavailable.
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
          caches.match(request).then((cached) => cached || caches.match("./index.html"))
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
