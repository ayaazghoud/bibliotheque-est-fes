import React, { useState, useEffect, useRef, useCallback } from 'react';
import { copiesApi, booksApi } from '../../services/api';
import { BookCopy, Book, Loan } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useCamera } from '../../hooks/useCamera';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import {
  ScanBarcode,
  Camera,
  Keyboard,
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  BookOpen,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { AdminView } from '../../components/admin/AdminSidebar';

interface BarcodeScannerPageProps {
  onNavigate: (view: AdminView) => void;
  onInitiateLoanWithCopy?: (barcode: string) => void;
  onInitiateReturnWithLoan?: (loanId: number) => void;
}

export const BarcodeScannerPage: React.FC<BarcodeScannerPageProps> = ({
  onNavigate,
  onInitiateLoanWithCopy,
  onInitiateReturnWithLoan,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [justScannedCode, setJustScannedCode] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    found: boolean;
    copy?: BookCopy;
    currentLoan?: Loan;
    bookMatchedByIsbn?: Book;
    error?: string;
  } | null>(null);

  // USB Barcode Scanner listener (captures rapid keystrokes ending with Enter)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handlePerformScan = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) return;

    try {
      setIsSearching(true);
      // 1. Try finding by physical copy barcode (EST-GL-001-A)
      const res = await copiesApi.getByBarcode(code);
      if (res.found && res.copy) {
        setScanResult(res);
      } else {
        // 2. If not found as copy barcode, check if it's an ISBN (EAN-13 / ISBN-10)
        try {
          const isbnRes = await booksApi.checkDuplicate(code);
          if (isbnRes.exists && isbnRes.book) {
            setScanResult({
              found: true,
              bookMatchedByIsbn: isbnRes.book,
              copy: isbnRes.copies?.[0],
            });
            return;
          }
        } catch (e) {
          // ignore
        }
        setScanResult({
          found: false,
          error: `Exemplaire « ${code} » introuvable dans la base MySQL EST.`,
        });
      }
    } catch (err: any) {
      // Also check ISBN fallback on 404
      try {
        const isbnRes = await booksApi.checkDuplicate(code);
        if (isbnRes.exists && isbnRes.book) {
          setScanResult({
            found: true,
            bookMatchedByIsbn: isbnRes.book,
            copy: isbnRes.copies?.[0],
          });
          return;
        }
      } catch (e) {
        // ignore
      }
      setScanResult({
        found: false,
        error: `Exemplaire « ${code} » introuvable dans la base MySQL.`,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // ZXing Real-time Barcode Scanner Hook
  const {
    isScanning,
    startScanningVideo,
    stopScanning,
    scanFromImage,
  } = useBarcodeScanner({
    onScanSuccess: scannedCode => {
      setBarcodeInput(scannedCode);
      setJustScannedCode(scannedCode);
      setTimeout(() => setJustScannedCode(null), 2500);
      handlePerformScan(scannedCode);
    },
    debounceMs: 2500,
  });

  // Centralized Camera Hook
  const {
    videoRef,
    videoElement,
    isCameraActive,
    isStarting,
    cameraError,
    availableDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
  } = useCamera({
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
    onStreamStopped: () => {
      stopScanning();
    },
  });

  // When camera stream is active and video element is ready, start ZXing scanning
  useEffect(() => {
    if (isCameraActive && videoElement) {
      startScanningVideo(videoElement);
    } else {
      stopScanning();
    }
  }, [isCameraActive, videoElement, startScanningVideo, stopScanning]);

  // Clean up both camera and scanner when leaving this page
  useEffect(() => {
    return () => {
      stopScanning();
      stopCamera();
    };
  }, [stopScanning, stopCamera]);

  // Hardware USB douchette barcode listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing inside form inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const code = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          setBarcodeInput(code);
          handlePerformScan(code);
        }
        return;
      }

      // If keystrokes arrive in under 80ms, it's a hardware barcode scanner!
      if (diff < 80 || barcodeBufferRef.current.length === 0) {
        if (e.key.length === 1) {
          barcodeBufferRef.current += e.key;
        }
      } else {
        barcodeBufferRef.current = e.key.length === 1 ? e.key : '';
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleImageBarcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const found = await scanFromImage(reader.result);
        if (found) {
          setBarcodeInput(found);
          handlePerformScan(found);
        } else {
          setScanResult({
            found: false,
            error: "Aucun code-barres lisible n'a été détecté dans cette image.",
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick test barcode chips
  const sampleBarcodes = ['EST-GL-001-A', 'EST-GL-001-B', 'EST-RT-002-A', 'EST-BD-003-B', 'EST-PR-005-A'];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ScanBarcode className="w-6 h-6 text-sky-700" />
          Scanner de Codes-Barres Universel
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Détection instantanée par douchette USB, caméra vidéo intégrée ou saisie manuelle
        </p>
      </div>

      {/* Hardware Scanner active listener notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-sky-900">
          <Keyboard className="w-4 h-4 text-sky-700 shrink-0" />
          <span>
            <strong>Lecteur USB actif :</strong> Toute douchette code-barres USB connectée à votre poste est directement capturée en arrière-plan.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-emerald-800">Écoute clavier prête</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input and Camera controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Manual Input form */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recherche Manuelle de Code-Barres
            </h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handlePerformScan();
              }}
              className="space-y-2"
            >
              <div className="relative">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Ex : EST-GL-001-A"
                  className="w-full pl-3 pr-8 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-700 hover:text-sky-900"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {isSearching ? 'Recherche en cours...' : 'Vérifier dans la base'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">
                Exemples de codes de test :
              </span>
              <div className="flex flex-wrap gap-1">
                {sampleBarcodes.map(sb => (
                  <button
                    key={sb}
                    type="button"
                    onClick={() => {
                      setBarcodeInput(sb);
                      handlePerformScan(sb);
                    }}
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-800 rounded border border-slate-200 transition-colors"
                  >
                    {sb}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Camera Scanner Stream Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-700" />
                Scan par Caméra Vidéo
              </h2>
              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                >
                  Arrêter le flux
                </button>
              )}
            </div>

            {/* Camera Switcher if multiple devices */}
            {isCameraActive && availableDevices.length > 1 && (
              <div className="flex items-center gap-2 pt-1">
                <RotateCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedDeviceId || ''}
                  onChange={e => switchCamera(e.target.value)}
                  className="w-full text-[11px] font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {availableDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Caméra ${d.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isStarting ? (
              <div className="py-10 px-4 text-center border-2 border-slate-200 rounded-lg bg-slate-900/90 text-white space-y-3">
                <RefreshCw className="w-7 h-7 text-sky-400 animate-spin mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">Initialisation du capteur vidéo...</p>
                  <p className="text-[11px] text-slate-300">Demande d'autorisation caméra et mise au point</p>
                </div>
              </div>
            ) : !isCameraActive ? (
              <div className="py-6 px-4 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mx-auto">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Détection automatique par flux optique
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Activez la webcam ou la caméra de votre smartphone pour lire instantanément les codes-barres EST ou ISBN.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="w-full px-3 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Démarrer la caméra
                  </button>

                  <label className="w-full px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    Importer photo de code-barres
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageBarcodeUpload}
                    />
                  </label>
                </div>

                {cameraError && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-left space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Accès caméra non autorisé ou impossible :</span>
                    </div>
                    <p className="text-rose-600 pl-5">{cameraError}</p>
                    <div className="pt-1 pl-5">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="text-[11px] font-bold text-sky-700 hover:underline"
                      >
                        Réessayer l'accès
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center shadow-inner border border-slate-700">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />

                  {/* Laser & Framing Overlay */}
                  <div className="absolute inset-x-6 inset-y-6 pointer-events-none flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                      <div className="w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                    </div>

                    {/* Animated horizontal laser scanning bar */}
                    <div className="w-full relative py-0.5">
                      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
                    </div>

                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                      <div className="w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                    </div>
                  </div>

                  {/* Just scanned feedback badge */}
                  {justScannedCode && (
                    <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 space-y-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                        Code détecté !
                      </span>
                      <span className="font-mono text-sm font-extrabold px-3 py-1 bg-black/60 rounded border border-emerald-400/50">
                        {justScannedCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Moteur optique ZXing actif
                  </span>
                  <label className="text-slate-600 hover:text-sky-800 cursor-pointer underline font-medium">
                    Fichier image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageBarcodeUpload}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scan Result & Quick Actions */}
        <div className="lg:col-span-2">
          {scanResult === null ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-2 h-full flex flex-col items-center justify-center">
              <ScanBarcode className="w-12 h-12 text-slate-300 stroke-1" />
              <h3 className="text-sm font-bold text-slate-700">En attente de scan...</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Utilisez votre douchette USB, lancez la caméra ou tapez un code-barres pour afficher la notice de l'exemplaire.
              </p>
            </div>
          ) : !scanResult.found ? (
            /* Not Found : Propose addition */
            <div className="bg-white border border-rose-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Exemplaire non répertorié</h3>
                  <p className="text-xs text-rose-700">
                    Le code-barres <strong>« {barcodeInput} »</strong> n'existe pas encore dans le système.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Vous pouvez ajouter cet exemplaire physique à un ouvrage existant ou créer un nouveau livre dans le catalogue.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('copies')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Créer l'exemplaire
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('add-book')}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Ajouter un nouvel ouvrage complet
                </button>
              </div>
            </div>
          ) : (
            /* Found: Display full information and adapted actions */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold px-2 py-0.5 bg-slate-100 text-slate-900 rounded border border-slate-300">
                      {scanResult.copy?.barcode}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        scanResult.copy?.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {scanResult.copy?.status === 'AVAILABLE' ? 'Disponible en rayon' : 'Actuellement emprunté'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {scanResult.copy?.book?.title}
                  </h3>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Auteur : <strong>{scanResult.copy?.book?.author}</strong> · Année :{' '}
                    <strong>{scanResult.copy?.book?.publicationYear}</strong>
                  </div>
                </div>
              </div>

              {/* Physical metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Emplacement</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scanResult.copy?.locationShelf}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">État physique</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    <StatusBadge type="condition" value={scanResult.copy?.condition || 'GOOD'} />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">ISBN</span>
                  <div className="font-mono font-semibold text-slate-800 mt-0.5">
                    {scanResult.copy?.book?.isbn || 'Non renseigné'}
                  </div>
                </div>
              </div>

              {/* If borrowed, show active loan info */}
              {scanResult.copy?.status === 'BORROWED' && scanResult.currentLoan && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-xs">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700" />
                    Emprunt en cours rattaché à cet exemplaire
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-amber-900">
                    <div>
                      Étudiant : <strong>{scanResult.currentLoan.student?.user?.fullName}</strong> (
                      {scanResult.currentLoan.student?.studentIdNumber})
                    </div>
                    <div>
                      Date prévue de retour : <strong>{scanResult.currentLoan.expectedReturnDate}</strong>
                    </div>
                  </div>
                  {scanResult.currentLoan.overdueDays > 0 && (
                    <div className="text-rose-700 font-bold">
                      Cet emprunt est en retard de {scanResult.currentLoan.overdueDays} jour(s).
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons depending on copy availability */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Notice mise à jour en temps réel d'après MySQL.
                </span>

                <div className="flex items-center gap-2">
                  {scanResult.copy?.status === 'AVAILABLE' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onInitiateLoanWithCopy && scanResult.copy) {
                          onInitiateLoanWithCopy(scanResult.copy.barcode);
                        } else {
                          onNavigate('loans');
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <span>Créer un emprunt avec cet exemplaire</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (onInitiateReturnWithLoan && scanResult.currentLoan) {
                          onInitiateReturnWithLoan(scanResult.currentLoan.id);
                        } else {
                          onNavigate('loans');
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Enregistrer le retour de ce livre</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
