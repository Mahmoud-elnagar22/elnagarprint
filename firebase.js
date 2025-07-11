import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHvapfw78UYaNb7mbtU-A5hOKAEybVHkc",
  authDomain: "storseek-181c5.firebaseapp.com",
  projectId: "storseek-181c5",
  storageBucket: "storseek-181c5.firebasestorage.app",
  messagingSenderId: "839381927211",
  appId: "1:839381927211:web:45447249b40ea85c60316e",
  measurementId: "G-Z4996GGP9H"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };