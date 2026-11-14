import { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight browser History-API router for EST Fès Library
 * Handles /, /etudiant/connexion, /gerant/connexion, /etudiant/*, and /gerant/*
 * Includes safe sandbox/iframe exception resilience.
 */
export function useRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.pathname || '/';
      }
    } catch (e) {
      // In sandboxed environments window.location may have restricted access
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      try {
        setCurrentPath(window.location.pathname || '/');
      } catch (e) {
        // fallback
      }
    };

    try {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    } catch (e) {
      // ignore
    }
  }, []);

  const navigate = useCallback((to: string) => {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.pathname !== to) {
        try {
          window.history.pushState({}, '', to);
        } catch (pushErr) {
          // If in restricted iframe or sandbox where pushState is prohibited, continue with state routing
          console.warn('history.pushState non supporté dans cet environnement, utilisation du routage mémoire:', pushErr);
        }
      }
    } catch (e) {
      // ignore
    }
    setCurrentPath(to);
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      // ignore
    }
  }, []);

  return { currentPath, navigate };
}
