// Firebase Configuration for Magadi Farm Fresh
// Replace these with your actual Firebase project credentials

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

// Configuration
const CONFIG = {
  whatsappNumber: '917892325072', // Farm owner's WhatsApp number with country code
  adminPassword: 'magadi2025',    // Admin dashboard password
  currency: '₹'
};

// Initialize Firebase (will use local storage fallback if Firebase not configured)
let db = null;
let storage = null;
let useFirebase = false;

try {
  if (firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    useFirebase = true;
    console.log('Firebase initialized');
  } else {
    console.log('Firebase not configured — using local storage');
  }
} catch (e) {
  console.log('Firebase init failed — using local storage fallback');
}
