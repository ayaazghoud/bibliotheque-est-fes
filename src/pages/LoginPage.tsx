import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  space?: 'etudiant' | 'gerant';
  onSelectSpace?: (space: 'etudiant' | 'gerant') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  space = 'etudiant',
  onSelectSpace,
}) => {
  const { signInWithGoogle, loginWithEmail, demoUsers } = useAuth();
  const [activeSpace, setActiveSpace] = useState<'etudiant' | 'gerant'>(space);
  const [customEmail, setCustomEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [redirectSuggestion, setRedirectSuggestion] = useState<{ space: 'etudiant' | 'gerant'; label: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setActiveSpace(space);
  }, [space]);

  const isStudentSpace = activeSpace === 'etudiant';
  const pageTitle = isStudentSpace
    ? 'Connexion · Espace Étudiant'
    : 'Connexion · Gestion Bibliothèque';

  const handleSpaceChange = (targetSpace: 'etudiant' | 'gerant') => {
    setActiveSpace(targetSpace);
    setErrorMsg('');
    setRedirectSuggestion(null);
    setCustomEmail('');
    if (onSelectSpace) {
      onSelectSpace(targetSpace);
    }
  };

  const filteredDemoUsers = demoUsers.filter(u => {
    const roleUpper = (u.role || '').toUpperCase();
    return isStudentSpace
      ? roleUpper === 'ROLE_ETUDIANT' || roleUpper === 'ETUDIANT'
      : roleUpper === 'ROLE_GERANT' || roleUpper === 'GERANT';
  });

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    setErrorMsg('');
    setRedirectSuggestion(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(customEmail.trim(), activeSpace);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoUserClick = async (email: string) => {
    setErrorMsg('');
    setRedirectSuggestion(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, activeSpace);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setErrorMsg('');
    setRedirectSuggestion(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle(activeSpace);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('La fenêtre de connexion Google a été fermée avant la sélection du compte.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // ignore rapid double-clicks
      } else {
        handleAuthError(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthError = (err: any) => {
    const errorData = err.response?.data;
    const msg = errorData?.error || err.message || 'Erreur lors de la connexion.';
    setErrorMsg(msg);

    if (errorData?.code === 'ROLE_MISMATCH_GERANT' || msg.includes('compte gérant')) {
      setRedirectSuggestion({
        space: 'gerant',
        label: "Basculer vers la Gestion Bibliothèque",
      });
    } else if (errorData?.code === 'ROLE_MISMATCH_ETUDIANT' || msg.includes('compte étudiant')) {
      setRedirectSuggestion({
        space: 'etudiant',
        label: "Basculer vers l'Espace Étudiant",
      });
    } else {
      setRedirectSuggestion(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-between overflow-y-auto">
      {/* Top Brand Banner */}
      <div className="bg-[#002B49] border-b border-[#0A3A60] px-4 sm:px-6 py-3.5 text-white flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white">
                Bibliothèque EST Fès
              </span>
              <span className="text-[10px] font-bold text-sky-300 border border-sky-400/40 rounded px-1.5 py-0.5">
                USMBA
              </span>
            </div>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              Université Sidi Mohamed Ben Abdellah · École Supérieure de Technologie
            </span>
          </div>
        </div>
        <div>
          <span
            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider ${
              isStudentSpace
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
            }`}
          >
            {isStudentSpace ? 'ESPACE ÉTUDIANT' : 'GESTION BIBLIOTHÈQUE'}
          </span>
        </div>
      </div>

      {/* Main Login Container */}
      <div className="max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6">

          {/* TWO SPACES TOGGLE SELECTOR */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleSpaceChange('etudiant')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isStudentSpace
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Espace Étudiant</span>
            </button>
            <button
              type="button"
              onClick={() => handleSpaceChange('gerant')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isStudentSpace
                  ? 'bg-[#002B49] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Espace Gérant</span>
            </button>
          </div>

          {/* Logo & Space Header */}
          <div className="text-center space-y-2">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs transition-colors ${
                isStudentSpace
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#002B49] text-sky-400'
              }`}
            >
              {isStudentSpace ? (
                <GraduationCap className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-sky-300" />
              )}
            </div>
            <div className="pt-1">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isStudentSpace ? 'text-emerald-700' : 'text-sky-700'
                }`}
              >
                {isStudentSpace ? 'Portail Étudiants EST' : 'Gestion Bibliothèque'}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                {pageTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {isStudentSpace
                  ? 'Connectez-vous pour consulter le catalogue et réserver vos ouvrages'
                  : 'Connectez-vous pour gérer les collections, les emprunts et les retours'}
              </p>
            </div>
          </div>

          {/* Error Message & Redirect Suggestion */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
              {redirectSuggestion && (
                <div className="pt-2 border-t border-rose-200/70">
                  <button
                    type="button"
                    onClick={() => handleSpaceChange(redirectSuggestion.space)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg transition-colors text-xs shadow-xs cursor-pointer"
                  >
                    <span>{redirectSuggestion.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Google Login Section */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isSubmitting}
              className="w-full py-3 px-4 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xs hover:shadow-sm disabled:opacity-50 group cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.8-.4-1.6-.4-2.4z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                />
              </svg>
              <span className="text-slate-900 group-hover:text-black">
                {isSubmitting ? 'Authentification Google en cours...' : 'Se connecter avec Google'}
              </span>
            </button>

            {/* Manual email fallback */}
            <form onSubmit={handleCustomLogin} className="space-y-3 pt-2">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">
                  Ou saisie directe de l'adresse
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse e-mail académique ou gestionnaire
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  placeholder={
                    isStudentSpace ? 'nom.prenom@usmba.ac.ma' : 'gerant.est@usmba.ac.ma'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !customEmail.trim()}
                className={`w-full py-2.5 px-4 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 ${
                  isStudentSpace
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-[#002B49] hover:bg-[#0A3A60]'
                }`}
              >
                Continuer avec cette adresse
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">
                Ou sélection rapide pour évaluation académique
              </div>
            </div>

            {/* Demo Profiles Buttons */}
            <div className="space-y-2">
              {filteredDemoUsers.length === 0 ? (
                <div className="text-center py-3 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Aucun compte de test disponible pour cet espace.
                </div>
              ) : (
                filteredDemoUsers.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleDemoUserClick(u.email)}
                    disabled={isSubmitting}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-all flex items-center justify-between text-xs group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isStudentSpace
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isStudentSpace ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 group-hover:text-sky-900 truncate">
                          {u.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        isStudentSpace
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {isStudentSpace ? 'ÉTUDIANT' : 'GESTION BIBLIOTHÈQUE'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Access policy notice */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-700">Contrôle d'accès :</span>
              <span>
                {isStudentSpace
                  ? 'Ouvert à tous les comptes Google institutionnels @usmba.ac.ma (création automatique du profil étudiant si absent de la base).'
                  : 'Réservé exclusivement au personnel habilité déjà enregistré dans la base de données.'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isStudentSpace
                ? "Les comptes @usmba.ac.ma accèdent directement à l'Espace Étudiant."
                : "Le rôle Gérant est strictement vérifié et n'est jamais attribué automatiquement."}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 École Supérieure de Technologie de Fès · Université Sidi Mohamed Ben Abdellah · Tous droits réservés
      </footer>
    </div>
  );
};
