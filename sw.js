// ---------- push-уведомления (работают и при закрытом приложении) ----------
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzDlxId4GgFLueEGojTY46Ak5YSaEW-A8",
  authDomain: "gimnazia13-apk.firebaseapp.com",
  projectId: "gimnazia13-apk",
  storageBucket: "gimnazia13-apk.firebasestorage.app",
  messagingSenderId: "854551773223",
  appId: "1:854551773223:web:6038e84747fda133628e02"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Новое сообщение";
  const body = (payload.notification && payload.notification.body) || "";
  self.registration.showNotification(title, {
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png"
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});

// ---------- кэширование файлов приложения, чтобы открывалось мгновенно ----------
const CACHE = "gimnazia13-chat-v2";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./chat.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Кэшируем только собственные файлы приложения (GET, тот же источник).
// Запросы к Firebase/Cloudinary не трогаем — пусть всегда идут в сеть.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
