import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loanRequestsApi } from '../../services/api';
import { LoanRequest, LoanRequestStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Barcode,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface MyRequestsPageProps {
  onBackToCatalog: () => void;
}

export const MyRequestsPage: React.FC<MyRequestsPageProps> = ({ onBackToCatalog }) => {
  const { student } = useAuth();
  const [requests, setRequests] = useState<LoanRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'HISTORY'>('ALL');
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadRequests = async () => {
    if (!student?.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await loanRequestsApi.getMyRequests();
      setRequests(data);
    } catch (e) {
      console.error('Erreur chargement des demandes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [student?.id]);

  const handleOpenCancelModal = (requestId: number) => {
    setCancellingRequestId(requestId);
    setCancelModalOpen(true);
    setActionError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRequestId) return;
    try {
      setIsSubmittingCancel(true);
      setActionError('');
      await loanRequestsApi.cancel(cancellingRequestId);
      setActionSuccess('Votre demande d\'emprunt a été annulée avec succès.');
      setCancelModalOpen(false);
      setCancellingRequestId(null);
      await loadRequests();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Erreur lors de l\'annulation');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return req.status === 'PENDING';
    if (statusFilter === 'APPROVED') return req.status === 'APPROVED';
    if (statusFilter === 'HISTORY') {
      return ['REJECTED', 'CANCELLED', 'EXPIRED', 'FULFILLED'].includes(req.status);
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour au catalogue de recherche
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-sky-700" />
            Mes Demandes d'Emprunt en Ligne
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi en temps réel de vos réservations d'ouvrages, notifications d'acceptation et consignes de retrait
          </p>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Toutes ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            statusFilter === 'PENDING'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>En attente</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={`px-3 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
            statusFilter === 'APPROVED'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Prêts à retirer</span>
          {approvedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
              {approvedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('HISTORY')}
          className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
            statusFilter === 'HISTORY'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Historique
        </button>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          Chargement de vos demandes...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl space-y-3">
          <Inbox className="w-10 h-10 mx-auto text-slate-400 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">Aucune demande d'emprunt dans cette vue</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Consultez le catalogue pour rechercher un livre disponible et effectuer une demande d'emprunt en ligne.
          </p>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors mt-2"
          >
            Accéder au catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(req => {
            const isApproved = req.status === 'APPROVED';
            const isPending = req.status === 'PENDING';
            const isRejected = req.status === 'REJECTED';
            const isFulfilled = req.status === 'FULFILLED';
            const isExpired = req.status === 'EXPIRED';

            return (
              <div
                key={req.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-2xs transition-all ${
                  isApproved
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : isPending
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Header bar */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      Demande N° {req.id}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Demandé le {new Date(req.requestDate).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge type="loanRequestStatus" value={req.status} />
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(req.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded transition-colors"
                      >
                        Annuler la demande
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex flex-col md:flex-row gap-5">
                  {/* Book thumbnail & info */}
                  <div className="w-20 h-28 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                    {req.book?.coverImageUrl ? (
                      <img
                        src={req.book.coverImageUrl}
                        alt={req.book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center font-bold px-1">EST LIVRE</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wide">
                        {req.book?.categoryName || 'Ouvrage EST'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {req.book?.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {req.book?.author} · Édition {req.book?.publicationYear} · ISBN {req.book?.isbn || 'N/A'}
                      </p>
                    </div>

                    {req.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100">
                        Votre remarque : « {req.notes} »
                      </p>
                    )}

                    {/* STATUS CONDITIONAL BANNERS */}
                    {/* 1. APPROVED / READY FOR PICKUP */}
                    {isApproved && (
                      <div className="mt-3 p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 text-xs text-emerald-950">
                        <div className="flex items-center gap-2 font-bold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Demande validée par le gérant ! Exemplaire physique réservé à votre nom.</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                              Code-barres exemplaire
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {req.bookCopy?.barcode || 'Attribué au comptoir'}
                            </span>
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                              Emplacement en rayon
                            </span>
                            <span className="font-semibold text-slate-900 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              {req.bookCopy?.locationShelf || 'Comptoir d\'accueil'}
                            </span>
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                              Date limite de retrait
                            </span>
                            <span className="font-bold text-rose-700 text-sm">
                              {req.pickupDeadline ? new Date(req.pickupDeadline).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }) : 'Sous 48 heures'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-emerald-800 flex items-start gap-1.5 pt-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Instructions de retrait :</strong> Présentez-vous au comptoir de la bibliothèque de l'EST Fès muni de votre carte étudiante (CNE). Le gérant validera la remise physique du livre après vérification.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 2. REJECTED */}
                    {isRejected && (
                      <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Demande refusée par l'administration de la bibliothèque</span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Motif du refus :</strong> {req.rejectionReason || 'Non spécifié.'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Si vous avez des questions, vous pouvez vous adresser directement au gérant au comptoir de la bibliothèque.
                        </p>
                      </div>
                    )}

                    {/* 3. PENDING */}
                    {isPending && (
                      <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                        <span>
                          Votre demande est en cours d'examen par le gérant. Vous recevrez une notification dès qu'un exemplaire aura été préparé et validé.
                        </span>
                      </div>
                    )}

                    {/* 4. FULFILLED */}
                    {isFulfilled && (
                      <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>
                          Exemplaire retiré au comptoir. L'ouvrage figure désormais dans votre section « Mes emprunts en cours ».
                        </span>
                      </div>
                    )}

                    {/* 5. EXPIRED */}
                    {isExpired && (
                      <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          Délai de retrait dépassé. L'exemplaire a été réintégré dans le rayon disponible.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ANNULATION */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Annuler ma demande d'emprunt"
        subtitle="Cette action libérera votre quota et annulera la notification pour le gérant."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
              {actionError}
            </div>
          )}

          <p className="text-slate-600">
            Êtes-vous sûr de vouloir annuler votre demande d'emprunt ? Vous pourrez soumettre une nouvelle demande à tout moment si l'ouvrage est disponible.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Non, conserver
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isSubmittingCancel}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmittingCancel ? 'Annulation...' : 'Oui, annuler la demande'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
