import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { booksApi, searchHistoryApi, loanRequestsApi, SearchSuggestion } from '../../services/api';
import { Book, SearchHistory } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  History,
  BookOpen,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  Trash2,
  BookmarkCheck,
  RotateCcw,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Send,
  Sparkles,
  Tag,
  Hash,
  X,
} from 'lucide-react';

interface StudentHomeProps {
  onGoToMyLoans: () => void;
  onGoToMyRequests: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({ onGoToMyLoans, onGoToMyRequests }) => {
  const { user, student } = useAuth();

  // Active tab: 'search' | 'history'
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');

  // Search input and submission state
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // History state
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Book Details Modal state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Online loan request workflow state
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    reasons: string[];
    activeLoansCount?: number;
    pendingRequestsCount?: number;
    maxLoans?: number;
  } | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');
  const [requestErrorMessage, setRequestErrorMessage] = useState('');

  // 1. Initial empty state: only load history, do NOT fetch catalog at startup
  useEffect(() => {
    loadHistory();
  }, [student?.id]);

  // 2. Auto-focus on load and when switching to 'search' tab
  useEffect(() => {
    if (activeTab === 'search') {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Click outside listener to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const loadHistory = async () => {
    if (!student?.id) {
      setSearchHistory([]);
      return;
    }
    try {
      setIsLoadingHistory(true);
      const hist = await searchHistoryApi.get();
      setSearchHistory(hist);
    } catch (e) {
      console.error('Erreur chargement historique:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 3. Debounced suggestion fetching (250 ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setActiveSuggestionIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await booksApi.getSuggestions(trimmed);
        setSuggestions(data.slice(0, 6));
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Erreur suggestions:', err);
      }
    }, 250);
  };

  // 4. Validate and execute search (only on submit, click search or click suggestion)
  const validateSearch = async (term: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setIsDropdownOpen(false);
    setActiveSuggestionIndex(-1);

    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    setSearchQuery(cleanTerm);
    setLastSearchedQuery(cleanTerm);
    setHasSearched(true);
    setIsSearching(true);

    try {
      const results = await booksApi.getAll({ query: cleanTerm });
      setSearchResults(results);

      // 5. Enregistre dans « Historique de recherche » uniquement les recherches validées
      if (student?.id) {
        await searchHistoryApi.add({
          queryText: cleanTerm,
          categoryId: null,
          resultsCount: results.length,
        });
        loadHistory();
      }
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDropdownOpen && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      validateSearch(suggestions[activeSuggestionIndex].text);
    } else {
      validateSearch(searchQuery);
    }
  };

  const handleSelectSuggestion = (term: string) => {
    validateSearch(term);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchQuery('');
    setLastSearchedQuery('');
    setHasSearched(false);
    setSearchResults([]);
    setSuggestions([]);
    setIsDropdownOpen(false);
    setActiveSuggestionIndex(-1);
    searchInputRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen && searchQuery.trim().length >= 2) {
        setIsDropdownOpen(true);
        return;
      }
      if (suggestions.length > 0) {
        setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveSuggestionIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      if (isDropdownOpen && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        validateSearch(suggestions[activeSuggestionIndex].text);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleRelaunchSearch = (queryText: string) => {
    setActiveTab('search');
    validateSearch(queryText);
  };

  const handleClearHistory = async () => {
    try {
      await searchHistoryApi.clear();
      setSearchHistory([]);
    } catch (e) {
      console.error('Erreur suppression historique:', e);
    }
  };

  // Helper to highlight matched query part in bold
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    return (
      <span className="truncate">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <strong key={i} className="font-extrabold text-slate-900">
              {part}
            </strong>
          ) : (
            <span key={i} className="font-normal text-slate-700">
              {part}
            </span>
          )
        )}
      </span>
    );
  };

  const handleOpenDetails = async (book: Book) => {
    setIsLoadingDetails(true);
    setSelectedBook(book);
    setEligibility(null);
    setRequestErrorMessage('');
    setRequestSuccessMessage('');

    try {
      const full = await booksApi.getById(book.id);
      setSelectedBook(full);

      // Pre-check student eligibility if student logged in
      if (student?.id) {
        setIsCheckingEligibility(true);
        const elig = await loanRequestsApi.checkEligibility(student.id, book.id);
        setEligibility(elig);
      }
    } catch (e) {
      console.error('Erreur récupération détails:', e);
    } finally {
      setIsLoadingDetails(false);
      setIsCheckingEligibility(false);
    }
  };

  const handleInitiateRequest = () => {
    setRequestErrorMessage('');
    setRequestNotes('');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRequestSubmit = async () => {
    if (!selectedBook) return;
    try {
      setIsSubmittingRequest(true);
      setRequestErrorMessage('');
      await loanRequestsApi.create({
        bookId: selectedBook.id,
        notes: requestNotes.trim() || undefined,
      });

      setIsConfirmModalOpen(false);
      setRequestSuccessMessage('Votre demande d\'emprunt a été envoyée au gérant avec succès !');

      // Refresh book details & eligibility
      const updatedBook = await booksApi.getById(selectedBook.id);
      setSelectedBook(updatedBook);
      if (student?.id) {
        const elig = await loanRequestsApi.checkEligibility(student.id, selectedBook.id);
        setEligibility(elig);
      }
    } catch (err: any) {
      setRequestErrorMessage(err.response?.data?.error || err.message || 'Erreur lors de la soumission de la demande');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
      {/* Panneau principal de recherche directement sous la barre de navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden">
        {/* En-tête des deux onglets */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'search'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              Catalogue & Recherche
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'border-sky-600 text-sky-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              Historique de recherche
            </button>
          </div>
        </div>

        {/* Corps du conteneur selon l'onglet */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          {/* ONGLET 1 : RECHERCHER */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col space-y-4">
              <form onSubmit={handleFormSubmit} className="space-y-1.5 shrink-0">
                <label htmlFor="search-input" className="block text-[11px] font-bold text-slate-700">
                  Recherche multicritères (Titre, Auteur, Sujet, Mot-clé)
                </label>
                <div ref={searchContainerRef} className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      id="search-input"
                      type="text"
                      role="combobox"
                      aria-expanded={isDropdownOpen}
                      aria-controls="search-suggestions-list"
                      aria-autocomplete="list"
                      aria-activedescendant={
                        activeSuggestionIndex >= 0 ? `suggestion-option-${activeSuggestionIndex}` : undefined
                      }
                      value={searchQuery}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (searchQuery.trim().length >= 2) {
                          setIsDropdownOpen(true);
                        }
                      }}
                      placeholder="Ex : Conception Logicielle, TCP/IP, Algorithmique, Prof. Bennani..."
                      autoFocus
                      className="w-full pl-9 pr-12 py-2.5 min-h-[44px] text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 focus:bg-white text-slate-900 transition-colors shadow-2xs"
                    />

                    {/* Bouton Effacer (croix) dans la barre */}
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        aria-label="Effacer la recherche"
                        title="Effacer la recherche"
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Liste déroulante des suggestions (dès 2 caractères) */}
                    {isDropdownOpen && searchQuery.trim().length >= 2 && (
                      <ul
                        id="search-suggestions-list"
                        role="listbox"
                        aria-label="Suggestions de recherche"
                        className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 overflow-hidden"
                      >
                        {suggestions.length === 0 ? (
                          <li
                            role="option"
                            aria-disabled="true"
                            className="min-h-[44px] px-3.5 py-2.5 text-xs text-slate-500 italic flex items-center"
                          >
                            Aucune suggestion, appuyez sur Entrée pour rechercher
                          </li>
                        ) : (
                          suggestions.map((sugg, index) => {
                            const isSelected = activeSuggestionIndex === index;
                            return (
                              <li
                                key={sugg.id}
                                id={`suggestion-option-${index}`}
                                role="option"
                                aria-selected={isSelected}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleSelectSuggestion(sugg.text);
                                }}
                                onMouseEnter={() => setActiveSuggestionIndex(index)}
                                className={`min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-sky-50 text-sky-950 font-medium'
                                    : 'hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate mr-3">
                                  {sugg.type === 'TITLE' && <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />}
                                  {sugg.type === 'AUTHOR' && <User className="w-4 h-4 text-emerald-600 shrink-0" />}
                                  {sugg.type === 'SUBJECT' && <Tag className="w-4 h-4 text-indigo-600 shrink-0" />}
                                  {sugg.type === 'KEYWORD' && <Hash className="w-4 h-4 text-amber-600 shrink-0" />}
                                  <span className="truncate">
                                    {renderHighlightedText(sugg.text, searchQuery)}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                                  {sugg.typeLabel}
                                </span>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 min-h-[44px] text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    {isSearching ? 'Recherche...' : 'Rechercher'}
                  </button>
                </div>
              </form>

              {/* RÉSULTATS DE RECHERCHE */}
              {!hasSearched ? (
                /* 1. ÉTAT INITIAL VIDE : aucun livre, aucun compteur */
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                    <Search className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Commencez votre recherche
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Saisissez un titre, un auteur, un sujet ou un mot-clé pour trouver un ouvrage.
                  </p>
                </div>
              ) : isSearching ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 p-8">
                  <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-slate-600">Recherche des ouvrages en cours...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50 p-8">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                    <Search className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Aucun ouvrage trouvé pour « {lastSearchedQuery} »
                  </p>
                  <p className="text-[11px] text-slate-500 text-center max-w-md">
                    Essayez de modifier votre recherche, de vérifier l'orthographe ou d'utiliser d'autres mots-clés (auteur, sujet).
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1.5 border-b border-slate-100 shrink-0">
                    <span className="font-bold text-slate-800">Résultats ({searchResults.length})</span>
                    <span className="hidden sm:inline">Disponibilité calculée en temps réel d’après les exemplaires physiques</span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {searchResults.map(book => {
                        const isAvailable = (book.availableCopies || 0) > 0;
                        return (
                          <div
                            key={book.id}
                            className="bg-white border border-slate-200 rounded-lg p-3 hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-1">
                                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide truncate">
                                  {book.categoryName}
                                </span>
                                <StatusBadge
                                  type="availability"
                                  value={isAvailable ? 'AVAILABLE' : 'BORROWED'}
                                  count={book.availableCopies}
                                />
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                {book.title}
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {book.author} · {book.publicationYear}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-mono text-[10px] truncate max-w-[110px]">
                                {book.isbn || 'N/A'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(book)}
                                className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
                              >
                                Détails & Demande
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : HISTORIQUE */}
          {activeTab === 'history' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Vos recherches récentes</h3>
                  <p className="text-[11px] text-slate-500">
                    Relancez rapidement une recherche précédente en un clic.
                  </p>
                </div>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Effacer l'historique
                  </button>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-500">Chargement de l’historique...</div>
              ) : searchHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  <p className="text-xs">Aucune recherche récente enregistrée.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {searchHistory.map(item => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <History className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-800 truncate block">« {item.queryText} »</span>
                          <div className="text-[10px] text-slate-400">
                            {item.resultsCount} résultat(s) · {new Date(item.searchedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRelaunchSearch(item.queryText)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 rounded transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Relancer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DÉTAILS DU LIVRE AVEC DEMANDE D'EMPRUNT EN LIGNE */}
      <Modal
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        title={selectedBook?.title || 'Notice bibliographique'}
        subtitle={`Auteur : ${selectedBook?.author || ''} · Année : ${selectedBook?.publicationYear || ''}`}
        maxWidth="lg"
      >
        {selectedBook && (
          <div className="space-y-4 text-xs text-slate-700">
            {requestSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{requestSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBook(null);
                    onGoToMyRequests();
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                >
                  Voir mes demandes
                </button>
              </div>
            )}

            {requestErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{requestErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sky-800 uppercase tracking-wide">
                {selectedBook.categoryName}
              </span>
              <StatusBadge
                type="availability"
                value={(selectedBook.availableCopies || 0) > 0 ? 'AVAILABLE' : 'BORROWED'}
                count={selectedBook.availableCopies}
              />
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Résumé officiel</span>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {selectedBook.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Éditeur</span>
                <span className="font-semibold text-slate-800">{selectedBook.publisher || 'Non renseigné'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">ISBN</span>
                <span className="font-mono font-semibold text-slate-800">{selectedBook.isbn || 'Non renseigné'}</span>
              </div>
            </div>

            {/* ÉLIGIBILITÉ & BOUTON DEMANDER UN EMPRUNT EN LIGNE */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-slate-900 text-xs">
                    Demande d'emprunt en ligne
                  </span>
                </div>
                {eligibility && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      eligibility.eligible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {eligibility.eligible ? 'Éligible pour emprunt' : 'Emprunt bloqué'}
                  </span>
                )}
              </div>

              {!student?.id ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                  Session Google vérifiée sans dossier bibliothèque enregistré en base : la consultation du catalogue est ouverte, mais les demandes d'emprunt en ligne nécessitent la disponibilité de la base de données.
                </div>
              ) : isCheckingEligibility ? (
                <p className="text-xs text-slate-500">Vérification de votre éligibilité en cours...</p>
              ) : eligibility && !eligibility.eligible ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5 text-rose-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Vous ne pouvez pas demander cet ouvrage pour les motifs suivants :</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1">
                    {eligibility.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Quota actuel : {eligibility.activeLoansCount || 0} emprunt(s) + {eligibility.pendingRequestsCount || 0} demande(s) / {eligibility.maxLoans || 3} maximum autorisés.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <p className="text-slate-600">
                    Vous avez droit à cet emprunt. Le gérant réservera un exemplaire physique après validation de votre demande.
                  </p>
                  <button
                    type="button"
                    onClick={handleInitiateRequest}
                    disabled={(selectedBook.availableCopies || 0) <= 0}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors shadow-2xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Demander l'emprunt
                  </button>
                </div>
              )}
            </div>

            {/* Liste des exemplaires physiques */}
            <div className="pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-900 block mb-2">
                Exemplaires physiques inventoriés ({selectedBook.copies?.length || selectedBook.totalCopies || 0})
              </span>
              <div className="space-y-2">
                {selectedBook.copies && selectedBook.copies.length > 0 ? (
                  selectedBook.copies.map(copy => (
                    <div
                      key={copy.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-slate-800 flex items-center gap-2">
                          <span>{copy.barcode}</span>
                          <span className="text-[10px] font-sans font-normal text-slate-500">
                            (État: {copy.condition})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{copy.locationShelf}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          copy.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : copy.status === 'RESERVED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {copy.status === 'AVAILABLE'
                          ? 'En rayon (Disponible)'
                          : copy.status === 'RESERVED'
                          ? 'Réservé en ligne'
                          : 'Emprunté'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">Aucun détail d'exemplaire chargé.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL DE CONFIRMATION AVANT TRANSMISSION DE LA DEMANDE D'EMPRUNT */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmation de la Demande d'Emprunt"
        subtitle="Vérifiez les éléments récapitulatifs avant l'envoi au responsable de bibliothèque."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Ouvrage demandé :</span>
              <span className="font-bold text-slate-900 text-right max-w-xs">{selectedBook?.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Auteur & Année :</span>
              <span className="font-semibold text-slate-800">{selectedBook?.author} ({selectedBook?.publicationYear})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Étudiant demandeur :</span>
              <span className="font-semibold text-slate-800">{user?.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">CNE & Filière :</span>
              <span className="font-mono font-semibold text-slate-800">{student?.studentIdNumber} · {student?.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Date & Heure :</span>
              <span className="text-slate-700">{new Date().toLocaleString('fr-FR')}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Remarque facultative pour le gérant (ex : besoin pour TP, recherche, exposé...)
            </label>
            <input
              type="text"
              value={requestNotes}
              onChange={e => setRequestNotes(e.target.value)}
              placeholder="Ex : Ouvrage requis pour le module de Génie Logiciel..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-900 text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Après validation par le gérant, un exemplaire vous sera réservé pour une durée de <strong>48 heures</strong>. Vous devrez vous présenter au comptoir de la bibliothèque EST Fès pour le récupérer.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmRequestSubmit}
              disabled={isSubmittingRequest}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittingRequest ? 'Envoi en cours...' : 'Confirmer et envoyer la demande'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
