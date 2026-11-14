import React, { useState, useEffect } from 'react';
import { auditApi } from '../../services/api';
import { AuditLog } from '../../types';
import { ScrollText, Search, Shield, User, Clock, RefreshCw } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await auditApi.getAll();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.action.toLowerCase().includes(q) ||
      l.entityName.toLowerCase().includes(q) ||
      (l.actorName && l.actorName.toLowerCase().includes(q))
    );
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
            <ScrollText className="w-5 h-5 text-sky-700" />
            Journalisation & Audit des Opérations
          </h1>
          <p className="text-[11px] text-slate-500">
            Traçabilité sécurisée et horodatée de toutes les transactions sensibles
          </p>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrer par action (ex: LOAN, BOOK, REMINDER), entité ou auteur..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Chargement des logs d'audit...</div>
        ) : paginatedLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-1">
            <ScrollText className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
            <p className="font-semibold text-slate-700">Aucun enregistrement d'audit trouvé</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Opérateur</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entité</th>
                  <th className="py-3 px-4">Détails de l'Opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 tabular-nums text-[11px] whitespace-nowrap font-sans">
                      {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.actorName === 'Automatique' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                          Automatique
                        </span>
                      ) : (
                        <div className="font-semibold text-slate-800">{log.actorName || 'Système'}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans text-xs">
                      {log.entityName} {log.entityId ? `(#${log.entityId})` : ''}
                    </td>
                    <td className="py-2.5 px-3 max-w-md font-mono text-[10px] text-slate-600">
                      {log.details ? (
                        <span className="truncate block bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {JSON.stringify(log.details)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls compact */}
        <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <span>
            Page {currentPage} / {totalPages} ({filteredLogs.length} opération{filteredLogs.length > 1 ? 's' : ''})
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
  );
};
