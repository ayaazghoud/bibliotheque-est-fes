import React, { useState, useEffect, useRef } from 'react';
import { booksApi, categoriesApi, copiesApi, bibliographicApi } from '../../services/api';
import { Category, Book, BibliographicCandidate, CopyCondition } from '../../types';
import { useCamera } from '../../hooks/useCamera';
import {
  BookOpen,
  Camera,
  ScanLine,
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
  Plus,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Globe,
  Barcode,
  ExternalLink,
  X,
  ShieldAlert,
  Copy,
  Sliders,
  CheckCircle2,
  HelpCircle,
  RotateCw,
} from 'lucide-react';

interface AddBookPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type IdentificationMethod = 'cover' | 'isbn' | 'search' | 'manual';

export const AddBookPage: React.FC<AddBookPageProps> = ({ onSuccess, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeMethod, setActiveMethod] = useState<IdentificationMethod>('cover');

  // Form data for the book bibliographic record
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    author: '',
    categoryId: '',
    publicationYear: '2024',
    publisher: '',
    isbn: '',
    language: 'Français',
    summary: '',
    coverImageUrl: '',
  });

  // Physical copies configuration
  const [createCopies, setCreateCopies] = useState(true);
  const [copiesCount, setCopiesCount] = useState(1);
  const [shelfLocation, setShelfLocation] = useState('Salle Informatique - Rayon A1 - Étagère 1');
  const [copyCondition, setCopyCondition] = useState<CopyCondition>('NEW');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);

  // Duplicate check state
  const [duplicateBook, setDuplicateBook] = useState<Book | null>(null);
  const [duplicateCopiesCount, setDuplicateCopiesCount] = useState<number>(0);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showAddCopiesOnlyModal, setShowAddCopiesOnlyModal] = useState(false);

  // Online search state (Method C)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [searchResults, setSearchResults] = useState<BibliographicCandidate[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // ISBN Scanner state (Method B)
  const [isbnInput, setIsbnInput] = useState('');
  const [isbnValidation, setIsbnValidation] = useState<{ valid: boolean; format: string }>({
    valid: false,
    format: '',
  });
  const [isSearchingIsbn, setIsSearchingIsbn] = useState(false);

  // Cover Scanner & OCR state (Method A)
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [titlePageImage, setTitlePageImage] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'cover' | 'titlePage'>('cover');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Universal camera hook
  const {
    videoRef,
    isCameraActive,
    isStarting: isCameraStarting,
    cameraError,
    availableDevices,
    selectedDeviceId,
    startCamera: launchCameraDevice,
    stopCamera,
    capturePhoto: snapCameraPhoto,
    switchCamera,
  } = useCamera({
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
  });

  const startCamera = (mode: 'cover' | 'titlePage') => {
    setCameraMode(mode);
    launchCameraDevice();
  };

  const capturePhoto = () => {
    const photo = snapCameraPhoto();
    if (photo) {
      if (cameraMode === 'cover') {
        setCoverImage(photo);
      } else {
        setTitlePageImage(photo);
      }
    }
    stopCamera();
  };

  // Clean up camera stream when leaving page
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // General page status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Initial Load: categories
  useEffect(() => {
    categoriesApi.getAll().then(cats => {
      setCategories(cats);
      if (cats.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: cats[0].id.toString() }));
        generateBarcodesForCount(1, cats[0].code);
      }
    });
  }, []);

  // Update barcode suggestions whenever category or copies count changes
  const generateBarcodesForCount = (count: number, catCode?: string) => {
    const code = catCode || getCurrentCategoryCode();
    const baseNum = Math.floor(100 + Math.random() * 850);
    const suffixes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const newBarcodes: string[] = [];
    for (let i = 0; i < count; i++) {
      const suffix = suffixes[i] || `X${i + 1}`;
      newBarcodes.push(`EST-${code}-${baseNum}-${suffix}`);
    }
    setGeneratedBarcodes(newBarcodes);
  };

  const getCurrentCategoryCode = (): string => {
    const cat = categories.find(c => c.id.toString() === formData.categoryId);
    return cat ? cat.code : 'GL';
  };

  const handleCategoryChange = (catIdStr: string) => {
    setFormData(prev => ({ ...prev, categoryId: catIdStr }));
    const cat = categories.find(c => c.id.toString() === catIdStr);
    if (cat) {
      generateBarcodesForCount(copiesCount, cat.code);
    }
  };

  const handleCopiesCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setCopiesCount(validCount);
    generateBarcodesForCount(validCount);
  };

  // 2. Real-time ISBN duplicate check
  const checkIsbnDuplicate = async (rawIsbn: string) => {
    const cleaned = rawIsbn.trim();
    if (cleaned.length < 9) {
      setDuplicateBook(null);
      setDuplicateCopiesCount(0);
      return;
    }

    try {
      setIsCheckingDuplicate(true);
      const res = await booksApi.checkDuplicate(cleaned);
      if (res.exists && res.book) {
        setDuplicateBook(res.book);
        setDuplicateCopiesCount(res.copiesCount || 0);
      } else {
        setDuplicateBook(null);
        setDuplicateCopiesCount(0);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleIsbnInputChange = (val: string) => {
    setFormData(prev => ({ ...prev, isbn: val }));
    checkIsbnDuplicate(val);
  };

  // 3. Populate form from a selected candidate
  const applyCandidateToForm = (c: BibliographicCandidate) => {
    // Map suggested category
    let mappedCatId = formData.categoryId;
    if (c.suggestedCategoryCode) {
      const matchedCat = categories.find(cat => cat.code === c.suggestedCategoryCode);
      if (matchedCat) {
        mappedCatId = matchedCat.id.toString();
      }
    }

    const cleanIsbn = c.isbn13 || c.isbn || c.isbn10 || '';

    setFormData({
      title: c.title || '',
      subtitle: c.subtitle || '',
      author: c.authors.join(', ') || '',
      categoryId: mappedCatId,
      publicationYear: c.publicationYear ? c.publicationYear.toString() : '2024',
      publisher: c.publisher || '',
      isbn: cleanIsbn,
      language: c.language || 'Français',
      summary: c.description || `Ouvrage scientifique et technique de référence : ${c.title}`,
      coverImageUrl: c.coverImageUrl || '',
    });

    if (cleanIsbn) {
      checkIsbnDuplicate(cleanIsbn);
    }

    // Regenerate internal barcodes
    const cat = categories.find(cat => cat.id.toString() === mappedCatId);
    generateBarcodesForCount(copiesCount, cat?.code);

    setSuccessMsg(`Informations bibliographiques de « ${c.title} » importées avec succès !`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // -----------------------------------------------------------
  // METHOD A: SCAN COVER (Camera & Gemini OCR)
  // -----------------------------------------------------------

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'cover' | 'titlePage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (target === 'cover') {
          setCoverImage(reader.result);
        } else {
          setTitlePageImage(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLaunchCoverOcr = async () => {
    if (!coverImage) {
      setOcrError("Veuillez d'abord prendre une photo ou importer l'image de la couverture.");
      return;
    }

    try {
      setIsProcessingOcr(true);
      setOcrError('');
      const res = await bibliographicApi.scanCoverOcr({
        imageCoverBase64: coverImage,
        imageTitlePageBase64: titlePageImage || undefined,
      });

      if (res.candidates && res.candidates.length > 0) {
        setSearchResults(res.candidates);
        setHasSearched(true);
        // Pre-fill form with top candidate or direct extraction
        applyCandidateToForm(res.candidates[0]);
      } else {
        // Fallback to raw extracted data if no remote catalogue match
        const ext = res.extracted;
        setFormData(prev => ({
          ...prev,
          title: ext.title || prev.title,
          subtitle: ext.subtitle || prev.subtitle,
          author: ext.authors?.join(', ') || prev.author,
          publisher: ext.publisher || prev.publisher,
          publicationYear: ext.publicationYear ? ext.publicationYear.toString() : prev.publicationYear,
          isbn: ext.isbn || prev.isbn,
          coverImageUrl: coverImage,
        }));
        if (ext.isbn) checkIsbnDuplicate(ext.isbn);
      }

      if (res.duplicateInLibrary) {
        setDuplicateBook(res.duplicateInLibrary);
        setDuplicateCopiesCount(res.duplicateInLibrary.totalCopies || 0);
      }
    } catch (err: any) {
      setOcrError(err.response?.data?.error || err.message || 'Erreur lors de la reconnaissance de la couverture.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Sample covers generator for 1-click test simulation
  const handleLoadSampleCover = (
    sampleType: 'clean_code' | 'design_patterns' | 'uml_action' | 'duplicate_bennani'
  ) => {
    stopCamera();
    let svg = '';
    if (sampleType === 'clean_code') {
      svg = createSampleBookSvg(
        'Clean Code',
        'A Handbook of Agile Software Craftsmanship',
        'Robert C. Martin',
        'Prentice Hall',
        '9780132350884',
        '#003366'
      );
    } else if (sampleType === 'design_patterns') {
      svg = createSampleBookSvg(
        'Design Patterns',
        'Elements of Reusable Object-Oriented Software',
        'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
        'Addison-Wesley',
        '9780201633610',
        '#1E3A8A'
      );
    } else if (sampleType === 'uml_action') {
      svg = createSampleBookSvg(
        'UML 2 en action',
        'De l’analyse des besoins à la conception',
        'Pascal Roques',
        'Eyrolles',
        '9782212121049',
        '#047857'
      );
    } else {
      // Duplicate Bennani already in database (ID: 1, ISBN: 978-2-10-081234-1)
      svg = createSampleBookSvg(
        'Conception et Architecture Logicielle avec UML et Design Patterns',
        'Modélisation objet avancée et architecture hexagonale',
        'Prof. Ahmed Bennani',
        'Dunod Informatique',
        '978-2-10-081234-1',
        '#B91C1C'
      );
    }
    setCoverImage(svg);
  };

  const createSampleBookSvg = (
    title: string,
    subtitle: string,
    author: string,
    publisher: string,
    isbn: string,
    color: string
  ) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700">
      <defs>
        <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="500" height="700" rx="16" fill="url(#bookGrad)"/>
      <rect x="25" y="25" width="450" height="650" rx="8" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>
      
      <!-- Top header -->
      <text x="250" y="80" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" letter-spacing="2">BIBLIOTHÈQUE EST FÈS · USMBA</text>
      
      <!-- Title box -->
      <text x="250" y="200" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="800" fill="#ffffff">${title.slice(0, 32)}</text>
      ${title.length > 32 ? `<text x="250" y="235" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="700" fill="#ffffff">${title.slice(32, 65)}</text>` : ''}
      
      <!-- Subtitle -->
      <text x="250" y="280" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#cbd5e1">${subtitle.slice(0, 50)}</text>
      
      <!-- Author -->
      <circle cx="250" cy="380" r="45" fill="#ffffff" fill-opacity="0.1"/>
      <text x="250" y="470" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#f8fafc">${author}</text>
      <text x="250" y="495" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#94a3b8">Édition Académique Certifiée</text>

      <!-- Bottom Publisher & ISBN -->
      <rect x="50" y="580" width="400" height="70" rx="8" fill="#ffffff" fill-opacity="0.08"/>
      <text x="70" y="610" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff">${publisher}</text>
      <text x="70" y="632" font-family="monospace" font-size="12" fill="#38bdf8">ISBN : ${isbn}</text>
    </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  // -----------------------------------------------------------
  // METHOD B: SCAN / INPUT ISBN
  // -----------------------------------------------------------
  const handleIsbnScanOrType = (val: string) => {
    setIsbnInput(val);
    const check = bibliographicApi.validateIsbn(val);
    setIsbnValidation({ valid: check.valid, format: check.format });
    if (check.valid) {
      handleSearchByIsbn(check.cleaned);
    }
  };

  const handleSearchByIsbn = async (cleanIsbnToSearch?: string) => {
    const targetIsbn = cleanIsbnToSearch || isbnInput.trim();
    if (!targetIsbn) return;

    try {
      setIsSearchingIsbn(true);
      setErrorMsg('');
      const res = await bibliographicApi.search({ isbn: targetIsbn });
      setSearchResults(res.candidates);
      setHasSearched(true);
      if (res.candidates.length > 0) {
        applyCandidateToForm(res.candidates[0]);
      } else {
        // Just fill the ISBN in form
        setFormData(prev => ({ ...prev, isbn: targetIsbn }));
        checkIsbnDuplicate(targetIsbn);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de la recherche ISBN');
    } finally {
      setIsSearchingIsbn(false);
    }
  };

  // -----------------------------------------------------------
  // METHOD C: ONLINE CATALOG SEARCH
  // -----------------------------------------------------------
  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearchingOnline(true);
      setErrorMsg('');
      const res = await bibliographicApi.search({ q: searchQuery.trim() });
      setSearchResults(res.candidates);
      setHasSearched(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de la recherche dans les catalogues');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // -----------------------------------------------------------
  // SUBMIT / REGISTER NEW BOOK OR ADD COPIES TO EXISTING
  // -----------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // If duplicate detected, prevent accidental duplicate creation
    if (duplicateBook) {
      setErrorMsg(
        `Un ouvrage possédant déjà l'ISBN ${formData.isbn} est déjà inscrit au catalogue (ID: #${duplicateBook.id}). Utilisez le bouton ci-dessous pour ajouter de nouveaux exemplaires à cet ouvrage existant.`
      );
      return;
    }

    if (!formData.title.trim() || !formData.author.trim() || !formData.categoryId || !formData.summary.trim()) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires marqués d’une étoile (*).');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create the book in MySQL / local database
      const fullTitle = formData.subtitle.trim()
        ? `${formData.title.trim()} : ${formData.subtitle.trim()}`
        : formData.title.trim();

      const createdBook = await booksApi.create({
        title: fullTitle,
        subtitle: formData.subtitle.trim() || undefined,
        author: formData.author.trim(),
        categoryId: parseInt(formData.categoryId, 10),
        publicationYear: parseInt(formData.publicationYear, 10),
        publisher: formData.publisher.trim() || undefined,
        isbn: formData.isbn.trim() || undefined,
        summary: formData.summary.trim(),
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        language: formData.language.trim() || undefined,
      });

      // 2. Create the physical copies if requested
      if (createCopies && generatedBarcodes.length > 0) {
        const copiesPayload = generatedBarcodes.map(barcode => ({
          barcode,
          locationShelf: shelfLocation.trim(),
          condition: copyCondition,
        }));
        await copiesApi.createBatch(createdBook.id, copiesPayload);
      }

      setSuccessMsg(
        `L'ouvrage « ${createdBook.title} » et ses ${createCopies ? generatedBarcodes.length : 0} exemplaire(s) ont été enregistrés avec succès dans MySQL !`
      );

      setTimeout(() => {
        onSuccess();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement de l'ouvrage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Add copies to the existing duplicate book directly
  const handleAddCopiesToExistingBook = async () => {
    if (!duplicateBook) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const copiesPayload = generatedBarcodes.map(barcode => ({
        barcode,
        locationShelf: shelfLocation.trim(),
        condition: copyCondition,
      }));

      await copiesApi.createBatch(duplicateBook.id, copiesPayload);

      setSuccessMsg(
        `${generatedBarcodes.length} nouvel(aux) exemplaire(s) ont été rattachés avec succès à l'ouvrage existant « ${duplicateBook.title} » !`
      );

      setTimeout(() => {
        onSuccess();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Erreur lors de l'ajout des exemplaires.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la gestion des livres
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-700" />
            Ajout Intelligent d'un Ouvrage au Catalogue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Numérisation de couverture par caméra, détection OCR, recherche bibliographique en ligne (Google Books / Open Library) et génération des exemplaires physiques
          </p>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Top Method Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-2 lg:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setActiveMethod('cover')}
          className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
            activeMethod === 'cover'
              ? 'bg-sky-50 border border-sky-300 text-sky-900 shadow-2xs'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              activeMethod === 'cover' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Méthode A : Couverture</div>
            <div className="text-[11px] text-slate-500">Scan photo & OCR visuel</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMethod('isbn')}
          className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
            activeMethod === 'isbn'
              ? 'bg-sky-50 border border-sky-300 text-sky-900 shadow-2xs'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              activeMethod === 'isbn' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Méthode B : Scanner ISBN</div>
            <div className="text-[11px] text-slate-500">Lecteur code-barres / Caméra</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMethod('search')}
          className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
            activeMethod === 'search'
              ? 'bg-sky-50 border border-sky-300 text-sky-900 shadow-2xs'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              activeMethod === 'search' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Méthode C : Recherche en ligne</div>
            <div className="text-[11px] text-slate-500">Google Books / Open Library</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMethod('manual')}
          className={`flex items-center gap-2.5 p-3 rounded-lg text-left transition-all ${
            activeMethod === 'manual'
              ? 'bg-sky-50 border border-sky-300 text-sky-900 shadow-2xs'
              : 'hover:bg-slate-50 text-slate-600'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              activeMethod === 'manual' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs">Saisie Manuelle</div>
            <div className="text-[11px] text-slate-500">Formulaire standard de secours</div>
          </div>
        </button>
      </div>

      {/* METHOD PANELS */}
      {/* Panel A: Scanner la couverture */}
      {activeMethod === 'cover' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-700" />
                Numérisation et Reconnaissance Visuelle de la Couverture
              </h2>
              <p className="text-[11px] text-slate-500">
                Prenez en photo la couverture ou importez une image. Le moteur OCR extrait le titre et l'auteur, puis interroge les catalogues mondiaux.
              </p>
            </div>
          </div>

          {/* Camera View or Captured Image Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Front Cover Container */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-700" />
                  Couverture du Livre (Recto) <span className="text-rose-500">*</span>
                </span>
                {coverImage && (
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {isCameraStarting && cameraMode === 'cover' ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-3/4 flex flex-col items-center justify-center p-4 text-center border-2 border-sky-500 text-white space-y-2">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-xs font-bold text-white">Démarrage de la caméra...</p>
                  <p className="text-[11px] text-slate-300">Veuillez autoriser l'accès au capteur</p>
                </div>
              ) : isCameraActive && cameraMode === 'cover' ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-3/4 flex items-center justify-center border-2 border-sky-500 shadow-md">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-8 border-2 border-dashed border-sky-400 rounded-lg pointer-events-none opacity-80" />

                  {/* Device Switcher if multiple webcams */}
                  {availableDevices.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                      <select
                        value={selectedDeviceId || ''}
                        onChange={e => switchCamera(e.target.value)}
                        className="text-[10px] text-white bg-transparent border-none focus:outline-none"
                      >
                        {availableDevices.map(d => (
                          <option key={d.deviceId} value={d.deviceId} className="text-slate-900">
                            {d.label || `Caméra ${d.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="absolute bottom-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Prendre la photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : coverImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-3/4 bg-slate-100 flex items-center justify-center p-2">
                  <img src={coverImage} alt="Couverture" className="max-h-full max-w-full object-contain rounded" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center aspect-3/4 flex flex-col items-center justify-center space-y-3 bg-slate-50">
                  <Camera className="w-8 h-8 text-slate-400" />
                  <p className="text-xs text-slate-600 font-semibold">Aucune couverture capturée</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera('cover')}
                      className="px-3 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Activer la caméra
                    </button>
                    <label className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer shadow-2xs flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Importer fichier
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, 'cover')}
                      />
                    </label>
                  </div>
                  {cameraError && cameraMode === 'cover' && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 text-left">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Optional Title Page Container (Page de titre / mentions légales) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  Page de titre / Mentions d'édition (Optionnel)
                </span>
                {titlePageImage && (
                  <button
                    type="button"
                    onClick={() => setTitlePageImage(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Effacer
                  </button>
                )}
              </div>

              {isCameraStarting && cameraMode === 'titlePage' ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-3/4 flex flex-col items-center justify-center p-4 text-center border-2 border-sky-500 text-white space-y-2">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-xs font-bold text-white">Démarrage de la caméra...</p>
                  <p className="text-[11px] text-slate-300">Veuillez autoriser l'accès au capteur</p>
                </div>
              ) : isCameraActive && cameraMode === 'titlePage' ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-3/4 flex items-center justify-center border-2 border-sky-500 shadow-md">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-8 border-2 border-dashed border-sky-400 rounded-lg pointer-events-none opacity-80" />

                  {/* Device Switcher if multiple webcams */}
                  {availableDevices.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                      <select
                        value={selectedDeviceId || ''}
                        onChange={e => switchCamera(e.target.value)}
                        className="text-[10px] text-white bg-transparent border-none focus:outline-none"
                      >
                        {availableDevices.map(d => (
                          <option key={d.deviceId} value={d.deviceId} className="text-slate-900">
                            {d.label || `Caméra ${d.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="absolute bottom-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Prendre la photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : titlePageImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-300 aspect-3/4 bg-slate-100 flex items-center justify-center p-2">
                  <img src={titlePageImage} alt="Page de titre" className="max-h-full max-w-full object-contain rounded" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center aspect-3/4 flex flex-col items-center justify-center space-y-3 bg-slate-50/50">
                  <HelpCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-xs text-slate-500">
                    Facultatif : utile si la couverture manque de détails (ISBN, copyright, maison d'édition).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera('titlePage')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Caméra
                    </button>
                    <label className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer">
                      Importer
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, 'titlePage')}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Samples Bar (1-Click Evaluation) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Échantillons d'évaluation (1-clic pour tester la reconnaissance sans webcam) :
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleLoadSampleCover('clean_code')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-300 rounded-md transition-colors"
              >
                1. Clean Code (Robert C. Martin)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleCover('design_patterns')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-300 rounded-md transition-colors"
              >
                2. Design Patterns (Gang of Four)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleCover('uml_action')}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-300 rounded-md transition-colors"
              >
                3. UML 2 en action (Pascal Roques)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleCover('duplicate_bennani')}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md transition-colors"
                title="Ouvrage déjà existant en base pour tester la détection de doublon"
              >
                4. Test Doublon : Bennani (UML)
              </button>
            </div>
          </div>

          {/* Action: Launch OCR */}
          <div className="flex items-center justify-between pt-2">
            {ocrError && <span className="text-xs text-rose-600 font-medium">{ocrError}</span>}
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                disabled={!coverImage || isProcessingOcr}
                onClick={handleLaunchCoverOcr}
                className="px-5 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-40 rounded-lg transition-colors shadow-2xs flex items-center gap-2"
              >
                {isProcessingOcr ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reconnaissance OCR & Recherche en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-200" />
                    <span>Analyser la couverture & Rechercher les fiches en ligne</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel B: Scanner le code ISBN */}
      {activeMethod === 'isbn' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-sky-700" />
              Saisie ou Scan du Code ISBN (ISBN-10 ou ISBN-13)
            </h2>
            <p className="text-[11px] text-slate-500">
              Scannez le code-barres ISBN avec votre lecteur ou saisissez les 10 ou 13 chiffres. La clé de contrôle est vérifiée en temps réel.
            </p>
          </div>

          <div className="max-w-2xl space-y-3">
            <label className="block font-semibold text-xs text-slate-700">
              Numéro ISBN du livre (ex: 9780132350884 ou 978-2-10-081234-1)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={isbnInput}
                  onChange={e => handleIsbnScanOrType(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchByIsbn();
                    }
                  }}
                  placeholder="Scanner au lecteur ou taper l'ISBN..."
                  className="w-full pl-9 pr-4 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchByIsbn()}
                disabled={isSearchingIsbn || !isbnInput.trim()}
                className="px-4 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {isSearchingIsbn ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Rechercher</span>
              </button>
            </div>

            {/* Validation badge */}
            {isbnInput.trim() && (
              <div className="flex items-center gap-2 text-xs">
                {isbnValidation.valid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {isbnValidation.format} valide (clé de contrôle conforme)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    ISBN en cours de saisie ou clé de contrôle non vérifiée
                  </span>
                )}
              </div>
            )}

            {/* Quick click ISBN tests */}
            <div className="pt-2 text-[11px] text-slate-500 space-x-2">
              <span className="font-semibold text-slate-600">Exemples rapides :</span>
              <button
                type="button"
                onClick={() => handleIsbnScanOrType('9780132350884')}
                className="text-sky-700 underline font-mono"
              >
                9780132350884 (Clean Code)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleIsbnScanOrType('9780201633610')}
                className="text-sky-700 underline font-mono"
              >
                9780201633610 (Design Patterns)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleIsbnScanOrType('978-2-10-081234-1')}
                className="text-rose-700 underline font-mono font-bold"
              >
                978-2-10-081234-1 (Doublon en base)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel C: Recherche Bibliographique en Ligne */}
      {activeMethod === 'search' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-700" />
              Recherche dans les Catalogues Mondiaux (Google Books & Open Library)
            </h2>
            <p className="text-[11px] text-slate-500">
              Interrogez directement les millions de notices bibliographiques par titre, nom d'auteur ou sujet d'enseignement.
            </p>
          </div>

          <form onSubmit={handleOnlineSearch} className="max-w-2xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ex : Réseaux TCP/IP Tanenbaum, Java UML, Algorithmique Cormen..."
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none bg-slate-50 focus:bg-white text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingOnline || !searchQuery.trim()}
              className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {isSearchingOnline ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Lancer la recherche</span>
            </button>
          </form>

          {/* Quick search suggestions */}
          <div className="text-[11px] text-slate-500 space-x-2">
            <span className="font-semibold text-slate-600">Recherches courantes EST :</span>
            {['Clean Code', 'Design Patterns GoF', 'UML 2 en action', 'Bases de données SQL', 'Réseaux informatiques'].map(
              term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setSearchQuery(term);
                    bibliographicApi.search({ q: term }).then(res => {
                      setSearchResults(res.candidates);
                      setHasSearched(true);
                    });
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* CANDIDATES RESULTS LIST (if searched or OCR triggered) */}
      {hasSearched && searchResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-700" />
              <span>{searchResults.length} ouvrage(s) trouvé(s) dans les catalogues bibliographiques</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Cliquez sur « Sélectionner » pour préremplir automatiquement la fiche bibliographique
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((cand, idx) => {
              const isDupl = !!cand.duplicateInLibrary;
              return (
                <div
                  key={cand.id || idx}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isDupl
                      ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-sky-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-22 rounded bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center border border-slate-300">
                      {cand.coverImageUrl ? (
                        <img
                          src={cand.coverImageUrl}
                          alt={cand.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <BookOpen className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Book text */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                        {cand.title}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-1">{cand.authors.join(', ')}</div>
                      <div className="text-[10px] text-slate-400">
                        {cand.publisher ? `${cand.publisher} · ` : ''}
                        {cand.publicationYear}
                      </div>
                      {cand.isbn && (
                        <div className="text-[10px] font-mono text-sky-700 font-medium">ISBN: {cand.isbn}</div>
                      )}
                    </div>
                  </div>

                  {/* Duplicate warning & Action */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                      {cand.source}
                    </span>
                    <button
                      type="button"
                      onClick={() => applyCandidateToForm(cand)}
                      className="px-3 py-1 bg-sky-700 hover:bg-sky-800 text-white font-bold text-[11px] rounded transition-colors shadow-2xs"
                    >
                      Sélectionner cet ouvrage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING BANNER (If ISBN already exists in Library) */}
      {duplicateBook && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-900 text-sm">
                Attention : Cet ouvrage est déjà présent dans le catalogue EST (Doublon détecté)
              </div>
              <p className="text-amber-800 mt-1">
                La notice bibliographique pour l'ISBN <span className="font-mono font-bold">{formData.isbn}</span> existe
                déjà sous le titre : <span className="font-bold">« {duplicateBook.title} »</span> (Auteur :{' '}
                {duplicateBook.author}, Catégorie : {duplicateBook.categoryName}).
              </p>
              <div className="mt-2 text-[11px] text-amber-800">
                Statut actuel : <span className="font-bold">{duplicateCopiesCount} exemplaire(s) physique(s)</span>{' '}
                référencé(s) dans la bibliothèque. Ne créez pas de deuxième notice bibliographique.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleAddCopiesToExistingBook}
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter {generatedBarcodes.length} exemplaire(s) à cet ouvrage existant</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN FORM: FICHE BIBLIOGRAPHIQUE PRÉREMPLIE & EXEMPLAIRES */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-8 text-xs">
        {/* Section 1: Informations Bibliographiques */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-700" />
              1. Fiche Bibliographique Officielle
            </h2>
            <span className="text-[11px] text-slate-500">
              Vérifiez et ajustez les informations détectées avant validation
            </span>
          </div>

          {/* Cover preview + Main Title */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Cover image preview box */}
            <div className="md:col-span-1 space-y-2">
              <label className="block font-semibold text-slate-700">Aperçu Couverture</label>
              <div className="w-full aspect-3/4 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                {formData.coverImageUrl ? (
                  <img
                    src={formData.coverImageUrl}
                    alt="Aperçu"
                    className="max-h-full max-w-full object-contain rounded"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">Aucune image sélectionnée</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={formData.coverImageUrl}
                onChange={e => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="URL de l'image de couverture..."
                className="w-full px-2.5 py-1.5 text-[11px] border border-slate-300 rounded focus:ring-1 focus:ring-sky-600 focus:outline-none"
              />
            </div>

            {/* Title & Metadata fields */}
            <div className="md:col-span-3 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Titre principal de l'ouvrage <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex : Clean Code, Conception et Architecture Logicielle avec UML..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sous-titre ou précision de l'édition (Optionnel)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Ex : A Handbook of Agile Software Craftsmanship / De l'analyse à la conception"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Auteur(s) principal(aux) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    required
                    placeholder="Ex : Robert C. Martin, Pascal Roques..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catégorie académique EST <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={e => handleCategoryChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none bg-white font-medium text-slate-900"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Numéro ISBN (10 ou 13 chiffres)
              </label>
              <input
                type="text"
                value={formData.isbn}
                onChange={e => handleIsbnInputChange(e.target.value)}
                placeholder="9780132350884"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maison d'édition</label>
              <input
                type="text"
                value={formData.publisher}
                onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                placeholder="Prentice Hall, Dunod, Eyrolles..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Année de publication <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.publicationYear}
                onChange={e => setFormData({ ...formData, publicationYear: e.target.value })}
                required
                min="1950"
                max="2035"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Langue de l'ouvrage</label>
              <input
                type="text"
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                placeholder="Français, Anglais..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Résumé descriptif pédagogique <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.summary}
              onChange={e => setFormData({ ...formData, summary: e.target.value })}
              required
              placeholder="Présentation générale du contenu pédagogique de l'ouvrage..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-600 focus:outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Section 2: Exemplaires Physiques Réels */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Copy className="w-4 h-4 text-sky-700" />
                2. Exemplaires Physiques de la Bibliothèque EST
              </h2>
              <p className="text-[11px] text-slate-500">
                Chaque exemplaire physique reçoit son propre identifiant interne distinct de l'ISBN.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createCopies}
                onChange={e => setCreateCopies(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="font-semibold text-slate-700 text-xs">Créer les exemplaires physiques maintenant</span>
            </label>
          </div>

          {createCopies && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre d'exemplaires à enregistrer <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={copiesCount}
                      onChange={e => handleCopiesCountChange(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                    />
                    <span className="text-[11px] text-slate-500">unités en stock</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Emplacement physique en rayon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shelfLocation}
                    onChange={e => setShelfLocation(e.target.value)}
                    required={createCopies}
                    placeholder="Ex: Salle Informatique - Rayon A1 - Étagère 1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">État physique initial</label>
                  <select
                    value={copyCondition}
                    onChange={e => setCopyCondition(e.target.value as CopyCondition)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-900"
                  >
                    <option value="NEW">Neuf</option>
                    <option value="GOOD">Bon état</option>
                    <option value="FAIR">Passable</option>
                    <option value="DAMAGED">Dégradé</option>
                  </select>
                </div>
              </div>

              {/* Codes-barres uniques générés */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                  Codes-barres internes uniques assignés aux exemplaires ({generatedBarcodes.length}) :
                </span>
                <div className="flex flex-wrap gap-2">
                  {generatedBarcodes.map((bc, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-semibold text-sky-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                      <span>{bc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Note : ces codes-barres internes sont destinés à l'étiquetage physique et aux scans d'emprunt/retour au guichet.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!duplicateBook}
            className="px-5 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-40 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? 'Enregistrement en cours...' : "Confirmer et enregistrer l'ouvrage"}
          </button>
        </div>
      </form>
    </div>
  );
};
