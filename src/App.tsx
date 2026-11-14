/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRouter } from './hooks/useRouter';
import { Navbar } from './components/common/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { StudentHome } from './pages/student/StudentHome';
import { MyLoansPage } from './pages/student/MyLoansPage';
import { MyRequestsPage } from './pages/student/MyRequestsPage';
import { AdminSidebar, AdminView } from './components/admin/AdminSidebar';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BooksManagementPage } from './pages/admin/BooksManagementPage';
import { AddBookPage } from './pages/admin/AddBookPage';
import { CopiesManagementPage } from './pages/admin/CopiesManagementPage';
import { BarcodeScannerPage } from './pages/admin/BarcodeScannerPage';
import { StudentsManagementPage } from './pages/admin/StudentsManagementPage';
import { LoansManagementPage } from './pages/admin/LoansManagementPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { loansApi, loanRequestsApi } from './services/api';

const MainAppContent: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { user, isAuthenticated, isManager, isStudent, isLoading } = useAuth();

  // Student active tab: 'catalog' | 'my-requests' | 'my-loans'
  const [studentTab, setStudentTab] = useState<'catalog' | 'my-requests' | 'my-loans'>('catalog');

  // Manager active view
  const [adminView, setAdminView] = useState<AdminView>('dashboard');

  // Overdue alert counter badge on sidebar
  const [overdueAlertCount, setOverdueAlertCount] = useState(0);

  // Pending online requests badge for manager
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Cross-view state (e.g. from Scanner to Loans)
  const [barcodeForLoan, setBarcodeForLoan] = useState<string | undefined>();
  const [loanIdForReturn, setLoanIdForReturn] = useState<number | undefined>();

  // Synchronize student tab from currentPath
  useEffect(() => {
    if (isAuthenticated && isStudent) {
      if (currentPath.includes('/demandes')) {
        setStudentTab('my-requests');
      } else if (currentPath.includes('/emprunts')) {
        setStudentTab('my-loans');
      } else {
        setStudentTab('catalog');
      }
    }
  }, [currentPath, isAuthenticated, isStudent]);

  // Synchronize manager view from currentPath
  useEffect(() => {
    if (isAuthenticated && isManager) {
      if (currentPath.includes('/livres')) setAdminView('books');
      else if (currentPath.includes('/ajouter-livre')) setAdminView('add-book');
      else if (currentPath.includes('/exemplaires')) setAdminView('copies');
      else if (currentPath.includes('/scanner')) setAdminView('scanner');
      else if (currentPath.includes('/etudiants')) setAdminView('students');
      else if (currentPath.includes('/emprunts') || currentPath.includes('/retards') || currentPath.includes('/rappels')) setAdminView('loans');
      else if (currentPath.includes('/audit')) setAdminView('audit');
      else if (currentPath.includes('/parametres')) setAdminView('settings');
      else setAdminView('dashboard');
    }
  }, [currentPath, isAuthenticated, isManager]);

  // Role segregation protection & automatic redirects
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // If unauthorized and trying to access internal areas, route to corresponding login
      if (currentPath.startsWith('/etudiant') && currentPath !== '/etudiant/connexion') {
        navigate('/etudiant/connexion');
      } else if (currentPath.startsWith('/gerant') && currentPath !== '/gerant/connexion') {
        navigate('/gerant/connexion');
      }
    } else if (isStudent) {
      // Student cannot access /gerant or login pages
      if (currentPath.startsWith('/gerant') || currentPath === '/' || currentPath === '/etudiant/connexion' || currentPath === '/gerant/connexion') {
        navigate('/etudiant/catalogue');
      }
    } else if (isManager) {
      // Manager cannot access /etudiant or login pages
      if (currentPath.startsWith('/etudiant') || currentPath === '/' || currentPath === '/gerant/connexion' || currentPath === '/etudiant/connexion') {
        navigate('/gerant/dashboard');
      }
    }
  }, [isAuthenticated, isStudent, isManager, currentPath, isLoading, navigate]);

  // Load manager badge counts
  useEffect(() => {
    if (isManager) {
      loansApi
        .getAll({ onlyOverdue: true })
        .then(list => setOverdueAlertCount(list.length))
        .catch(console.error);

      loanRequestsApi
        .getAll({ status: 'PENDING' })
        .then(reqs => setPendingRequestsCount(reqs.length))
        .catch(console.error);
    }
  }, [isManager, adminView]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-semibold">
        Chargement de l'application Bibliothèque EST Fès...
      </div>
    );
  }

  // ----------------------------------------------------
  // UNAUTHENTICATED ROUTING (Direct Single Login Page)
  // ----------------------------------------------------
  if (!isAuthenticated || !user) {
    const initialSpace = currentPath === '/gerant/connexion' ? 'gerant' : 'etudiant';
    return (
      <LoginPage
        space={initialSpace}
        onSelectSpace={s => navigate(s === 'gerant' ? '/gerant/connexion' : '/etudiant/connexion')}
      />
    );
  }

  // ----------------------------------------------------
  // MANAGER / ADMIN INTERFACE (/gerant/...)
  // ----------------------------------------------------
  if (isManager) {
    const handleSelectAdminView = (view: AdminView) => {
      setAdminView(view);
      const viewPathMap: Record<AdminView, string> = {
        dashboard: '/gerant/dashboard',
        books: '/gerant/livres',
        'add-book': '/gerant/ajouter-livre',
        copies: '/gerant/exemplaires',
        scanner: '/gerant/scanner',
        students: '/gerant/etudiants',
        loans: '/gerant/emprunts',
        audit: '/gerant/audit',
        settings: '/gerant/parametres',
      };
      navigate(viewPathMap[view] || '/gerant/dashboard');
    };

    return (
      <div className="min-h-screen flex flex-col bg-slate-100">
        <Navbar
          pendingRequestsCount={pendingRequestsCount}
          onLogout={() => navigate('/')}
        />
        <div className="flex-1 flex overflow-hidden">
          <AdminSidebar
            currentView={adminView}
            onSelectView={handleSelectAdminView}
            overdueAlertCount={overdueAlertCount}
            pendingRequestsCount={pendingRequestsCount}
          />
          <main className="flex-1 overflow-y-auto bg-slate-50">
            {adminView === 'dashboard' && (
              <AdminDashboard onNavigate={handleSelectAdminView} />
            )}
            {adminView === 'books' && (
              <BooksManagementPage onGoToAddBook={() => handleSelectAdminView('add-book')} />
            )}
            {adminView === 'add-book' && (
              <AddBookPage
                onSuccess={() => handleSelectAdminView('books')}
                onCancel={() => handleSelectAdminView('books')}
              />
            )}
            {adminView === 'copies' && <CopiesManagementPage />}
            {adminView === 'scanner' && (
              <BarcodeScannerPage
                onNavigate={handleSelectAdminView}
                onInitiateLoanWithCopy={barcode => {
                  setBarcodeForLoan(barcode);
                  handleSelectAdminView('loans');
                }}
                onInitiateReturnWithLoan={loanId => {
                  setLoanIdForReturn(loanId);
                  handleSelectAdminView('loans');
                }}
              />
            )}
            {adminView === 'students' && <StudentsManagementPage />}
            {adminView === 'loans' && (
              <LoansManagementPage
                initialBarcodeForLoan={barcodeForLoan}
                initialLoanIdForReturn={loanIdForReturn}
                onClearInitialStates={() => {
                  setBarcodeForLoan(undefined);
                  setLoanIdForReturn(undefined);
                }}
              />
            )}
            {adminView === 'audit' && <AuditLogsPage />}
            {adminView === 'settings' && <SettingsPage />}
          </main>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STUDENT INTERFACE (/etudiant/...)
  // ----------------------------------------------------
  const handleStudentTabNavigate = (tab: string) => {
    if (tab === 'catalog') {
      setStudentTab('catalog');
      navigate('/etudiant/catalogue');
    } else if (tab === 'my-requests') {
      setStudentTab('my-requests');
      navigate('/etudiant/demandes');
    } else if (tab === 'my-loans') {
      setStudentTab('my-loans');
      navigate('/etudiant/emprunts');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar
        onNavigateTab={handleStudentTabNavigate}
        activeTab={studentTab}
        onLogout={() => navigate('/')}
      />
      <main className="flex-1 overflow-y-auto">
        {studentTab === 'catalog' && (
          <StudentHome
            onGoToMyLoans={() => handleStudentTabNavigate('my-loans')}
            onGoToMyRequests={() => handleStudentTabNavigate('my-requests')}
          />
        )}
        {studentTab === 'my-requests' && (
          <MyRequestsPage onBackToCatalog={() => handleStudentTabNavigate('catalog')} />
        )}
        {studentTab === 'my-loans' && (
          <MyLoansPage onBackToCatalog={() => handleStudentTabNavigate('catalog')} />
        )}
      </main>
      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 Bibliothèque de l'École Supérieure de Technologie de Fès · USMBA
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

