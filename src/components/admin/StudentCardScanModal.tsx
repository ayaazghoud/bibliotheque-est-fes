import React, { useState, useRef, useEffect } from 'react';
import { studentsApi, OcrExtractedData } from '../../services/api';
import { Student } from '../../types';
import { Modal } from '../common/Modal';
import { useCamera } from '../../hooks/useCamera';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  FileText,
  CreditCard,
  Eye,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Sliders,
} from 'lucide-react';

interface StudentCardScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentCreated: (student: Student) => void;
  onViewExistingStudent?: (student: Student) => void;
}

export const StudentCardScanModal: React.FC<StudentCardScanModalProps> = ({
  isOpen,
  onClose,
  onStudentCreated,
  onViewExistingStudent,
}) => {
  // Mode: 'scan' (step 1) -> 'review' (step 2)
  const [step, setStep] = useState<'scan' | 'review'>('scan');

  // Images state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [imageFront, setImageFront] = useState<string | null>(null);
  const [imageBack, setImageBack] = useState<string | null>(null);

  // Centralized Camera Hook with proper device detection and lifecycle
  const {
    videoRef,
    isCameraActive,
    isStarting,
    cameraError,
    availableDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  } = useCamera({
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
  });

  // OCR Processing state
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Review Form data (pre-filled by OCR)
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    studentIdNumber: '',
    establishment: 'École Supérieure de Technologie de Fès (USMBA)',
    department: 'Génie Logiciel',
    academicYear: '2026/2027',
    email: '',
    phone: '',
  });

  // Duplicate check state
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateStudent, setDuplicateStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep('scan');
      setImageFront(null);
      setImageBack(null);
      setOcrError('');
      setSubmitSuccess('');
      setIsDuplicate(false);
      setDuplicateStudent(null);
    }
  }, [isOpen]);

  const handleCapturePhoto = () => {
    const photo = capturePhoto();
    if (photo) {
      if (activeSide === 'front') {
        setImageFront(photo);
      } else {
        setImageBack(photo);
      }
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (side === 'front') {
          setImageFront(reader.result);
        } else {
          setImageBack(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Sample cards generator for 1-click test simulation
  const handleLoadSampleCard = (sampleType: 'othmane' | 'kenza' | 'duplicate_aya') => {
    stopCamera();
    if (sampleType === 'othmane') {
      // SVG data URL of EST Fès card for Othmane El Idrissi
      const svgFront = createSampleCardSvg(
        'EL IDRISSI',
        'Othmane',
        'N138549210',
        'Génie Logiciel',
        '2026/2027',
        '#002B49'
      );
      setImageFront(svgFront);
    } else if (sampleType === 'kenza') {
      const svgFront = createSampleCardSvg(
        'TAZI',
        'Kenza',
        'N147820194',
        'Réseaux & Télécoms',
        '2026/2027',
        '#0A3A60'
      );
      setImageFront(svgFront);
    } else {
      // Duplicate Aya Azghoud already registered
      const svgFront = createSampleCardSvg(
        'AZGHOUD',
        'Aya',
        'N134098221',
        'Génie Logiciel',
        '2026/2027',
        '#002B49'
      );
      setImageFront(svgFront);
    }
  };

  // Helper to generate visual realistic SVG card for instant testing
  const createSampleCardSvg = (
    nom: string,
    prenom: string,
    cne: string,
    filiere: string,
    annee: string,
    accentColor: string
  ) => {
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect width="600" height="380" rx="16" fill="url(#cardGrad)" stroke="#cbd5e1" stroke-width="2"/>
      
      <!-- Top banner -->
      <path d="M 0 16 C 0 7.16 7.16 0 16 0 L 584 0 C 592.84 0 600 7.16 600 16 L 600 75 L 0 75 Z" fill="${accentColor}"/>
      <text x="30" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" letter-spacing="1">UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH</text>
      <text x="30" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">ÉCOLE SUPÉRIEURE DE TECHNOLOGIE - FÈS</text>
      
      <!-- Badge -->
      <rect x="470" y="18" width="105" height="40" rx="6" fill="#ffffff" fill-opacity="0.15"/>
      <text x="485" y="42" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">EST FÈS</text>

      <!-- Card Title -->
      <text x="30" y="105" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748b" letter-spacing="1.5">CARTE D'ÉTUDIANT · TITRE OFFICIEL</text>

      <!-- Student photo frame -->
      <rect x="30" y="125" width="120" height="150" rx="8" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="90" cy="175" r="30" fill="#cbd5e1"/>
      <path d="M 50 255 C 50 220, 130 220, 130 255 Z" fill="#94a3b8"/>
      
      <!-- Student Info Fields -->
      <text x="175" y="145" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">NOM / LAST NAME</text>
      <text x="175" y="170" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a">${nom}</text>
      
      <text x="175" y="198" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">PRÉNOM / FIRST NAME</text>
      <text x="175" y="220" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${prenom}</text>
      
      <text x="175" y="250" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">N° ÉTUDIANT (CNE / MASSAR)</text>
      <text x="175" y="272" font-family="monospace" font-size="17" font-weight="bold" fill="#0284c7" letter-spacing="1">${cne}</text>

      <!-- Bottom metadata strip -->
      <rect x="30" y="295" width="540" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="45" y="320" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748b">FILIÈRE :</text>
      <text x="115" y="320" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${filiere}</text>
      
      <text x="380" y="320" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748b">ANNÉE :</text>
      <text x="440" y="320" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${annee}</text>
      
      <text x="45" y="342" font-family="sans-serif" font-size="10" fill="#94a3b8">Établissement : École Supérieure de Technologie de Fès (USMBA)</text>
    </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  const handleLaunchOcr = async () => {
    if (!imageFront) {
      setOcrError("Veuillez d'abord capturer ou importer le recto de la carte étudiante.");
      return;
    }

    try {
      setIsProcessingOcr(true);
      setOcrError('');

      const res = await studentsApi.scanCardOcr({
        imageFrontBase64: imageFront,
        imageBackBase64: imageBack || undefined,
      });

      const ext = res.extracted;
      const firstName = ext.firstName || '';
      const lastName = ext.lastName || '';
      const cleanEmail =
        firstName && lastName
          ? `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@usmba.ac.ma`
          : 'etudiant.est@usmba.ac.ma';

      setFormData({
        lastName: ext.lastName,
        firstName: ext.firstName,
        studentIdNumber: ext.studentIdNumber,
        establishment: ext.establishment || 'École Supérieure de Technologie de Fès (USMBA)',
        department: ext.department || 'Génie Logiciel',
        academicYear: ext.academicYear || '2026/2027',
        email: cleanEmail,
        phone: '',
      });

      setIsDuplicate(res.isDuplicate);
      setDuplicateStudent(res.duplicateStudent || null);

      // Move to step 2: verification
      setStep('review');
    } catch (err: any) {
      setOcrError(err.response?.data?.error || err.message || "Erreur lors de la reconnaissance de la carte.");
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const handleStudentIdChange = async (newId: string) => {
    setFormData(prev => ({ ...prev, studentIdNumber: newId }));
    if (newId.trim().length >= 4) {
      try {
        const check = await studentsApi.checkDuplicate(newId.trim());
        setIsDuplicate(check.exists);
        setDuplicateStudent(check.student || null);
      } catch (e) {
        // ignore
      }
    } else {
      setIsDuplicate(false);
      setDuplicateStudent(null);
    }
  };

  const handleConfirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;

    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    if (!fullName || !formData.studentIdNumber.trim() || !formData.email.trim() || !formData.department.trim()) {
      setOcrError("Tous les champs obligatoires marqués d'une étoile (*) doivent être renseignés.");
      return;
    }

    try {
      setIsSubmitting(true);
      setOcrError('');
      const created = await studentsApi.create({
        fullName,
        email: formData.email.trim().toLowerCase(),
        studentIdNumber: formData.studentIdNumber.trim().toUpperCase(),
        department: formData.department.trim(),
        phone: formData.phone.trim() || undefined,
        academicYear: formData.academicYear.trim() || undefined,
        establishment: formData.establishment.trim() || undefined,
        cardReference: `SCAN-${formData.studentIdNumber.trim().toUpperCase()}`,
      });

      setSubmitSuccess(`L'étudiant « ${fullName} » (${created.studentIdNumber}) a été inscrit avec succès !`);
      setTimeout(() => {
        onStudentCreated(created);
        onClose();
      }, 1500);
    } catch (err: any) {
      setOcrError(err.response?.data?.error || err.message || "Erreur lors de l'enregistrement dans MySQL");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Numérisation & Inscription d'un Étudiant par Carte"
      subtitle="Extraction OCR automatique des données de la carte étudiante avec vérification d'intégrité"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 'scan' ? 'bg-sky-700 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              1
            </span>
            <span className={`font-semibold ${step === 'scan' ? 'text-slate-900' : 'text-slate-500'}`}>
              Numérisation Carte (Recto / Verso)
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 'review' ? 'bg-sky-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={`font-semibold ${step === 'review' ? 'text-slate-900' : 'text-slate-400'}`}>
              Vérification OCR & Validation Gérant
            </span>
          </div>
        </div>

        {ocrError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{ocrError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{submitSuccess}</span>
          </div>
        )}

        {/* STEP 1: SCAN & ACQUISITION */}
        {step === 'scan' && (
          <div className="space-y-5">
            {/* Recto / Verso Selector */}
            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveSide('front');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeSide === 'front'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Face Recto (Obligatoire)</span>
                {imageFront && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveSide('back');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  activeSide === 'back'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Face Verso (Optionnelle)</span>
                {imageBack && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            </div>

            {/* Viewport for Active Side */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  {activeSide === 'front' ? 'Numérisation du Recto de la carte' : 'Numérisation du Verso'}
                </span>
                {(activeSide === 'front' ? imageFront : imageBack) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSide === 'front') setImageFront(null);
                      else setImageBack(null);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Effacer cette photo
                  </button>
                )}
              </div>

              {/* Camera Starting State */}
              {isStarting ? (
                <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video flex flex-col items-center justify-center space-y-3 text-white border-2 border-sky-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                  <div className="text-center">
                    <div className="font-bold text-xs">Initialisation de la caméra en cours...</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Veuillez autoriser l'accès au capteur si le navigateur le demande
                    </div>
                  </div>
                </div>
              ) : isCameraActive ? (
                /* Camera Stream Active */
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-sky-600 shadow-md">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    {/* ID Card outline overlay */}
                    <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-sky-400 rounded-xl pointer-events-none flex flex-col items-center justify-between p-2 shadow-inner">
                      <span className="text-[10px] text-sky-200 bg-sky-950/70 px-2.5 py-0.5 rounded-full font-semibold">
                        Cadrage Carte Étudiant ID-1 (EST Fès)
                      </span>
                      <span className="text-[11px] text-white bg-black/70 px-3 py-1 rounded-md font-medium">
                        Positionnez la carte étudiante dans ce cadre
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {availableDevices.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <select
                          value={selectedDeviceId || ''}
                          onChange={e => switchCamera(e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 max-w-xs font-medium"
                        >
                          {availableDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Annuler la caméra
                      </button>
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg flex items-center gap-2 shadow-xs text-xs transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Prendre la photo
                      </button>
                    </div>
                  </div>
                </div>
              ) : (activeSide === 'front' ? imageFront : imageBack) ? (
                /* Photo preview */
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-white aspect-video max-h-56 flex items-center justify-center p-2">
                    <img
                      src={(activeSide === 'front' ? imageFront : imageBack) || ''}
                      alt="Aperçu carte"
                      className="w-full h-full object-contain rounded"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Image capturée
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Reprendre la photo
                    </button>
                  </div>
                </div>
              ) : (
                /* No photo yet: choose Camera or File upload */
                <div className="py-8 px-4 text-center border-2 border-dashed border-slate-300 rounded-xl bg-white space-y-4">
                  <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-700 mx-auto flex items-center justify-center">
                    <Scan className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {activeSide === 'front' ? 'Numérisez le Recto de la carte' : 'Numérisez le Verso de la carte'}
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Utilisez la caméra de votre appareil ou importez un fichier image (JPG, PNG).
                    </p>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-xs text-left space-y-2 max-w-md mx-auto">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="font-medium">{cameraError}</div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" />
                          Réessayer
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs text-xs"
                    >
                      <Camera className="w-4 h-4" />
                      Démarrer la caméra
                    </button>

                    <label className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs text-xs">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>Importer un fichier image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, activeSide)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Test samples bar for 1-click evaluation */}
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Jeux d'essai disponibles (1-clic pour tester sans webcam) :
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleCard('othmane')}
                  className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-300 rounded-md transition-colors"
                >
                  Carte 1: Othmane El Idrissi (Nouveau GL)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleCard('kenza')}
                  className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-300 rounded-md transition-colors"
                >
                  Carte 2: Kenza Tazi (Nouveau RT)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleCard('duplicate_aya')}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md transition-colors"
                  title="Permet de tester la détection immédiate de doublon"
                >
                  Carte 3: Doublon existant (Aya Azghoud)
                </button>
              </div>
            </div>

            {/* Launch OCR Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                L'extraction OCR traite l'image en mémoire et préremplit la fiche pour validation humaine.
              </span>
              <button
                type="button"
                disabled={!imageFront || isProcessingOcr}
                onClick={handleLaunchOcr}
                className="px-5 py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-40 rounded-lg transition-colors shadow-2xs flex items-center gap-2"
              >
                {isProcessingOcr ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reconnaissance OCR en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-300" />
                    <span>Lancer la reconnaissance des informations</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFICATION & HUMAN VALIDATION */}
        {step === 'review' && (
          <form onSubmit={handleConfirmRegistration} className="space-y-5">
            {/* Duplicate Alert Banner if already exists */}
            {isDuplicate && duplicateStudent ? (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>DOUBLON DÉTECTÉ : Cet étudiant est déjà enregistré dans MySQL !</span>
                </div>
                <p className="text-xs text-rose-700">
                  L'identifiant <strong>{duplicateStudent.studentIdNumber}</strong> appartient déjà à{' '}
                  <strong>{duplicateStudent.user?.fullName}</strong> ({duplicateStudent.user?.email}). Les
                  règles de gestion interdisent la création d'un second compte pour le même numéro d'étudiant.
                </p>
                <div className="pt-2 flex gap-2">
                  {onViewExistingStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        onViewExistingStudent(duplicateStudent);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Consulter sa fiche existante
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep('scan')}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-700 rounded-lg hover:bg-rose-50"
                  >
                    Scanner une autre carte
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Numéro étudiant vérifié :</strong> Aucun doublon dans la base. Veuillez vérifier et corriger si nécessaire les données ci-dessous.
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  Valide
                </span>
              </div>
            )}

            {/* Form Fields populated by OCR */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom de famille <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    placeholder="Ex : EL IDRISSI"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prénom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    placeholder="Ex : Othmane"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Numéro Étudiant (CNE / Massar / Apogée) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.studentIdNumber}
                    onChange={e => handleStudentIdChange(e.target.value)}
                    required
                    placeholder="Ex : N138549210"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Filière académique EST <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Génie Logiciel">Génie Logiciel</option>
                    <option value="Réseaux et Télécoms">Réseaux et Télécoms</option>
                    <option value="Bases de Données">Bases de Données</option>
                    <option value="Algorithmique & Informatique">Algorithmique & Informatique</option>
                    <option value="Génie Électrique">Génie Électrique</option>
                    <option value="Gestion des Entreprises">Gestion des Entreprises</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Établissement détecté
                  </label>
                  <input
                    type="text"
                    value={formData.establishment}
                    onChange={e => setFormData({ ...formData, establishment: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Année Universitaire
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Adresse e-mail académique <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="prenom.nom@usmba.ac.ma"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Utilisée pour l'authentification Google OAuth et l'envoi des rappels SMTP.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Numéro de Téléphone (Optionnel)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 6..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('scan')}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ← Retour au scan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isDuplicate || isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  {isSubmitting ? 'Enregistrement en cours...' : "Confirmer l'inscription dans MySQL"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
