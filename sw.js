// やること service worker
// 画面（HTML）はネットワーク優先（ブラウザの保存も使わず毎回取りに行く＝公開してすぐ新しい版になる）で3.5秒待ってだめならキャッシュ。アイコン等はキャッシュ優先。
// index.html を変えたら VERSION を必ず上げる（上げないと古い画面が出続ける）
const VERSION = "yarukoto-v9";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // ntfy・PCとの通信は触らない

  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([fetch(req, {cache: "no-store"}), timeout(3500)])
        .then(res => {
          if (!res.ok) throw new Error("bad status");
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
