// Firebase Configuration for Ainora Mane Thota

const firebaseConfig = {
  apiKey: "AIzaSyAv-Mc6IuvjipqTxXRLbR-60VQhij8QjSM",
  authDomain: "ainora-mane-thota.firebaseapp.com",
  projectId: "ainora-mane-thota",
  storageBucket: "ainora-mane-thota.firebasestorage.app",
  messagingSenderId: "205286096690",
  appId: "1:205286096690:web:d8594d8a45bc9bebf6a12b"
};

// Configuration
const CONFIG = {
  whatsappNumber: '917892325072',
  adminPassword: 'magadi2025',
  currency: '₹',
  upiId: '7892325072@ybl',
  upiPayeeName: 'Ainora Mane Thota'
};

// Initialize Firebase
let db = null;
let storage = null;
let messaging = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  storage = firebase.storage();
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }
  console.log('Firebase initialized');
} catch (e) {
  console.error('Firebase init failed:', e);
}
