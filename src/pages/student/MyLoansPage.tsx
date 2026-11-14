import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loansApi } from '../../services/api';
import { Loan } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  BookmarkCheck,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface MyLoansPageProps {
  onBackToCatalog: () => void;
}

export const MyLoansPage: React.FC<MyLoansPageProps> = ({ onBackToCatalog }) => {
  const { user, student } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyLoans();
  }, [student?.id]);

  const loadMyLoans = async () => {
    if (!student?.id) {
      setLoans([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await loansApi.getMyLoans();
      setLoans(data);
    } catch (e) {
      console.error('Erreur chargement de mes emprunts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLoans = loans.filter(l => l.status !== 'RETURNED');
  const returnedLoans = loans.filter(l => l.status === 'RETURNED');
  const overdueCount = loans.filter(l => l.status === 'OVERDUE' || l.overdueDays > 0).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la recherche
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-sky-600" />
            Mes Emprunts · Suivi Personnel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Étudiant : <span className="font-semibold text-slate-800">{user?.fullName}</span>
            {student?.studentIdNumber ? ` (CNE : ${student.studentIdNumber})` : ' (Session Google vérifiée)'}
            {' · '}Quota : {activeLoans.length} / {student?.maxLoans || 3} emprunts actifs
          </p>
        </div>

        {overdueCount > 0 && (
          <div className="bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-lg flex items-center gap-2 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Vous avez <strong>{overdueCount} emprunt(s) en retard</strong> à restituer immédiatement.
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Chargement de vos emprunts...</div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Emprunts Actifs & En Retard */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-700" />
                Emprunts en cours ({activeLoans.length})
              </h2>
              <span className="text-xs text-slate-500">Date système : 07/11/2026</span>
            </div>

            {activeLoans.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto stroke-1" />
                <p className="font-semibold text-slate-700">Aucun emprunt en cours</p>
                <p>Vous n'avez aucun livre à restituer pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map(loan => {
                  const isOverdue = loan.status === 'OVERDUE' || loan.overdueDays > 0;
                  return (
                    <div
                      key={loan.id}
                      className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                        isOverdue
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                            {loan.book?.categoryName || 'Discipline académique'}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            {loan.book?.title}
                          </h3>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Par {loan.book?.author} · Exemplaire scanné :{' '}
                            <span className="font-mono font-bold text-slate-800">
                              {loan.bookCopy?.barcode}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <StatusBadge type="loanStatus" value={loan.status} />
                          {isOverdue && (
                            <div className="mt-1">
                              <span className="inline-block px-2 py-0.5 text-xs font-bold text-rose-800 bg-rose-100 rounded">
                                +{loan.overdueDays} jour(s) de retard
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            Emprunté le : <strong>{loan.loanDate}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
                          <span className={isOverdue ? 'text-rose-800 font-bold' : 'text-slate-600'}>
                            Date limite : <strong>{loan.expectedReturnDate}</strong>
                          </span>
                        </div>
                        <div className="text-slate-500 sm:text-right">
                          Emplacement : {loan.bookCopy?.locationShelf || 'Guichet EST'}
                        </div>
                      </div>

                      {loan.notes && (
                        <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                          Note d'emprunt : {loan.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Historique des Emprunts Restitués */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Historique des emprunts retournés ({returnedLoans.length})
            </h2>

            {returnedLoans.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Aucun historique d'emprunt antérieur.</p>
            ) : (
              <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {returnedLoans.map(loan => (
                  <div key={loan.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{loan.book?.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {loan.book?.author} · Code-barres : <span className="font-mono">{loan.bookCopy?.barcode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 shrink-0">
                      <span>Restitué le : <strong>{loan.actualReturnDate}</strong></span>
                      <StatusBadge type="loanStatus" value="RETURNED" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
