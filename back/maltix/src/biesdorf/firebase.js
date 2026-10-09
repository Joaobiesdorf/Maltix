import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCh8Se6mDnNlsNM2hlQlLgqV5CCDOrVxgg",
  authDomain: "cervejaria-biesdorf.firebaseapp.com",
  projectId: "cervejaria-biesdorf",
  storageBucket: "cervejaria-biesdorf.firebasestorage.app",
  messagingSenderId: "731650862675",
  appId: "1:731650862675:web:eb82b9e8da5d56138260a6"
};
const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

export { app, db, auth, isFirebaseConfigured };
