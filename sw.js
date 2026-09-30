const CACHE_PREFIX = "flashcardsquestionsandanswer-";
const CACHE_NAME = CACHE_PREFIX + "ssw-quiz-v1";
const SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./core.js", "./storage.js",
  "./questions.json", "./manifest.json", "./icon-v2.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const dataResponse = await fetch(new URL("./questions.json", self.registration.scope), { cache: "reload" });
    if (!dataResponse.ok) throw new Error("Question data unavailable during install");
    const questions = await dataResponse.clone().json();
    if (questions.length !== 379) throw new Error("Incomplete question data");
    const images = [...new Set(questions.map(q => q.image).filter(Boolean))].map(path => "./" + path);
    await cache.addAll([...SHELL, ...images]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if ((name.startsWith(CACHE_PREFIX) || name === "flipcard-cache-v4.0") && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(CACHE_NAME)).put("./index.html", response.clone());
        return response;
      } catch {
        return (await caches.match(new URL("./index.html", self.registration.scope))) ||
          new Response("Offline document unavailable", { status: 503 });
      }
    })());
  } else {
    event.respondWith((async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(CACHE_NAME)).put(request, response.clone());
        return response;
      } catch { return new Response("Offline resource unavailable", { status: 503 }); }
    })());
  }
});
