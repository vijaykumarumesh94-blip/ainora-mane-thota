// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAv-Mc6IuvjipqTxXRLbR-60VQhij8QjSM",
  authDomain: "ainora-mane-thota.firebaseapp.com",
  projectId: "ainora-mane-thota",
  storageBucket: "ainora-mane-thota.firebasestorage.app",
  messagingSenderId: "205286096690",
  appId: "1:205286096690:web:d8594d8a45bc9bebf6a12b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification?.title || 'New Order - Ainora Mane Thota';
  const notificationOptions = {
    body: payload.notification?.body || 'A new order has been placed!',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🌿</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🌿</text></svg>',
    tag: 'new-order',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
