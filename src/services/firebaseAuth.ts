// src/services/firebaseAuth.ts
// Official Google Authentication service using Firebase Auth with GoogleAuthProvider popup

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App with official provisioned credentials
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleAccountInfo {
  googleSub: string;
  email: string;
  fullName: string;
  avatarUrl: string;
}

/**
 * Triggers official Google OAuth 2.0 popup via Firebase Auth
 */
export async function signInWithGooglePopup(): Promise<GoogleAccountInfo> {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const user: FirebaseUser = result.user;

    if (!user.email) {
      throw new Error("L'adresse e-mail n'a pas été fournie par le compte Google.");
    }

    return {
      googleSub: user.uid,
      email: user.email.toLowerCase(),
      fullName: user.displayName || user.email.split('@')[0],
      avatarUrl:
        user.photoURL ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          user.displayName || user.email
        )}`,
    };
  } catch (error: any) {
    console.error('Firebase signInWithPopup error:', error);

    // If popup closed by user or cancelled
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('La fenêtre de connexion Google a été fermée avant la fin de l’authentification.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('La fenêtre contextuelle de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Requête d’authentification interrompue.');
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Erreur réseau lors de la communication avec les serveurs d’authentification Google.');
    }
    throw error;
  }
}

/**
 * Firebase sign-out
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch (e) {
    console.error('Firebase signout error:', e);
  }
}
