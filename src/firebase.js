// src/firebase.js


// 1. Import the necessary functions
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ add this

// 2. Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD_4-eM7_5EPEYgavePauEuCXm6yqbC-6I",
  authDomain: "wetopinie-62f9a.firebaseapp.com",
  projectId: "wetopinie-62f9a",
  storageBucket: "wetopinie-62f9a.appspot.com",
  messagingSenderId: "200470398664",
  appId: "1:200470398664:web:4ce529a502647b9a0b07fd",
  measurementId: "G-KCFRNE4LVL"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 4. Export auth and db
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); // ✅ add this line



