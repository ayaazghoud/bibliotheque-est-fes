import React, { useState, useEffect } from 'react';
import { loansApi } from '../../services/api';
import { Loan, OverdueLevel } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  AlertOctagon,
  Mail,
  Calendar,
  AlertTriangle,
  Clock,
  Check,
  Search,
} from 'lucide-react';

interface OverdueManagementPageProps {
  onSendReminder: (loanId: number) => void;
}

export const OverdueManagementPage: React.FC<OverdueManagementPageProps> = ({ onSendReminder }) => {
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadOverdues = async () => {
    try {
      setIsLoading(true);
      const data = await loansApi.getAll({ onlyOverdue: true });
      setOverdueLoans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverdues();
  }, []);

  const filtered = overdueLoans.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (l.student?.user?.fullName && l.student.user.fullName.toLowerCase().includes(q)) ||
      (l.student?.user?.email && l.student.user.email.toLowerCase().includes(q)) ||
      (l.book?.title && l.book.title.toLowerCase().includes(q)) ||
      (l.bookCopy?.barcode && l.bookCopy.barcode.toLowerCase().includes(q));

    const matchesLevel = levelFilter === 'ALL' || l.overdueLevel === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const lowCount = overdueLoans.filter(l => l.overdueLevel === 'LOW').length;
  const mediumCount = overdueLoans.filter(l => l.overdueLevel === 'MEDIUM').length;
  const highCount = overdueLoans.filter(l => l.overdueLevel === 'HIGH').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertOctagon className="w-6 h-6 text-rose-600" />
          Suivi Automatique des Retards d'Emprunt
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Calcul automatique des jours de dépassement d'échéance et classification en 3 niveaux d'alerte
        </p>
      </div>

      {/* 3 Alert Levels Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === 'LOW' ? 'ALL' : 'LOW')}
          className={`text-left p-4 rounded-xl border transition-all ${
            levelFilter === 'LOW'
              ? 'bg-amber-100/50 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Niveau 1 : Retard Faible</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{lowCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">1 à 3 jours de retard · Rappel amical</div>
        </button>

        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`text-left p-4 rounded-xl border transition-all ${
            levelFilter === 'MEDIUM'
              ? 'bg-amber-100/50 border-amber-500 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-400 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Niveau 2 : Retard Moyen</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{mediumCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">4 à 7 jours de retard · Avis de retard officiel</div>
        </button>

        <button
          type="button"
          onClick={() => setLevelFilter(levelFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`text-left p-4 rounded-xl border transition-all ${
            levelFilter === 'HIGH'
              ? 'bg-rose-100/60 border-rose-400 ring-2 ring-rose-300'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Niveau 3 : Retard Élevé</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{highCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">&gt; 7 jours · Mise en demeure & suspension</div>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtrer par étudiant, e-mail, titre du livre..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 text-slate-900"
          />
        </div>
      </div>

      {/* Table of Overdues */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Calcul des retards...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <Check className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-semibold text-slate-800">Aucun emprunt en retard trouvé</p>
            <p>Tous les emprunts sont à jour par rapport aux dates limites.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Étudiant</th>
                  <th className="py-3 px-4">Livre & Exemplaire</th>
                  <th className="py-3 px-4">Date Limite Prévue</th>
                  <th className="py-3 px-4 text-center">Jours de Retard</th>
                  <th className="py-3 px-4">Niveau de Retard</th>
                  <th className="py-3 px-4 text-center">Relances Envoyées</th>
                  <th className="py-3 px-4 text-right">Action Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{loan.student?.user?.fullName}</div>
                      <div className="text-[11px] text-slate-500">{loan.student?.user?.email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{loan.book?.title}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        Code: {loan.bookCopy?.barcode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 tabular-nums">
                      {loan.expectedReturnDate}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        +{loan.overdueDays} jours
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge type="overdueLevel" value={loan.overdueLevel} />
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums">
                      <span className="font-semibold text-slate-700">
                        {loan.reminderCount || 0} rappel(s)
                      </span>
                      {loan.lastReminderSentAt && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Dernier : {new Date(loan.lastReminderSentAt).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSendReminder(loan.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Envoyer rappel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
