import React from 'react';
import { CopyCondition, CopyStatus, LoanStatus, OverdueLevel, LoanRequestStatus } from '../../types';

interface StatusBadgeProps {
  type: 'availability' | 'condition' | 'loanStatus' | 'overdueLevel' | 'loanRequestStatus' | 'copyStatus';
  value: string;
  count?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, count }) => {
  if (type === 'availability') {
    const isAvailable = value === 'AVAILABLE' || (typeof count === 'number' && count > 0);
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
        <span
          className={`w-2 h-2 rounded-full ${
            isAvailable ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
          aria-hidden="true"
        />
        <span className={isAvailable ? 'text-emerald-700' : 'text-rose-700'}>
          {isAvailable ? 'Disponible' : 'Indisponible'}
        </span>
        {typeof count === 'number' && (
          <span className="text-slate-500 font-normal tabular-nums">
            ({count} {count > 1 ? 'exemplaires' : 'exemplaire'})
          </span>
        )}
      </span>
    );
  }

  if (type === 'loanRequestStatus') {
    const status = value as LoanRequestStatus;
    const configs: Record<LoanRequestStatus, { label: string; bg: string; text: string; dot: string }> = {
      PENDING: { label: 'En attente', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
      APPROVED: { label: 'Acceptée / Prêt à retirer', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
      REJECTED: { label: 'Refusée', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
      CANCELLED: { label: 'Annulée', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
      EXPIRED: { label: 'Expirée (Non retirée)', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-600', dot: 'bg-slate-500' },
      FULFILLED: { label: 'Emprunt remis', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', dot: 'bg-sky-600' },
    };
    const c = configs[status] || { label: value, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  }

  if (type === 'loanStatus') {
    const status = value as LoanStatus;
    if (status === 'RETURNED') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Restitué
        </span>
      );
    }
    if (status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          En retard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
        En cours
      </span>
    );
  }

  if (type === 'overdueLevel') {
    const level = value as OverdueLevel;
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          Niveau 3 : Élevé (&gt;7 jours)
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          Niveau 2 : Moyen (4-7 jours)
        </span>
      );
    }
    if (level === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Niveau 1 : Faible (1-3 jours)
        </span>
      );
    }
    return (
      <span className="text-xs text-slate-500 font-medium">À jour (Aucun retard)</span>
    );
  }

  if (type === 'copyStatus') {
    const status = value as CopyStatus;
    const configs: Record<CopyStatus, { label: string; bg: string; text: string; dot: string }> = {
      AVAILABLE: { label: 'Disponible', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-600' },
      BORROWED: { label: 'Emprunté', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', dot: 'bg-sky-600' },
      RESERVED: { label: 'Réservé', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-600' },
      LOST: { label: 'Perdu', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', dot: 'bg-rose-600' },
      DAMAGED: { label: 'Endommagé', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', dot: 'bg-orange-600' },
      RETIRED: { label: 'Retiré du service', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-600', dot: 'bg-slate-500' },
      MAINTENANCE: { label: 'En maintenance', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', dot: 'bg-purple-600' },
    };
    const c = configs[status] || { label: value, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  }

  if (type === 'condition') {
    const condition = value as CopyCondition;
    const labels: Record<CopyCondition, { label: string; color: string }> = {
      NEW: { label: 'Neuf', color: 'text-emerald-700' },
      GOOD: { label: 'Bon état', color: 'text-slate-700' },
      FAIR: { label: 'Passable', color: 'text-amber-700' },
      DAMAGED: { label: 'Dégradé', color: 'text-rose-700' },
    };
    const c = labels[condition] || { label: value, color: 'text-slate-700' };
    return <span className={`text-xs font-medium ${c.color}`}>{c.label}</span>;
  }

  return <span className="text-xs text-slate-600">{value}</span>;
};
