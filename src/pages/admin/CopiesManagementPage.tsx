import React, { useState, useEffect } from 'react';
import { copiesApi, booksApi } from '../../services/api';
import { BookCopy, Book } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Copy,
  Search,
  Plus,
  Edit3,
  MapPin,
  Barcode,
  CheckCircle,
} from 'lucide-react';

export const CopiesManagementPage: React.FC = () => {
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New copy modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBookId, setNewBookId] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newShelf, setNewShelf] = useState('');
  const [newCondition, setNewCondition] = useState('NEW');
  const [errorMsg, setErrorMsg] = useState('');

  // Edit copy modal
  const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null);
  const [editShelf, setEditShelf] = useState('');
  const [editCondition, setEditCondition] = useState('GOOD');
  const [editStatus, setEditStatus] = useState<string>('AVAILABLE');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allCopies, allBooks] = await Promise.all([
        copiesApi.getAll(),
        booksApi.getAll(),
      ]);
      setCopies(allCopies);
      setBooks(allBooks);
      if (allBooks.length > 0 && !newBookId) {
        setNewBookId(allBooks[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setErrorMsg('');
    const randomBarcode = `EST-${Math.floor(1000 + Math.random() * 9000)}`;
    setNewBarcode(randomBarcode);
    setNewShelf('Salle Informatique - Rayon B - Étagère 2');
    setNewCondition('NEW');
    setIsAddOpen(true);
  };

  const handleCreateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookId || !newBarcode.trim() || !newShelf.trim()) return;

    try {
      setErrorMsg('');
      await copiesApi.create({
        bookId: parseInt(newBookId, 10),
        barcode: newBarcode.trim(),
        locationShelf: newShelf.trim(),
        condition: newCondition as any,
        status: 'AVAILABLE',
      });
      setIsAddOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const handleStartEdit = (copy: BookCopy) => {
    setEditingCopy(copy);
    setEditShelf(copy.locationShelf);
    setEditCondition(copy.condition);
    setEditStatus(copy.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCopy) return;
    try {
      await copiesApi.update(editingCopy.id, {
        locationShelf: editShelf.trim(),
        condition: editCondition as any,
        status: editStatus as any,
      });
      setEditingCopy(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const filteredCopies = copies.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.barcode.toLowerCase().includes(q) ||
      c.locationShelf.toLowerCase().includes(q) ||
      (c.book?.title && c.book.title.toLowerCase().includes(q));

    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Copy className="w-6 h-6 text-sky-700" />
            Gestion Unitaire des Exemplaires Physiques
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des codes-barres unitaires, localisations en rayon et états de conservation
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvel exemplaire
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par code-barres, titre du livre, emplacement..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 text-slate-700"
        >
          <option value="">Tous les statuts</option>
          <option value="AVAILABLE">Disponible en rayon</option>
          <option value="BORROWED">Actuellement emprunté</option>
          <option value="RESERVED">Réservé (prêt à retirer)</option>
          <option value="LOST">Perdu</option>
          <option value="DAMAGED">Endommagé</option>
          <option value="RETIRED">Retiré du service</option>
        </select>
      </div>

      {/* Table of copies */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Chargement des exemplaires...</div>
        ) : filteredCopies.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <Copy className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">Aucun exemplaire trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code-barres</th>
                  <th className="py-3 px-4">Ouvrage associé</th>
                  <th className="py-3 px-4">Emplacement (Rayon)</th>
                  <th className="py-3 px-4">État physique</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCopies.map(copy => (
                  <tr key={copy.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {copy.barcode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">{copy.book?.title}</div>
                      <div className="text-[11px] text-slate-500">{copy.book?.author}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{copy.locationShelf}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge type="condition" value={copy.condition} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge type="copyStatus" value={copy.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(copy)}
                        className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors"
                        title="Modifier le statut, l'emplacement ou l'état"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Copy */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Ajouter un nouvel exemplaire physique"
        subtitle="Chaque exemplaire est identifié par un code-barres unique dans l'inventaire."
        maxWidth="md"
      >
        <form onSubmit={handleCreateCopy} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ouvrage bibliographique associé</label>
            <select
              value={newBookId}
              onChange={e => setNewBookId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {books.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.author})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Code-barres unique</label>
            <input
              type="text"
              value={newBarcode}
              onChange={e => setNewBarcode(e.target.value)}
              required
              placeholder="EST-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Emplacement physique en rayon</label>
            <input
              type="text"
              value={newShelf}
              onChange={e => setNewShelf(e.target.value)}
              required
              placeholder="Ex : Salle 1 - Rayon B - Étagère 3"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">État physique du livre</label>
            <select
              value={newCondition}
              onChange={e => setNewCondition(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="NEW">Neuf</option>
              <option value="GOOD">Bon état</option>
              <option value="FAIR">Passable</option>
              <option value="DAMAGED">Dégradé</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700"
            >
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-sky-700 text-white rounded-lg font-bold">
              Enregistrer l'exemplaire
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Copy */}
      <Modal
        isOpen={!!editingCopy}
        onClose={() => setEditingCopy(null)}
        title={`Modifier l'exemplaire ${editingCopy?.barcode || ''}`}
        maxWidth="sm"
      >
        {editingCopy && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emplacement en rayon</label>
              <input
                type="text"
                value={editShelf}
                onChange={e => setEditShelf(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Statut de circulation</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
              >
                <option value="AVAILABLE">Disponible</option>
                <option value="BORROWED">Emprunté</option>
                <option value="RESERVED">Réservé</option>
                <option value="LOST">Perdu</option>
                <option value="DAMAGED">Endommagé</option>
                <option value="RETIRED">Retiré du service</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Pour un exemplaire qui ne circule plus, modifiez son statut au lieu de le supprimer afin de préserver l'historique complet des emprunts.
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">État physique</label>
              <select
                value={editCondition}
                onChange={e => setEditCondition(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="NEW">Neuf</option>
                <option value="GOOD">Bon état</option>
                <option value="FAIR">Passable</option>
                <option value="DAMAGED">Dégradé</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCopy(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-sky-700 text-white rounded-lg font-bold">
                Mettre à jour
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
