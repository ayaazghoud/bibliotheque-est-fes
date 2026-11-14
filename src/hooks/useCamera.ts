import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseCameraOptions {
  facingMode?: 'environment' | 'user';
  idealWidth?: number;
  idealHeight?: number;
  onStreamStarted?: (stream: MediaStream) => void;
  onStreamStopped?: () => void;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    facingMode = 'environment',
    idealWidth = 1280,
    idealHeight = 720,
    onStreamStarted,
    onStreamStopped,
  } = options;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Helper to enumerate and discover cameras
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter(d => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Caméra ${index + 1}`,
        }));
      setAvailableDevices(videoDevices);
    } catch (e) {
      console.warn('Unable to enumerate camera devices:', e);
    }
  }, []);

  // Helper to attach stream to a video node and start playback
  const attachStreamToVideo = useCallback(async (video: HTMLVideoElement, stream: MediaStream) => {
    try {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      // Ensure video element plays as soon as metadata is ready
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        try {
          await video.play();
        } catch (playErr) {
          console.warn('Direct video.play() warning:', playErr);
        }
      } else {
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (playErr) {
            console.warn('video.play() on loadedmetadata warning:', playErr);
          }
        };
      }
    } catch (err) {
      console.error('Error attaching stream to video element:', err);
    }
  }, []);

  // Callback ref for the video element (ensures instant attachment when video mounts in DOM)
  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node;
      if (node && streamRef.current) {
        attachStreamToVideo(node, streamRef.current);
      }
    },
    [attachStreamToVideo]
  );

  // Stop camera and release all hardware resources
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }

    if (videoElementRef.current) {
      try {
        videoElementRef.current.srcObject = null;
        videoElementRef.current.onloadedmetadata = null;
      } catch (e) {
        // ignore
      }
    }

    setIsCameraActive(false);
    setIsStarting(false);
    onStreamStopped?.();
  }, [onStreamStopped]);

  // Start camera with proper error translation
  const startCamera = useCallback(
    async (deviceIdToUse?: string) => {
      stopCamera();
      setCameraError(null);
      setIsStarting(true);

      // Verify browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "L'API Caméra (navigator.mediaDevices.getUserMedia) n'est pas supportée par ce navigateur ou est bloquée par l'environnement."
        );
        setIsStarting(false);
        return false;
      }

      try {
        const targetDeviceId = deviceIdToUse || selectedDeviceId;
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: targetDeviceId
            ? {
                deviceId: { exact: targetDeviceId },
                width: { ideal: idealWidth },
                height: { ideal: idealHeight },
              }
            : {
                facingMode: { ideal: facingMode },
                width: { ideal: idealWidth },
                height: { ideal: idealHeight },
              },
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (strictErr: any) {
          // Fallback to minimal constraints if ideal resolution / exact device was overconstrained
          console.warn('Camera fallback to basic constraints due to:', strictErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        streamRef.current = stream;
        setIsCameraActive(true);

        // If video element is already mounted, attach stream immediately
        if (videoElementRef.current) {
          await attachStreamToVideo(videoElementRef.current, stream);
        }

        // Refresh device list now that permissions are granted
        await refreshDevices();

        onStreamStarted?.(stream);
        setIsStarting(false);
        return true;
      } catch (err: any) {
        console.error('getUserMedia error:', err);
        setIsStarting(false);
        setIsCameraActive(false);

        // Human-friendly error translation
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError(
            "Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur ou dans la barre d'adresse."
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError(
            "Aucune caméra détectée sur votre appareil. Connectez une webcam ou utilisez l'importation d'image."
          );
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraError(
            'La caméra est actuellement utilisée par une autre application (Zoom, Teams, etc.) ou est verrouillée.'
          );
        } else if (err.name === 'OverconstrainedError') {
          setCameraError("La résolution vidéo demandée n'est pas supportée par votre capteur.");
        } else if (err.name === 'SecurityError') {
          setCameraError("L'accès caméra requiert un protocole sécurisé (HTTPS ou localhost).");
        } else {
          setCameraError(
            err.message || "Erreur inconnue lors du démarrage du flux vidéo de la caméra."
          );
        }
        return false;
      }
    },
    [facingMode, idealWidth, idealHeight, selectedDeviceId, attachStreamToVideo, refreshDevices, onStreamStarted, stopCamera]
  );

  // Switch to another camera device
  const switchCamera = useCallback(
    async (newDeviceId: string) => {
      setSelectedDeviceId(newDeviceId);
      if (isCameraActive) {
        await startCamera(newDeviceId);
      }
    },
    [isCameraActive, startCamera]
  );

  // Capture photo from active stream with resolution preservation
  const capturePhoto = useCallback((): string | null => {
    const video = videoElementRef.current;
    if (!video || !streamRef.current) {
      setCameraError('Impossible de capturer : aucun flux vidéo actif.');
      return null;
    }

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    if (videoWidth === 0 || videoHeight === 0) {
      setCameraError('Le flux vidéo est en cours d’initialisation. Réessayez dans un instant.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    return canvas.toDataURL('image/jpeg', 0.95);
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    videoElement: videoElementRef.current,
    stream: streamRef.current,
    isCameraActive,
    isStarting,
    cameraError,
    availableDevices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    refreshDevices,
  };
}
