import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface UseBarcodeScannerOptions {
  onScanSuccess: (barcode: string) => void;
  debounceMs?: number;
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions) {
  const { onScanSuccess, debounceMs = 2000 } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const onScanSuccessRef = useRef(onScanSuccess);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  // Initialize ZXing reader with targeted formats for EST library (Code 128, EAN-13, Code 39, etc.)
  const getReader = useCallback(() => {
    if (!readerRef.current) {
      const hints = new Map();
      const formats = [
        BarcodeFormat.CODE_128, // EST internal barcodes e.g. EST-GL-001-A
        BarcodeFormat.EAN_13,   // ISBN-13
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      readerRef.current = new BrowserMultiFormatReader(hints);
    }
    return readerRef.current;
  }, []);

  // Stop scanner decoding loop
  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        // ignore
      }
    }
    setIsScanning(false);
  }, []);

  // Start continuous barcode scanning from a video element
  const startScanningVideo = useCallback(
    (videoElement: HTMLVideoElement) => {
      stopScanning();
      setScanError(null);
      setIsScanning(true);

      const reader = getReader();

      try {
        reader.decodeFromVideoElementContinuously(videoElement, (result: any, error: any) => {
          if (result) {
            const rawText = result.getText().trim();
            const now = Date.now();

            // Throttle duplicate reads
            if (rawText && now - lastScanTimestampRef.current > debounceMs) {
              lastScanTimestampRef.current = now;
              setLastScannedCode(rawText);

              // Play a pleasant feedback sound or beep if available
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 beep
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.12);
              } catch (audioErr) {
                // Audio context not allowed or failed, ignore
              }

              onScanSuccessRef.current(rawText);
            }
          }
          if (error && error.name !== 'NotFoundException') {
            // NotFoundException happens every frame where no barcode is in frame, which is expected
          }
        });
      } catch (err: any) {
        console.error('Failed to start barcode scanner:', err);
        setScanError('Impossible de démarrer le décodeur de codes-barres.');
        setIsScanning(false);
      }
    },
    [debounceMs, getReader, stopScanning]
  );

  // Scan single image file (for drag & drop or file upload fallback)
  const scanFromImage = useCallback(
    async (imageSource: string): Promise<string | null> => {
      const reader = getReader();
      try {
        const result = await reader.decodeFromImageUrl(imageSource);
        if (result) {
          const code = result.getText().trim();
          setLastScannedCode(code);
          onScanSuccessRef.current(code);
          return code;
        }
        return null;
      } catch (err) {
        console.warn('No barcode found in image:', err);
        return null;
      }
    },
    [getReader]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    lastScannedCode,
    scanError,
    startScanningVideo,
    stopScanning,
    scanFromImage,
  };
}
