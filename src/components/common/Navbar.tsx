import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsApi, loanRequestsApi } from '../../services/api';
import { Notification } from '../../types';
import {
  BookOpen,
  LogOut,
  UserCircle2,
  ShieldCheck,
  GraduationCap,
  Bell,
  Check,
  CheckCheck,
  Inbox,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';

interface NavbarProps {
  onNavigateTab?: (tab: string) => void;
  activeTab?: string;
  pendingRequestsCount?: number;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateTab,
  activeTab,
  pendingRequestsCount = 0,
  onLogout,
}) => {
  const { user, student, isManager, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [myPendingCount, setMyPendingCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };

  const loadNotifications = async () => {
    if (!user || user.id <= 0) {
      setNotifications([]);
      return;
    }
    try {
      setIsLoadingNotifications(true);
      const list = await notificationsApi.getAll();
      setNotifications(list);
    } catch (e) {
      console.error('Erreur chargement notifications:', e);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // If student, also track their active pending/approved requests count
  useEffect(() => {
    if (!isManager && student) {
      loanRequestsApi
        .getMyRequests()
        .then(reqs => {
          const active = reqs.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');
          setMyPendingCount(active.length);
        })
        .catch(console.error);
    }
  }, [isManager, student, activeTab]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-[#002B49] text-white border-b border-[#0A3A60] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Institution Zone with Visible Space Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold">
              <BookOpen className="w-5 h-5 text-sky-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Bibliothèque EST Fès
                </span>
                <span className="text-[11px] font-semibold text-sky-300 border border-sky-400/40 rounded px-1.5 py-0.2">
                  USMBA
                </span>
                {/* Visible Space Badge */}
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide ${
                    isManager
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/40'
                      : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                  }`}
                >
                  {isManager ? 'GESTION BIBLIOTHÈQUE' : 'ESPACE ÉTUDIANT'}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                École Supérieure de Technologie · Fès, Maroc
              </span>
            </div>
          </div>

          {/* Student navigation shortcut if in student space */}
          {!isManager && onNavigateTab && (
            <nav className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigateTab('catalog')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-sky-600/30 text-sky-200 border border-sky-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Recherche & Catalogue
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('my-requests')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'my-requests'
                    ? 'bg-sky-600/30 text-sky-200 border border-sky-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Mes Demandes</span>
                {myPendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                    {myPendingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('my-loans')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'my-loans'
                    ? 'bg-sky-600/30 text-sky-200 border border-sky-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Mes Emprunts
              </button>
            </nav>
          )}

          {/* User Profile & Notifications Zone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell with unread counter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) loadNotifications();
                }}
                className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Notifications"
                aria-label="Centre de notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-0 z-50 text-xs overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                            {unreadCount} non lue(s)
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {isLoadingNotifications && notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">Chargement...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 space-y-1">
                          <Bell className="w-6 h-6 mx-auto stroke-1 text-slate-300" />
                          <p className="text-xs">Aucune notification pour le moment.</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50 ${
                              !notif.isRead ? 'bg-sky-50/60' : ''
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'NEW_LOAN_REQUEST' ? (
                                <Inbox className="w-4 h-4 text-sky-600" />
                              ) : notif.type === 'REQUEST_APPROVED' ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : notif.type === 'REQUEST_REJECTED' ? (
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                              ) : notif.type === 'RESERVATION_EXPIRING' ? (
                                <Calendar className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Info className="w-4 h-4 text-slate-500" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 truncate">
                                  {notif.title}
                                </span>
                                {!notif.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="text-[10px] text-sky-700 hover:underline shrink-0"
                                    title="Marquer comme lu"
                                  >
                                    Lu
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Current user badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-slate-300 font-semibold text-xs border border-slate-600">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                  {user?.fullName}
                </span>
                <span className="text-[10px] text-slate-300 flex items-center gap-1">
                  {isManager ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-sky-400" />
                      Gestion Bibliothèque
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3 h-3 text-emerald-400" />
                      Étudiant ({student?.department || 'EST Fès'})
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Se déconnecter"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
