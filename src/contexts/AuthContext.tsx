import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Student, RoleName } from '../types';
import { authApi } from '../services/api';
import {
  signInWithGooglePopup,
  signOutFirebase,
  subscribeToAuthChanges,
  FirebaseUser,
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  student: Student | null;
  role: RoleName | null;
  isAuthenticated: boolean;
  isManager: boolean;
  isStudent: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, targetSpace: 'etudiant' | 'gerant') => Promise<void>;
  signInWithGoogle: (targetSpace: 'etudiant' | 'gerant') => Promise<void>;
  logout: () => Promise<void>;
  demoUsers: Array<User & { student?: Student }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isUsmbaEmail = (email: string): boolean => {
  return /^[^\s@]+@usmba\.ac\.ma$/i.test(email.trim());
};

const formatDisplayNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'etudiant';
  return (
    localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Étudiant USMBA'
  );
};

const buildEphemeralGoogleStudent = (fbUser: FirebaseUser): User => {
  const emailLower = (fbUser.email || '').toLowerCase().trim();
  return {
    id: 0,
    googleSub: fbUser.uid,
    email: emailLower,
    fullName: fbUser.displayName || formatDisplayNameFromEmail(emailLower),
    avatarUrl: fbUser.photoURL || undefined,
    role: 'ROLE_ETUDIANT',
    isActive: true,
    createdAt: new Date().toISOString(),
    isGoogleAuth: true,
    isEphemeralSession: true,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<Array<User & { student?: Student }>>([]);

  // Prevents onAuthStateChanged from racing with interactive signInWithPopup
  const isPopupAuthInFlightRef = useRef(false);

  const loadDemoUsers = async () => {
    try {
      const list = await authApi.getDemoUsers();
      setDemoUsers(list);
    } catch (e) {
      console.error('Failed to load demo users:', e);
    }
  };

  const applyAuthenticatedSession = (nextUser: User, nextStudent: Student | null | undefined) => {
    setUser(nextUser);
    setStudent(nextStudent || null);

    // Do NOT write fake persistent records when running in DB-unavailable ephemeral mode
    if (nextUser.isEphemeralSession || nextUser.id <= 0) {
      localStorage.removeItem('est_library_user');
      localStorage.removeItem('est_library_student');
      return;
    }

    localStorage.setItem('est_library_user', JSON.stringify(nextUser));
    if (nextStudent) {
      localStorage.setItem('est_library_student', JSON.stringify(nextStudent));
    } else {
      localStorage.removeItem('est_library_student');
    }
  };

  const clearSessionState = () => {
    setUser(null);
    setStudent(null);
    localStorage.removeItem('est_library_user');
    localStorage.removeItem('est_library_student');
  };

  useEffect(() => {
    loadDemoUsers();

    // Hydrate non-Google (or previously persisted DB) session synchronously first
    let cachedUser: User | null = null;
    let cachedStudent: Student | null = null;
    try {
      const stored = localStorage.getItem('est_library_user');
      const storedStudent = localStorage.getItem('est_library_student');
      if (stored) {
        cachedUser = JSON.parse(stored);
      }
      if (storedStudent) {
        cachedStudent = JSON.parse(storedStudent);
      }
    } catch {
      localStorage.removeItem('est_library_user');
      localStorage.removeItem('est_library_student');
    }

    const unsubscribe = subscribeToAuthChanges(async fbUser => {
      if (isPopupAuthInFlightRef.current) {
        return;
      }

      if (fbUser && fbUser.email) {
        const fbEmail = fbUser.email.toLowerCase().trim();

        // Check verified email
        if (fbUser.emailVerified === false) {
          await signOutFirebase().catch(() => {});
          clearSessionState();
          setIsLoading(false);
          return;
        }

        // Fast hydration if matching persisted DB session exists
        if (cachedUser && cachedUser.id > 0 && cachedUser.email.toLowerCase() === fbEmail) {
          setUser({ ...cachedUser, isGoogleAuth: true });
          setStudent(cachedStudent);
          setIsLoading(false);
        }

        // Sync role/profile with backend (respecting existing GERANT or auto-provisioning @usmba.ac.ma ETUDIANT)
        try {
          const res = await authApi.loginWithGoogle({
            email: fbEmail,
            fullName: fbUser.displayName || formatDisplayNameFromEmail(fbEmail),
            googleSub: fbUser.uid,
            avatarUrl: fbUser.photoURL || undefined,
            targetSpace: 'auto',
            isGoogleAuth: true,
            emailVerified: fbUser.emailVerified,
          });
          applyAuthenticatedSession(res.user, res.student);
        } catch (err: any) {
          const status = err?.response?.status;
          if (status && status >= 400 && status < 500) {
            // Explicit backend rejection (unauthorized domain, deactivated account, etc.)
            await signOutFirebase().catch(() => {});
            clearSessionState();
          } else if (isUsmbaEmail(fbEmail)) {
            // Backend / DB unavailable: allow ephemeral Student Space access without inventing persistent data
            if (cachedUser && cachedUser.id > 0 && cachedUser.email.toLowerCase() === fbEmail) {
              // Keep cached user without knocking them out to login
            } else {
              applyAuthenticatedSession(buildEphemeralGoogleStudent(fbUser), null);
            }
          } else if (!cachedUser || cachedUser.email.toLowerCase() !== fbEmail) {
            clearSessionState();
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // No active Firebase Google user: preserve manual/demo email session if present
      if (cachedUser && !cachedUser.isGoogleAuth && cachedUser.id > 0) {
        setUser(cachedUser);
        setStudent(cachedStudent);
      } else {
        clearSessionState();
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Official Google Sign-In with Firebase Authentication
   * - Enforces verified Google email
   * - Accepts all @usmba.ac.ma accounts (auto-provisions ETUDIANT when DB available)
   * - Falls back to ephemeral Student Space if DB unavailable (without inventing persistent data)
   * - Preserves GERANT role strictly & never auto-grants GERANT
   */
  const signInWithGoogle = async (targetSpace: 'etudiant' | 'gerant') => {
    isPopupAuthInFlightRef.current = true;
    try {
      const fbUser = await signInWithGooglePopup();
      const fbEmail = (fbUser.email || '').toLowerCase().trim();

      try {
        const res = await authApi.loginWithGoogle({
          email: fbEmail,
          fullName: fbUser.displayName || formatDisplayNameFromEmail(fbEmail),
          googleSub: fbUser.uid,
          avatarUrl: fbUser.photoURL || undefined,
          targetSpace,
          isGoogleAuth: true,
          emailVerified: fbUser.emailVerified,
        });

        applyAuthenticatedSession(res.user, res.student);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) {
          // Clear Firebase session on explicit role mismatch or domain rejection so next attempt is clean
          await signOutFirebase().catch(() => {});
          throw err;
        }

        // Backend / MySQL unavailable
        if (targetSpace === 'gerant') {
          await signOutFirebase().catch(() => {});
          throw new Error(
            "Base de données indisponible : impossible de vérifier les droits d'accès Gérant."
          );
        }

        if (isUsmbaEmail(fbEmail) && fbUser.emailVerified) {
          applyAuthenticatedSession(buildEphemeralGoogleStudent(fbUser), null);
          return;
        }

        await signOutFirebase().catch(() => {});
        throw new Error(
          "Base de données indisponible. Seuls les comptes Google @usmba.ac.ma vérifiés peuvent accéder à l'espace étudiant."
        );
      }
    } finally {
      isPopupAuthInFlightRef.current = false;
    }
  };

  /**
   * Direct email login or demo user login with role validation
   */
  const loginWithEmail = async (email: string, targetSpace: 'etudiant' | 'gerant') => {
    const res = await authApi.loginWithGoogle({
      email: email.trim(),
      targetSpace,
      isGoogleAuth: false,
    });
    applyAuthenticatedSession(res.user, res.student);
  };

  const logout = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      // ignore
    }
    clearSessionState();
  };

  const isManager =
    !!user &&
    ((user.role || '').toUpperCase() === 'ROLE_GERANT' ||
      (user.role || '').toUpperCase() === 'GERANT');
  const isStudent =
    !!user &&
    ((user.role || '').toUpperCase() === 'ROLE_ETUDIANT' ||
      (user.role || '').toUpperCase() === 'ETUDIANT');

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        role: user?.role || null,
        isAuthenticated: !!user,
        isManager,
        isStudent,
        isLoading,
        loginWithEmail,
        signInWithGoogle,
        logout,
        demoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
