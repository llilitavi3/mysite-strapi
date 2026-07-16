self.addEventListener('install', (e) => {
self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // משאיר את הבקשות לעבוד כרגיל דרך הרשת
e.respondWith(fetch(e.request));
});
