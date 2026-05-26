import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Add this to your existing imports at the top
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAM4hAiUg6Op25wvHGVtFLv2u5_d0N1nec",
  authDomain: "syncgridapp.firebaseapp.com",
  projectId: "syncgridapp",
  storageBucket: "syncgridapp.firebasestorage.app",
  messagingSenderId: "121807512209",
  appId: "1:121807512209:web:5c0cf7256b03ff38389530"
};

// Initialize the Firebase Engine
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage so users stay logged in!
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Export DB (for saving routines)
export const db = getFirestore(app);

// Add this at the very bottom where you export auth and db
export const storage = getStorage(app);