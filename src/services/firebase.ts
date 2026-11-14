import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK safely (avoid app/duplicate-app error)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config
let firestoreInstance;
try {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  try {
    firestoreInstance = getFirestore(app);
  } catch (err) {
    console.warn('Firestore initialization warning:', err);
  }
}
export const db = firestoreInstance!;

// Initialize Auth
export const auth = getAuth(app);

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in using Firebase Google popup and enforce verified email
 */
export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  if (!fbUser.email) {
    await firebaseSignOut(auth).catch(() => {});
    throw new Error("L'adresse e-mail Google n'a pas pu être récupérée.");
  }
  if (!fbUser.emailVerified) {
    await firebaseSignOut(auth).catch(() => {});
    throw new Error("Votre adresse e-mail Google n'est pas vérifiée.");
  }
  return fbUser;
}

/**
 * Subscribe to Firebase Auth state changes to preserve Google session
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign out from Firebase
 */
export async function signOutFirebase() {
  await firebaseSignOut(auth);
}

// Connectivity test
async function testConnection() {
  try {
    if (db) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or pending connection.');
    }
  }
}
testConnection();

export type { FirebaseUser };
