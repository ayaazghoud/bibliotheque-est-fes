import React, { useState, useEffect } from 'react';
import { booksApi, categoriesApi, copiesApi } from '../../services/api';
import { Book, Category, BookCopy } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  BookOpen,
  Search,
  Plus,
  Edit3,
  MapPin,
  Layers,
  Copy,
  AlertCircle,
} from 'lucide-react';

interface BooksManagementPageProps {
  onGoToAddBook: () => void;
}

export const BooksManagementPage: React.FC<BooksManagementPageProps> = ({ onGoToAddBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Modal: Manage copies of a book
  const [managingCopiesBook, setManagingCopiesBook] = useState<Book | null>(null);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [newBarcode, setNewBarcode] = useState('');
  const [newShelf, setNewShelf] = useState('');
  const [newCondition, setNewCondition] = useState('NEW');
  const [copyError, setCopyError] = useState('');

  // Modal: Edit book
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Book>>({});

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const [allBooks, allCategories] = await Promise.all([
        booksApi.getAll({ query: searchQuery || undefined, categoryId: selectedCategory }),
        categoriesApi.getAll(),
      ]);
      setBooks(allBooks);
      setCategories(allCategories);
    } catch (e) {
      console.error('Erreur chargement des livres:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [searchQuery, selectedCategory]);

  // Open Copies Modal
  const handleOpenCopies = async (book: Book) => {
    setManagingCopiesBook(book);
    setCopyError('');
    setNewBarcode(`EST-${book.categoryName?.substring(0, 2).toUpperCase() || 'GL'}-${Math.floor(100 + Math.random() * 900)}`);
    setNewShelf('Salle Informatique - Rayon A - Étagère 1');
    try {
      const copies = await copiesApi.getAll(book.id);
      setBookCopies(copies);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCopiesBook || !newBarcode.trim() || !newShelf.trim()) return;

    try {
      setCopyError('');
      await copiesApi.create({
        bookId: managingCopiesBook.id,
        barcode: newBarcode.trim(),
        locationShelf: newShelf.trim(),
        condition: newCondition as any,
        status: 'AVAILABLE',
      });
      // reload copies
      const updated = await copiesApi.getAll(managingCopiesBook.id);
      setBookCopies(updated);
      setNewBarcode(`EST-${managingCopiesBook.categoryName?.substring(0, 2).toUpperCase() || 'GL'}-${Math.floor(100 + Math.random() * 900)}`);
      loadBooks(); // refresh counts
    } catch (err: any) {
      setCopyError(err.response?.data?.error || err.message);
    }
  };

  // Edit Book
  const handleStartEdit = (book: Book) => {
    setEditingBook(book);
    setEditFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      categoryId: book.categoryId,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      summary: book.summary,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      await booksApi.update(editingBook.id, editFormData);
      setEditingBook(null);
      loadBooks();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // Pagination state (8 items maximum)
  const [currentPage, setCurrentPage] = useState(1);
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const pageSize = 8;

  // Filter books based on availability filter as well
  const filteredBooks = books.filter(b => {
    if (availabilityFilter === 'AVAILABLE') return (b.availableCopies || 0) > 0;
    if (availabilityFilter === 'UNAVAILABLE') return (b.availableCopies || 0) === 0;
    return true;
  });

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto w-full">
      {/* Title & Actions */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Gestion du Catalogue Bibliographique
          </h1>
          <p className="text-[11px] text-slate-500">
            Administration des ouvrages, fiches descriptives et exemplaires physiques rattachés
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToAddBook}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un ouvrage
        </button>
      </div>

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
            placeholder="Rechercher par titre, auteur, ISBN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600 focus:bg-white text-slate-900"
          />
        </div>

        <select
          value={selectedCategory || ''}
          onChange={e => {
            setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : undefined);
            setCurrentPage(1);
          }}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600 text-slate-700 shrink-0"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>

        {/* Filtres Tous / Disponibles / Indisponibles */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg shrink-0 text-xs">
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'AVAILABLE', label: 'Disponibles' },
            { id: 'UNAVAILABLE', label: 'Indisponibles' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setAvailabilityFilter(f.id as any);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                availabilityFilter === f.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Books Table - Remplissant la hauteur avec pagination en bas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Chargement des ouvrages...</div>
        ) : paginatedBooks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-1">
            <BookOpen className="w-8 h-8 text-slate-400 stroke-1" />
            <p className="font-semibold text-slate-700">Aucun livre trouvé</p>
            <p>Essayez d'ajuster vos critères de recherche.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                  <th className="py-2.5 px-3">Ouvrage</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3">Année / ISBN</th>
                  <th className="py-2.5 px-3 text-center">Exemplaires</th>
                  <th className="py-2.5 px-3 text-center">Disponibilité</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBooks.map(book => {
                  const available = book.availableCopies || 0;
                  const total = book.totalCopies || 0;
                  return (
                    <tr key={book.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug truncate">{book.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{book.author}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-700 text-[11px]">{book.categoryName}</span>
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        <div>{book.publicationYear}</div>
                        <div className="font-mono text-[9px] text-slate-400">{book.isbn || 'N/A'}</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenCopies(book)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded transition-colors border border-sky-200"
                          title="Gérer les exemplaires physiques"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{total} ex.</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge
                          type="availability"
                          value={available > 0 ? 'AVAILABLE' : 'BORROWED'}
                          count={available}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(book)}
                          className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors"
                          title="Modifier la notice"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination compacte en bas de carte */}
        <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <span>
            Page {currentPage} / {totalPages} ({filteredBooks.length} ouvrage{filteredBooks.length > 1 ? 's' : ''})
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

      {/* MODAL : GESTION DES EXEMPLAIRES DU LIVRE */}
      <Modal
        isOpen={!!managingCopiesBook}
        onClose={() => setManagingCopiesBook(null)}
        title={`Exemplaires physiques · ${managingCopiesBook?.title || ''}`}
        subtitle="Enregistrez et gérez les unités physiques portant un code-barres unique."
        maxWidth="xl"
      >
        <div className="space-y-5 text-xs">
          {copyError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{copyError}</span>
            </div>
          )}

          {/* Form to add a new physical copy */}
          <form onSubmit={handleAddCopy} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="font-bold text-slate-800 text-xs">Ajouter un nouvel exemplaire physique</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Code-barres unique</label>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={e => setNewBarcode(e.target.value)}
                  required
                  placeholder="EST-GL-..."
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Emplacement (Rayon)</label>
                <input
                  type="text"
                  value={newShelf}
                  onChange={e => setNewShelf(e.target.value)}
                  required
                  placeholder="Salle / Rayon / Étagère"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">État physique</label>
                <select
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                >
                  <option value="NEW">Neuf</option>
                  <option value="GOOD">Bon état</option>
                  <option value="FAIR">Passable</option>
                  <option value="DAMAGED">Dégradé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded transition-colors"
              >
                + Enregistrer l'exemplaire
              </button>
            </div>
          </form>

          {/* Existing copies table */}
          <div>
            <div className="font-bold text-slate-800 mb-2">Exemplaires actuellement inventoriés ({bookCopies.length})</div>
            {bookCopies.length === 0 ? (
              <p className="text-slate-400 italic py-2">Aucun exemplaire pour cet ouvrage.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {bookCopies.map(cp => (
                  <div key={cp.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{cp.barcode}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Emplacement : {cp.locationShelf} · État : {cp.condition}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge type="copyStatus" value={cp.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL : EDITER L'OUVRAGE */}
      <Modal
        isOpen={!!editingBook}
        onClose={() => setEditingBook(null)}
        title="Modifier la notice du livre"
        maxWidth="lg"
      >
        {editingBook && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Titre de l'ouvrage</label>
              <input
                type="text"
                value={editFormData.title || ''}
                onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Auteur</label>
                <input
                  type="text"
                  value={editFormData.author || ''}
                  onChange={e => setEditFormData({ ...editFormData, author: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={editFormData.categoryId || ''}
                  onChange={e => setEditFormData({ ...editFormData, categoryId: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Année de publication</label>
                <input
                  type="number"
                  value={editFormData.publicationYear || ''}
                  onChange={e => setEditFormData({ ...editFormData, publicationYear: parseInt(e.target.value, 10) })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={editFormData.isbn || ''}
                  onChange={e => setEditFormData({ ...editFormData, isbn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Résumé</label>
              <textarea
                rows={3}
                value={editFormData.summary || ''}
                onChange={e => setEditFormData({ ...editFormData, summary: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-slate-700"
              >
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-sky-700 text-white rounded-lg font-bold">
                Enregistrer les modifications
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
