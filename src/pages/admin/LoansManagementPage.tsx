import React, { useState, useEffect } from 'react';
import { loansApi, studentsApi, copiesApi, loanRequestsApi } from '../../services/api';
import { Loan, Student, BookCopy, LoanRequest, LoanRequestStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Repeat,
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  UserCheck,
  Barcode,
  Inbox,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Eye,
  Filter,
  RefreshCw,
  BookOpen,
  MapPin,
  FileText,
} from 'lucide-react';

interface LoansManagementPageProps {
  initialBarcodeForLoan?: string;
  initialLoanIdForReturn?: number;
  onClearInitialStates?: () => void;
  onSendReminder?: (loanId: number) => void;
}

export const LoansManagementPage: React.FC<LoansManagementPageProps> = ({
  initialBarcodeForLoan,
  initialLoanIdForReturn,
  onClearInitialStates,
  onSendReminder,
}) => {
  // Main view tab: 'PHYSICAL_LOANS' | 'ONLINE_REQUESTS'
  const [mainTab, setMainTab] = useState<'PHYSICAL_LOANS' | 'ONLINE_REQUESTS'>('PHYSICAL_LOANS');

  // PHYSICAL LOANS STATE
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state (Physical loans)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal: Create Loan
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableCopies, setAvailableCopies] = useState<BookCopy[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [loanDate, setLoanDate] = useState('2026-11-07');
  const [expectedReturnDate, setExpectedReturnDate] = useState('2026-11-21');
  const [loanNotes, setLoanNotes] = useState('');
  const [createLoanError, setCreateLoanError] = useState('');

  // Modal: Return Loan
  const [returningLoan, setReturningLoan] = useState<Loan | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState('2026-11-07');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnError, setReturnError] = useState('');

  // ONLINE REQUESTS STATE
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED'
  >('ALL');

  // Modals for online requests:
  // 1. Details Modal
  const [viewingRequest, setViewingRequest] = useState<LoanRequest | null>(null);

  // 2. Fulfill Modal (Physical counter delivery)
  const [fulfillingRequest, setFulfillingRequest] = useState<LoanRequest | null>(null);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [fulfillError, setFulfillError] = useState('');

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      const data = await loansApi.getAll();
      setLoans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const data = await loanRequestsApi.getAll();
      setRequests(data);
    } catch (e) {
      console.error('Erreur chargement demandes en ligne:', e);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadLoans();
    loadRequests();
  }, []);

  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

  // Handle passed initial props (from Barcode Scanner)
  useEffect(() => {
    if (initialBarcodeForLoan) {
      setMainTab('PHYSICAL_LOANS');
      handleOpenCreateLoan(initialBarcodeForLoan);
    }
    if (initialLoanIdForReturn) {
      setMainTab('PHYSICAL_LOANS');
      loansApi.getAll().then(all => {
        const target = all.find(l => l.id === initialLoanIdForReturn);
        if (target) {
          handleOpenReturnModal(target);
        }
      });
    }
  }, [initialBarcodeForLoan, initialLoanIdForReturn]);

  const handleOpenCreateLoan = async (preselectedBarcode?: string) => {
    setCreateLoanError('');
    try {
      const [allStudents, allCopies] = await Promise.all([
        studentsApi.getAll(),
        copiesApi.getAll(),
      ]);
      setStudents(allStudents);
      const available = allCopies.filter(c => c.status === 'AVAILABLE');
      setAvailableCopies(available);

      if (allStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(allStudents[0].id.toString());
      }

      if (preselectedBarcode) {
        const matched = available.find(c => c.barcode === preselectedBarcode);
        if (matched) {
          setSelectedCopyId(matched.id.toString());
        } else if (available.length > 0) {
          setSelectedCopyId(available[0].id.toString());
        }
      } else if (available.length > 0) {
        setSelectedCopyId(available[0].id.toString());
      }

      setIsCreateLoanOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCopyId || !loanDate || !expectedReturnDate) {
      setCreateLoanError('Tous les champs obligatoires doivent être renseignés.');
      return;
    }

    try {
      setCreateLoanError('');
      await loansApi.create({
        studentId: parseInt(selectedStudentId, 10),
        bookCopyId: parseInt(selectedCopyId, 10),
        loanDate,
        expectedReturnDate,
        notes: loanNotes.trim() || undefined,
      });

      setIsCreateLoanOpen(false);
      if (onClearInitialStates) onClearInitialStates();
      loadLoans();
      showFeedback('Emprunt physique enregistré avec succès.');
    } catch (err: any) {
      setCreateLoanError(err.response?.data?.error || err.message);
    }
  };

  const handleOpenReturnModal = (loan: Loan) => {
    setReturningLoan(loan);
    setReturnError('');
    setActualReturnDate('2026-11-07');
    setReturnCondition(loan.bookCopy?.condition || 'GOOD');
    setReturnNotes('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningLoan) return;

    try {
      setReturnError('');
      await loansApi.returnLoan(returningLoan.id, {
        actualReturnDate,
        condition: returnCondition,
        notes: returnNotes.trim() || undefined,
      });

      setReturningLoan(null);
      if (onClearInitialStates) onClearInitialStates();
      loadLoans();
      showFeedback('Restitution confirmée. L\'exemplaire a été réintégré dans le catalogue disponible.');
    } catch (err: any) {
      setReturnError(err.response?.data?.error || err.message);
    }
  };

  // Online request actions: Fulfill (Hand over the book)
  const handleOpenFulfillModal = (req: LoanRequest) => {
    setFulfillingRequest(req);
    setFulfillError('');
  };

  const handleConfirmFulfill = async () => {
    if (!fulfillingRequest) return;
    try {
      setIsFulfilling(true);
      setFulfillError('');
      await loanRequestsApi.fulfill(fulfillingRequest.id);

      setFulfillingRequest(null);
      loadRequests();
      loadLoans();
      showFeedback(`Remise physique validée ! L'emprunt officiel a été créé et le prêt est désormais en cours.`);
    } catch (err: any) {
      setFulfillError(err.response?.data?.error || err.message || 'Erreur lors de la validation');
    } finally {
      setIsFulfilling(false);
    }
  };

  // Filter & Search Physical Loans
  const filteredLoans = loans.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (l.student?.user?.fullName && l.student.user.fullName.toLowerCase().includes(q)) ||
      (l.student?.user?.email && l.student.user.email.toLowerCase().includes(q)) ||
      (l.book?.title && l.book.title.toLowerCase().includes(q)) ||
      (l.bookCopy?.barcode && l.bookCopy.barcode.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') matchesStatus = l.status === 'ACTIVE';
    if (statusFilter === 'OVERDUE') matchesStatus = l.status === 'OVERDUE' || l.overdueDays > 0;
    if (statusFilter === 'RETURNED') matchesStatus = l.status === 'RETURNED';

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLoans.length / pageSize) || 1;
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filter & Search Online Requests
  const filteredRequests = requests.filter(r => {
    const q = requestSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.student?.user?.fullName && r.student.user.fullName.toLowerCase().includes(q)) ||
      (r.student?.studentIdNumber && r.student.studentIdNumber.toLowerCase().includes(q)) ||
      (r.book?.title && r.book.title.toLowerCase().includes(q)) ||
      (r.bookCopy?.barcode && r.bookCopy.barcode.toLowerCase().includes(q));

    let matchesStatus = true;
    if (requestStatusFilter !== 'ALL') {
      matchesStatus = r.status === requestStatusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Title & Action */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
            <Repeat className="w-5 h-5 text-sky-700" />
            Gestion des Emprunts & Demandes en Ligne
          </h1>
          <p className="text-[11px] text-slate-500">
            Validation des demandes étudiantes en ligne, réservation physique des exemplaires, prêts comptoir et retours
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              loadLoans();
              loadRequests();
            }}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateLoan()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            Enregistrer un prêt direct (comptoir)
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Mode Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setMainTab('PHYSICAL_LOANS')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            mainTab === 'PHYSICAL_LOANS'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Emprunts physiques & Retours ({loans.filter(l => l.status === 'ACTIVE').length} actifs)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('ONLINE_REQUESTS')}
          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            mainTab === 'ONLINE_REQUESTS'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Demandes d'emprunt en ligne</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* VUE 1 : DEMANDES EN LIGNE */}
      {mainTab === 'ONLINE_REQUESTS' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
          {/* Search & Filter for requests */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={requestSearchQuery}
                onChange={e => setRequestSearchQuery(e.target.value)}
                placeholder="Rechercher par étudiant, CNE, titre du livre, code-barres..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg shrink-0 overflow-x-auto text-xs">
              {[
                { id: 'ALL', label: 'Toutes' },
                { id: 'APPROVED', label: 'Prêt à retirer' },
                { id: 'FULFILLED', label: 'Remis' },
                { id: 'REJECTED', label: 'Refusées' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRequestStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                    requestStatusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table of Online Requests */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex-1 min-h-0 flex flex-col">
            {isLoadingRequests ? (
              <div className="p-8 text-center text-xs text-slate-500">Chargement des demandes en ligne...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-1">
                <Inbox className="w-8 h-8 text-slate-400 stroke-1" />
                <p className="font-semibold text-slate-700">Aucune demande d'emprunt trouvée</p>
                <p className="text-slate-400 text-[11px]">Les demandes soumises par les étudiants s'afficheront ici en temps réel.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">N°</th>
                      <th className="py-3 px-4">Étudiant Demandeur</th>
                      <th className="py-3 px-4">Ouvrage & Réservation</th>
                      <th className="py-3 px-4">Date Demande</th>
                      <th className="py-3 px-4 text-center">Statut / Décision auto</th>
                      <th className="py-3 px-4 text-right">Actions Gérant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map(req => {
                      const isApproved = req.status === 'APPROVED';
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                            #{req.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{req.student?.user?.fullName}</span>
                              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded">
                                {req.student?.department}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              CNE: {req.student?.studentIdNumber} · {req.student?.user?.email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-semibold text-slate-800 line-clamp-1">{req.book?.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{req.book?.author}</span>
                              {req.bookCopy && (
                                <span className="font-mono text-emerald-700 font-bold">
                                  [{req.bookCopy.barcode}]
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 tabular-nums">
                            {new Date(req.requestDate).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <StatusBadge type="loanRequestStatus" value={req.status} />
                            {isApproved && req.pickupDeadline && (
                              <div className="text-[10px] text-amber-700 font-bold mt-1">
                                Retrait limite : {new Date(req.pickupDeadline).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </div>
                            )}
                            {req.status === 'REJECTED' && req.rejectionReason && (
                              <div className="text-[10px] text-rose-700 mt-1 italic font-medium max-w-xs mx-auto">
                                Motif : {req.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Details button */}
                              <button
                                type="button"
                                onClick={() => setViewingRequest(req)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                title="Voir la fiche détaillée"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* APPROVED: Confirm physical delivery at counter */}
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFulfillModal(req)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded transition-colors shadow-2xs"
                                  title="L'étudiant est présent au comptoir pour retirer son livre"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  Confirmer la remise
                                </button>
                              )}

                              {req.status === 'FULFILLED' && (
                                <span className="text-[11px] text-emerald-700 font-medium">Remis au comptoir</span>
                              )}
                              {req.status === 'REJECTED' && (
                                <span className="text-[11px] text-slate-400 italic">Décision auto</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VUE 2 : EMPRUNTS PHYSIQUES COMPTOIR & RETOURS */}
      {mainTab === 'PHYSICAL_LOANS' && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2 overflow-hidden">
          {/* Filter and Search Bar compact */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher par étudiant, e-mail, livre ou code-barres..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
              />
            </div>

            {/* Status segmented filters */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg shrink-0">
              {[
                { id: 'ALL', label: 'Tous les prêts' },
                { id: 'ACTIVE', label: 'En cours' },
                { id: 'OVERDUE', label: 'En retard' },
                { id: 'RETURNED', label: 'Restitués' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loans Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex-1 min-h-0 flex flex-col">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Chargement des emprunts...</div>
            ) : paginatedLoans.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-1">
                <Repeat className="w-8 h-8 text-slate-400 stroke-1" />
                <p className="font-semibold text-slate-700">Aucun emprunt correspondant</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Étudiant Emprunteur</th>
                      <th className="py-3 px-4">Livre & Exemplaire</th>
                      <th className="py-3 px-4">Date Prêt</th>
                      <th className="py-3 px-4">Date Limite</th>
                      <th className="py-3 px-4 text-center">Statut / Retard</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLoans.map(loan => {
                      const isOverdue = loan.status === 'OVERDUE' || loan.overdueDays > 0;
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{loan.student?.user?.fullName}</div>
                            <div className="text-[11px] text-slate-500">
                              {loan.student?.user?.email} · CNE : {loan.student?.studentIdNumber}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800 line-clamp-1">{loan.book?.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                              <Barcode className="w-3 h-3 text-slate-400" />
                              <span>{loan.bookCopy?.barcode}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 tabular-nums">{loan.loanDate}</td>
                          <td className="py-3.5 px-4 tabular-nums">
                            <span className={isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                              {loan.expectedReturnDate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <StatusBadge type="loanStatus" value={loan.status} />
                              {isOverdue && loan.status !== 'RETURNED' && (
                                <span className="text-[10px] font-bold text-rose-700">
                                  +{loan.overdueDays} j de retard
                                </span>
                              )}
                              {loan.status === 'RETURNED' && (
                                <span className="text-[10px] text-slate-400">Rendu le {loan.actualReturnDate}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {loan.status !== 'RETURNED' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {isOverdue && (
                                  <span
                                    className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded"
                                    title="Relances automatiques quotidiennes actives"
                                  >
                                    Relance auto active
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenReturnModal(loan)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors shadow-2xs"
                                >
                                  Retour
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Clôturé</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls compact */}
            <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
              <span>
                Page {currentPage} / {totalPages} ({filteredLoans.length} emprunt{filteredLoans.length > 1 ? 's' : ''})
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2 py-0.5 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : DÉTAIL D'UNE DEMANDE EN LIGNE (VIEW ONLY) */}
      <Modal
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
        title={`Demande d'emprunt N° ${viewingRequest?.id}`}
        subtitle={`Soumise par ${viewingRequest?.student?.user?.fullName || ''}`}
        maxWidth="md"
      >
        {viewingRequest && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-semibold text-slate-500">Statut de la demande :</span>
              <StatusBadge type="loanRequestStatus" value={viewingRequest.status} />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fiche Étudiant
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Nom complet :</span>
                  <span className="font-bold text-slate-900">{viewingRequest.student?.user?.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Identifiant CNE :</span>
                  <span className="font-mono font-bold text-slate-900">{viewingRequest.student?.studentIdNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Filière / Département :</span>
                  <span className="font-semibold text-slate-800">{viewingRequest.student?.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail académique :</span>
                  <span className="font-semibold text-slate-800">{viewingRequest.student?.user?.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fiche Ouvrage Demandé
              </span>
              <div>
                <span className="text-base font-bold text-slate-900 block">{viewingRequest.book?.title}</span>
                <span className="text-slate-600 block mt-0.5">
                  Auteur : {viewingRequest.book?.author} · {viewingRequest.book?.publicationYear}
                </span>
                <span className="font-mono text-slate-500 text-[11px]">ISBN : {viewingRequest.book?.isbn || 'N/A'}</span>
              </div>
            </div>

            {viewingRequest.notes && (
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-sky-900">
                <span className="font-bold block mb-0.5">Remarque de l'étudiant :</span>
                <span>« {viewingRequest.notes} »</span>
              </div>
            )}

            {viewingRequest.bookCopy && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-1">
                <span className="font-bold block">Exemplaire attribué :</span>
                <div className="font-mono font-bold text-xs">{viewingRequest.bookCopy.barcode}</div>
                <div className="text-[11px] text-emerald-800">Rayon : {viewingRequest.bookCopy.locationShelf}</div>
              </div>
            )}

            {viewingRequest.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
                <span className="font-bold block">Motif du refus notifié :</span>
                <span>{viewingRequest.rejectionReason}</span>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL : CONFIRMER LA REMISE PHYSIQUE DU LIVRE */}
      <Modal
        isOpen={!!fulfillingRequest}
        onClose={() => setFulfillingRequest(null)}
        title="Confirmation de la Remise Physique du Livre"
        subtitle={`Ouvrage : ${fulfillingRequest?.book?.title || ''}`}
        maxWidth="md"
      >
        {fulfillingRequest && (
          <div className="space-y-4 text-xs">
            {fulfillError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fulfillError}</span>
              </div>
            )}

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                <span>L'étudiant est présent au comptoir de la bibliothèque</span>
              </div>
              <p className="text-xs text-emerald-800">
                Cette action valide la remise en main propre du livre. L'exemplaire passe de l'état <strong>RÉSERVÉ</strong> à <strong>EMPRUNTÉ</strong>, un prêt officiel est créé avec échéance à 14 jours, et la demande est marquée comme <strong>REMISE EFFECTUÉE</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
              <div>
                Étudiant : <strong>{fulfillingRequest.student?.user?.fullName}</strong> (CNE : {fulfillingRequest.student?.studentIdNumber})
              </div>
              <div>
                Exemplaire physique attribué : <strong className="font-mono">{fulfillingRequest.bookCopy?.barcode}</strong>
              </div>
              <div>
                Rayon de stockage : <strong>{fulfillingRequest.bookCopy?.locationShelf}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFulfillingRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmFulfill}
                disabled={isFulfilling}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                {isFulfilling ? 'Validation...' : 'Valider la remise physique'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL : ENREGISTRER UN NOUVEL EMPRUNT */}
      <Modal
        isOpen={isCreateLoanOpen}
        onClose={() => setIsCreateLoanOpen(false)}
        title="Enregistrer un Nouvel Emprunt"
        subtitle="Vérification de la disponibilité physique en temps réel et des quotas d'emprunt."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLoanSubmit} className="space-y-4 text-xs">
          {createLoanError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{createLoanError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              1. Sélectionner l'Étudiant Emprunteur <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {students.map(st => (
                <option key={st.id} value={st.id}>
                  {st.user?.fullName} — {st.user?.email} (CNE : {st.studentIdNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              2. Sélectionner l'Exemplaire Disponible en Rayon <span className="text-rose-500">*</span>
            </label>
            {availableCopies.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
                Aucun exemplaire physique n'est actuellement disponible dans la bibliothèque.
              </div>
            ) : (
              <select
                value={selectedCopyId}
                onChange={e => setSelectedCopyId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              >
                {availableCopies.map(cp => (
                  <option key={cp.id} value={cp.id}>
                    [{cp.barcode}] {cp.book?.title} — Rayon : {cp.locationShelf}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date d'emprunt <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={loanDate}
                onChange={e => setLoanDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date prévue de retour <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={e => setExpectedReturnDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Observations / Remarques (Optionnel)</label>
            <input
              type="text"
              value={loanNotes}
              onChange={e => setLoanNotes(e.target.value)}
              placeholder="Ex : Pour projet de fin de semestre..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateLoanOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={availableCopies.length === 0}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              Valider l'emprunt
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL : ENREGISTRER LE RETOUR DU LIVRE */}
      <Modal
        isOpen={!!returningLoan}
        onClose={() => setReturningLoan(null)}
        title="Enregistrer la Restitution de l'Exemplaire"
        subtitle={`Ouvrage : ${returningLoan?.book?.title || ''} (${returningLoan?.bookCopy?.barcode || ''})`}
        maxWidth="md"
      >
        {returningLoan && (
          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
            {returnError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800">
                {returnError}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div>
                Étudiant : <strong>{returningLoan.student?.user?.fullName}</strong>
              </div>
              <div>
                Date d'emprunt : <strong>{returningLoan.loanDate}</strong>
              </div>
              <div>
                Date prévue : <strong>{returningLoan.expectedReturnDate}</strong>
              </div>
              {returningLoan.overdueDays > 0 && (
                <div className="text-rose-700 font-bold">
                  Retard constaté : +{returningLoan.overdueDays} jour(s)
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date réelle de retour</label>
              <input
                type="date"
                value={actualReturnDate}
                onChange={e => setActualReturnDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Constat de l'état physique du livre au retour
              </label>
              <select
                value={returnCondition}
                onChange={e => setReturnCondition(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="NEW">Neuf</option>
                <option value="GOOD">Bon état</option>
                <option value="FAIR">Passable (Usure légère)</option>
                <option value="DAMAGED">Dégradé / Déchiré</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remarques sur le retour</label>
              <input
                type="text"
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                placeholder="Rendu en bon état, remis en rayon..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReturningLoan(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors"
              >
                Confirmer la restitution
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
