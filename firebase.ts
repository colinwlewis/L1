import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtGis2EmtSNsNeufJDH7ZCm7rzNmTY_v4",
  authDomain: "landscape-vision-ai-6c3ef.firebaseapp.com",
  projectId: "landscape-vision-ai-6c3ef",
  storageBucket: "landscape-vision-ai-6c3ef.firebasestorage.app",
  messagingSenderId: "1005151124664",
  appId: "1:1005151124664:web:936abaa07110a8775e084d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
