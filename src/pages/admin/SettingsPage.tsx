import React, { useState, useEffect } from 'react';
import { settingsApi, schedulerApi } from '../../services/api';
import { LibrarySettings } from '../../types';
import { Sliders, Save, Check, AlertCircle, Mail, Clock, RefreshCw, Play, ShieldAlert, BellRing } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [schedulerResult, setSchedulerResult] = useState<{
    timestamp: string;
    overdueCount: number;
    newlySuspendedCount: number;
    cancelledExpiredReservationsCount: number;
    emailsSentCount: number;
    emailsSummary: string[];
  } | null>(null);

  useEffect(() => {
    settingsApi
      .get()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setIsSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      const updated = await settingsApi.update(settings);
      setSettings(updated);
      setSuccessMsg('Paramètres de la bibliothèque mis à jour avec succès.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunScheduler = async () => {
    try {
      setIsRunningScheduler(true);
      setErrorMsg('');
      const res = await schedulerApi.triggerNow();
      setSchedulerResult(res.result);
      setSuccessMsg(`Tâche planifiée exécutée avec succès : ${res.result.emailsSentCount} e-mail(s) envoyé(s), ${res.result.newlySuspendedCount} suspension(s), ${res.result.cancelledExpiredReservationsCount} réservation(s) expirée(s) annulée(s).`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setIsRunningScheduler(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-xs text-slate-500">Chargement des paramètres...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Title & Quick Actions */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-sky-700" />
            Paramètres Généraux de la Bibliothèque
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Règles d'emprunt, délais automatiques, seuils de retard/suspension et configuration SMTP
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunScheduler}
          disabled={isRunningScheduler}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 rounded-lg transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          title="Exécute manuellement le contrôle quotidien automatique (retards, suspensions, annulations d'expiration, e-mails de rappel)"
        >
          {isRunningScheduler ? (
            <RefreshCw className="w-4 h-4 animate-spin text-sky-700" />
          ) : (
            <Play className="w-4 h-4 text-sky-700" />
          )}
          <span>{isRunningScheduler ? 'Exécution en cours...' : 'Exécuter la tâche planifiée'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {schedulerResult && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs space-y-2 border border-slate-800">
          <div className="font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sky-300">
              <Check className="w-4 h-4" /> Rapport d'exécution de la tâche planifiée
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {new Date(schedulerResult.timestamp).toLocaleTimeString('fr-FR')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
            <div className="bg-slate-800/80 p-2 rounded">
              <div className="text-slate-400">Emprunts en retard</div>
              <div className="text-base font-bold text-amber-400">{schedulerResult.overdueCount}</div>
            </div>
            <div className="bg-slate-800/80 p-2 rounded">
              <div className="text-slate-400">Comptes suspendus</div>
              <div className="text-base font-bold text-rose-400">{schedulerResult.newlySuspendedCount}</div>
            </div>
            <div className="bg-slate-800/80 p-2 rounded">
              <div className="text-slate-400">Réservations expirées libérées</div>
              <div className="text-base font-bold text-sky-300">{schedulerResult.cancelledExpiredReservationsCount}</div>
            </div>
            <div className="bg-slate-800/80 p-2 rounded">
              <div className="text-slate-400">E-mails envoyés</div>
              <div className="text-base font-bold text-emerald-400">{schedulerResult.emailsSentCount}</div>
            </div>
          </div>
          {schedulerResult.emailsSummary.length > 0 && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-slate-400">Détail des e-mails envoyés :</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {schedulerResult.emailsSummary.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1 : Règles d'emprunt et de réservation */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-700" />
            1. Règles d'Emprunt & Délais de Retrait
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Durée légale du prêt (jours)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.defaultLoanDurationDays ?? 14}
                onChange={e =>
                  setSettings({ ...settings, defaultLoanDurationDays: parseInt(e.target.value, 10) || 14 })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : 14 jours. Calculé automatiquement lors de la remise au comptoir.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre maximum d'emprunts par étudiant
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxLoansPerStudent ?? 3}
                onChange={e =>
                  setSettings({ ...settings, maxLoansPerStudent: parseInt(e.target.value, 10) || 3 })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : 3 ouvrages simultanés. Utilisé pour la règle (c) d'acceptation automatique.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Délai de retrait d'une réservation (heures)
              </label>
              <input
                type="number"
                min="12"
                max="168"
                value={settings.withdrawalDeadlineHours ?? 48}
                onChange={e =>
                  setSettings({ ...settings, withdrawalDeadlineHours: parseInt(e.target.value, 10) || 48 })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : 48 heures. Passé ce délai, annulation automatique et exemplaire libéré.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2 : Automatisation des rappels et suspensions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-600" />
            2. Automatisation des Rappels & Seuil de Suspension
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rappel avant échéance (jours avant)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.reminderDaysBeforeDue ?? 2}
                onChange={e =>
                  setSettings({ ...settings, reminderDaysBeforeDue: parseInt(e.target.value, 10) || 2 })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sky-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : 2 jours avant la date d'échéance.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fréquence des rappels en retard (jours)
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={settings.overdueReminderFrequencyDays ?? 3}
                onChange={e =>
                  setSettings({ ...settings, overdueReminderFrequencyDays: parseInt(e.target.value, 10) || 3 })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-amber-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : tous les 3 jours tant que l'ouvrage n'est pas restitué.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5 text-rose-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                Seuil de suspension du compte (jours)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.suspensionThresholdDays ?? 7}
                onChange={e =>
                  setSettings({ ...settings, suspensionThresholdDays: parseInt(e.target.value, 10) || 7 })
                }
                required
                className="w-full px-3 py-2 border border-rose-300 bg-rose-50/40 rounded-lg font-bold text-rose-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Défaut : 7 jours de retard. Compte suspendu automatiquement jusqu'à restitution.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 : Configuration SMTP */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-sky-700" />
            3. Paramètres du Serveur de Messagerie SMTP
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Adresse e-mail expéditeur (From)
              </label>
              <input
                type="email"
                value={settings.smtpFromAddress || 'biblio.est@usmba.ac.ma'}
                onChange={e => setSettings({ ...settings, smtpFromAddress: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom d'affichage</label>
              <input
                type="text"
                value={settings.smtpFromName || 'Bibliothèque EST Fès - USMBA'}
                onChange={e => setSettings({ ...settings, smtpFromName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hôte SMTP universitaire</label>
              <input
                type="text"
                value={settings.smtpHost || 'smtp.usmba.ac.ma'}
                onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Port SMTP</label>
              <input
                type="number"
                value={settings.smtpPort || 587}
                onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value, 10) || 587 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-between items-center pt-2">
          <p className="text-[11px] text-slate-400">
            Toutes les règles automatiques (décision, relances, suspensions) appliquent ces paramètres en temps réel.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
          </button>
        </div>
      </form>
    </div>
  );
};
