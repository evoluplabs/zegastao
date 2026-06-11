// Service Worker para Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// A config é injetada via self.__firebase_config ou usa fallback
const firebaseConfig = self.__firebase_config || {
  apiKey: self.VITE_FIREBASE_API_KEY,
  authDomain: self.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: self.VITE_FIREBASE_PROJECT_ID,
  storageBucket: self.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: self.VITE_FIREBASE_APP_ID,
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handler para mensagens em background (app fechado ou minimizado)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Copiloto Financeiro';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir app' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click na notificação → abre o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
