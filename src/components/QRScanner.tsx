import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  Upload,
  Copy,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Scan,
  Shield,
  VideoOff
} from 'lucide-react';

interface QRScannerProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onShowToast }) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('upload');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  // Start live camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setScanResult(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera streaming is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanningCamera(true);
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser bar, or upload an image instead.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on your device.');
      } else {
        setCameraError(err.message || 'Unable to start camera scanner.');
      }
      setIsScanningCamera(false);
    }
  };

  // Continuous frame scanner loop
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          setScanResult(code.data);
          onShowToast('QR Code successfully detected!', 'success');
          stopCamera();
          return;
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanFrame);
  };

  // Image Upload Scanner
  const handleImageUpload = (file: File) => {
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          onShowToast('Could not initialize canvas for scanning.', 'error');
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          setScanResult(code.data);
          onShowToast('QR Code found in image!', 'success');
        } else {
          onShowToast('No readable QR code was found in this image. Try another photo with clearer contrast.', 'error');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Cleanup on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isUrl = scanResult && /^https?:\/\//i.test(scanResult.trim());

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center justify-center gap-2">
          <Scan className="w-7 h-7 text-purple-400" />
          <span>Universal QR Scanner</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Scan any QR code using your device camera or by uploading an image. Decoded 100% locally in your browser.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => {
              setScanMode('upload');
              stopCamera();
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              scanMode === 'upload'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image File</span>
          </button>
          <button
            onClick={() => {
              setScanMode('camera');
              startCamera();
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              scanMode === 'camera'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera</span>
          </button>
        </div>
      </div>

      {/* Camera Mode Card */}
      {scanMode === 'camera' && (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-4 max-w-lg mx-auto">
          {cameraError ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 space-y-3">
              <VideoOff className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-500"
              >
                Retry Camera Access
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto flex items-center justify-center border-2 border-purple-500/50">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning visual overlay */}
              <div className="absolute inset-8 border-2 border-purple-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            {isScanningCamera && (
              <button
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                Pause Camera
              </button>
            )}
            {!isScanningCamera && !cameraError && (
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
              >
                Resume Scanner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Mode Card */}
      {scanMode === 'upload' && (
        <div className="max-w-lg mx-auto">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleImageUpload(f);
            }}
            className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center bg-slate-900/50 transition-all space-y-4"
          >
            <input
              type="file"
              id="qr-scan-upload-file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
              className="hidden"
            />
            <label
              htmlFor="qr-scan-upload-file"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  <span className="text-purple-400 underline">Select an image</span> or drop file here
                </p>
                <p className="text-xs text-slate-400">
                  Screenshots, camera photos, JPG, PNG, WebP supported
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Scan Result Modal / Card */}
      {scanResult && (
        <div className="max-w-lg mx-auto p-6 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Decoded QR Content</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono break-all max-h-48 overflow-y-auto leading-relaxed">
            {scanResult}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(scanResult);
                onShowToast('Copied decoded content to clipboard!', 'success');
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Content</span>
            </button>

            {isUrl && (
              <a
                href={scanResult}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open URL</span>
              </a>
            )}

            <button
              onClick={() => {
                setScanResult(null);
                if (scanMode === 'camera') startCamera();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
