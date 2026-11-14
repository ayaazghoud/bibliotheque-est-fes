import React, { useState, useEffect } from 'react';
import { remindersApi, loansApi } from '../../services/api';
import { Reminder, Loan } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  MailWarning,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  History,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface RemindersPageProps {
  preselectedLoanId?: number;
  onClearPreselection?: () => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  preselectedLoanId,
  onClearPreselection,
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Send reminder modal
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');
  const [sendError, setSendError] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allReminders, allOverdues] = await Promise.all([
        remindersApi.getAll(),
        loansApi.getAll({ onlyOverdue: true }),
      ]);
      setReminders(allReminders);
      setOverdueLoans(allOverdues);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (preselectedLoanId && overdueLoans.length > 0) {
      const target = overdueLoans.find(l => l.id === preselectedLoanId);
      if (target) {
        setSelectedLoan(target);
      }
    }
  }, [preselectedLoanId, overdueLoans]);

  const handleOpenSend = (loan: Loan) => {
    setSelectedLoan(loan);
    setSendSuccess('');
    setSendError('');
  };

  const handleSendConfirm = async () => {
    if (!selectedLoan) return;

    try {
      setIsSending(true);
      setSendError('');
      const res = await remindersApi.send(selectedLoan.id);
      setSendSuccess(res.message);
      setTimeout(() => {
        setSelectedLoan(null);
        if (onClearPreselection) onClearPreselection();
        loadData();
      }, 1500);
    } catch (err: any) {
      setSendError(err.response?.data?.error || err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MailWarning className="w-6 h-6 text-sky-700" />
          Système de Rappels par E-mail (SMTP)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Génération automatisée et envoi de notifications de retard aux étudiants avec protection anti-spam
        </p>
      </div>

      {/* SMTP Server status banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Service SMTP Universitaire connecté :</strong> Expéditeur officiel{' '}
            <code className="font-mono text-emerald-800">bibliotheque.est@usmba.ac.ma</code> (Serveur{' '}
            <code className="font-mono text-emerald-800">smtp.usmba.ac.ma:587</code>).
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
          Actif
        </span>
      </div>

      {/* Section 1: Emprunts en retard éligibles à un rappel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600" />
            Emprunts en retard nécessitant une relance ({overdueLoans.length})
          </h2>
        </div>

        {overdueLoans.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto stroke-1 mb-2" />
            <p className="font-bold text-slate-700">Aucun emprunt en retard pour le moment</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100">
            {overdueLoans.map(loan => (
              <div
                key={loan.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {loan.student?.user?.fullName} ·{' '}
                    <span className="text-slate-500 font-normal">{loan.student?.user?.email}</span>
                  </div>
                  <div className="text-slate-600 mt-0.5">
                    Ouvrage : <strong>{loan.book?.title}</strong> · Code-barres :{' '}
                    <span className="font-mono">{loan.bookCopy?.barcode}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>Date limite : {loan.expectedReturnDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-700 font-bold">+{loan.overdueDays} jours de retard</span>
                    <span aria-hidden="true">·</span>
                    <span>{loan.reminderCount || 0} relance(s) envoyée(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge type="overdueLevel" value={loan.overdueLevel} />
                  <button
                    type="button"
                    onClick={() => handleOpenSend(loan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Préparer rappel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Historique des e-mails envoyés */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-sky-700" />
          Journal d'envoi des rappels par e-mail ({reminders.length})
        </h2>

        {reminders.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
            Aucun e-mail de relance envoyé dans l'historique récent.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Destinataire (Étudiant)</th>
                    <th className="py-3 px-4">Niveau de Retard</th>
                    <th className="py-3 px-4">Contenu du message</th>
                    <th className="py-3 px-4 text-center">Date & Heure</th>
                    <th className="py-3 px-4 text-center">Statut SMTP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reminders.map(rem => (
                    <tr key={rem.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {rem.recipientEmail}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge type="overdueLevel" value={rem.overdueLevel} />
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="line-clamp-2 text-slate-600 text-[11px] font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                          {rem.messageContent}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 tabular-nums text-[11px]">
                        {new Date(rem.sentAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Délivré (SMTP)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL : CONFIRMATION & APERÇU DU RAPPEL E-MAIL */}
      <Modal
        isOpen={!!selectedLoan}
        onClose={() => {
          setSelectedLoan(null);
          if (onClearPreselection) onClearPreselection();
        }}
        title="Confirmation d'envoi du Rappel par E-mail"
        subtitle={`Destinataire : ${selectedLoan?.student?.user?.email || ''}`}
        maxWidth="lg"
      >
        {selectedLoan && (
          <div className="space-y-4 text-xs">
            {sendError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{sendError}</span>
              </div>
            )}

            {sendSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{sendSuccess}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div>
                Étudiant : <strong>{selectedLoan.student?.user?.fullName}</strong> (CNE:{' '}
                {selectedLoan.student?.studentIdNumber})
              </div>
              <div>
                Ouvrage : <strong>{selectedLoan.book?.title}</strong> (Code:{' '}
                {selectedLoan.bookCopy?.barcode})
              </div>
              <div>
                Échéance dépassée : <strong>{selectedLoan.expectedReturnDate}</strong> (
                <span className="text-rose-700 font-bold">+{selectedLoan.overdueDays} jours</span>)
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Aperçu du message SMTP généré :</span>
              <div className="p-3 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-700 space-y-2 whitespace-pre-line leading-relaxed">
                {`Bonjour ${selectedLoan.student?.user?.fullName},

Votre emprunt de l'ouvrage « ${selectedLoan.book?.title} » (Exemplaire: ${selectedLoan.bookCopy?.barcode}) est arrivé à échéance le ${selectedLoan.expectedReturnDate}.
Nombre de jours de retard : ${selectedLoan.overdueDays} jour(s) [Niveau: ${
                  selectedLoan.overdueLevel === 'HIGH'
                    ? 'Élevé'
                    : selectedLoan.overdueLevel === 'MEDIUM'
                    ? 'Moyen'
                    : 'Faible'
                }].

${
  selectedLoan.overdueLevel === 'HIGH'
    ? 'ATTENTION : Votre retard important entraîne la suspension immédiate de vos droits d’emprunt jusqu’à restitution.'
    : selectedLoan.overdueLevel === 'MEDIUM'
    ? 'Prière de régulariser votre situation sous 48 heures ouvrables.'
    : 'Nous vous rappelons amicalement de bien vouloir rapporter l’ouvrage au guichet.'
}

Bibliothèque de l'École Supérieure de Technologie (EST) - USMBA Fès
Contact : bibliotheque.est@usmba.ac.ma`}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Protection anti-doublon activée (1 rappel max / jour).
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoan(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendConfirm}
                  className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Envoi en cours...' : "Confirmer l'envoi SMTP"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
