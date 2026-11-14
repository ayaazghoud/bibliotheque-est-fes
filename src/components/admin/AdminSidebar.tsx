import React from 'react';
import {
  LayoutDashboard,
  BookMarked,
  PlusCircle,
  Copy,
  ScanBarcode,
  Users,
  Repeat,
  AlertOctagon,
  MailWarning,
  ScrollText,
  Sliders,
  ShieldCheck,
} from 'lucide-react';

export type AdminView =
  | 'dashboard'
  | 'books'
  | 'add-book'
  | 'copies'
  | 'scanner'
  | 'students'
  | 'loans'
  | 'audit'
  | 'settings';

interface AdminSidebarProps {
  currentView: AdminView;
  onSelectView: (view: AdminView) => void;
  overdueAlertCount?: number;
  pendingRequestsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onSelectView,
  overdueAlertCount = 0,
}) => {
  const menuItems = [
    { id: 'dashboard' as AdminView, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'books' as AdminView, label: 'Gestion des livres', icon: BookMarked },
    { id: 'add-book' as AdminView, label: 'Ajouter un livre', icon: PlusCircle },
    { id: 'copies' as AdminView, label: 'Gestion des exemplaires', icon: Copy },
    { id: 'scanner' as AdminView, label: 'Scanner un livre', icon: ScanBarcode },
    { id: 'students' as AdminView, label: 'Gestion des étudiants', icon: Users },
    {
      id: 'loans' as AdminView,
      label: 'Emprunts et retours',
      icon: Repeat,
      badge: overdueAlertCount > 0 ? overdueAlertCount : undefined,
      badgeColor: 'bg-rose-600 text-white',
    },
    { id: 'audit' as AdminView, label: 'Historique des opérations', icon: ScrollText },
    { id: 'settings' as AdminView, label: 'Paramètres', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Gestion Bibliothèque · EST Fès</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Gestion de la bibliothèque</p>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-sky-700'
                      : (item as any).badgeColor || 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <div>Université Sidi Mohamed Ben Abdellah</div>
        <div>EST Fès · Version 1.0</div>
      </div>
    </aside>
  );
};
