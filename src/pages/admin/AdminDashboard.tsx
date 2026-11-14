import React, { useState, useEffect } from 'react';
import { statsApi, loansApi } from '../../services/api';
import { DashboardStats, Loan } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  BookOpen,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { AdminView } from '../../components/admin/AdminSidebar';

interface AdminDashboardProps {
  onNavigate: (view: AdminView) => void;
  onSendReminder?: (loanId: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onSendReminder,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await statsApi.getDashboard();
      setStats(data);
    } catch (e) {
      console.error('Erreur chargement des statistiques:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Calcul des indicateurs de la bibliothèque...
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total des Ouvrages',
      value: stats.totalBooks,
      sub: 'Notices bibliographiques',
      icon: BookOpen,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      label: 'Total des Exemplaires',
      value: stats.totalCopies,
      sub: 'Unités physiques réelles',
      icon: Copy,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Exemplaires Disponibles',
      value: stats.availableCopies,
      sub: 'Prêts à être empruntés',
      icon: CheckCircle,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Emprunts en Cours',
      value: stats.activeLoans,
      sub: 'Actuellement chez les étudiants',
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      label: 'Emprunts en Retard',
      value: stats.overdueLoans,
      sub: 'Échéance dépassée',
      icon: AlertTriangle,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      urgent: stats.overdueLoans > 0,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Page Title & Action Bar compacte */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Tableau de Bord du Gérant · EST Fès
          </h1>
          <p className="text-[11px] text-slate-500">
            Indicateurs consolidés calculés en direct d'après la base relationnelle
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('loans')}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs"
          >
            Nouvel emprunt
          </button>
        </div>
      </div>

      {/* 5 KPIs calculés en direct sur une seule ligne */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`bg-white border rounded-xl p-2.5 shadow-2xs transition-all ${
                kpi.urgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600 truncate">{kpi.label}</span>
                <div className={`p-1 rounded-md border ${kpi.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {kpi.value}
              </div>
              <div className="text-[10px] text-slate-400 truncate">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Two columns: Retards nécessitant une action (max 4) & Derniers emprunts & retours (max 5) - Remplissent la hauteur restante */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
        {/* Colonne 1 : Retards nécessitant une action */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <h2 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Retards nécessitant une action ({stats.urgentOverdues.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('loans')}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1"
            >
              Tout voir <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none divide-y divide-rose-50 pt-1">
            {stats.urgentOverdues.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-4">
                <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                <span>Aucun emprunt en retard critique</span>
              </div>
            ) : (
              stats.urgentOverdues.slice(0, 4).map(loan => (
                <div
                  key={loan.id}
                  className="py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="truncate min-w-0">
                    <div className="font-bold text-slate-900 truncate text-[11.5px]">
                      {loan.student?.user?.fullName} ({loan.student?.studentIdNumber})
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {loan.book?.title} · <span className="font-mono text-slate-600">{loan.bookCopy?.barcode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-rose-700 text-[11px]">+{loan.overdueDays} j</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded">
                      Relance auto
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Colonne 2 : Derniers emprunts & retours */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-700" />
              Derniers emprunts & retours
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('loans')}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900"
            >
              Historique complet
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none divide-y divide-slate-100 pt-1">
            {stats.recentLoans.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Aucun mouvement récent.</p>
            ) : (
              stats.recentLoans.slice(0, 5).map(loan => (
                <div key={loan.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="truncate min-w-0 pr-2">
                    <div className="font-semibold text-slate-800 truncate text-[11.5px]">{loan.book?.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {loan.student?.user?.fullName} · {loan.loanDate}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge type="loanStatus" value={loan.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
