import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Camera,
  CameraOff,
  Flashlight,
  Upload,
  Copy,
  ExternalLink,
  Trash2,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Vibrate,
  History,
  ShieldCheck,
} from 'lucide-react';

interface ScanHistoryItem {
  id: string;
  text: string;
  timestamp: string;
  isUrl: boolean;
}

export const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Audio / vibration settings
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Active result & Modal for safe link confirmation
  const [latestResult, setLatestResult] = useState<string | null>(null);
  const [safeLinkModal, setSafeLinkModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scanner Themes (10 styles)
  const [scannerTheme, setScannerTheme] = useState<
    | 'zosuf-pulse'
    | 'neon-beam'
    | 'cyber-grid'
    | 'minimal-focus'
    | 'aurora'
    | 'retro-arcade'
    | 'detective'
    | 'mystery'
    | 'comic'
    | 'party'
  >('zosuf-pulse');

  // History state
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('zosuf_scan_history') || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.text === 'string').slice(0, 30) : [];
    } catch {
      return [];
    }
  });

  // Play simple Web Audio beep
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  // Enumerate video devices. Before camera permission is granted the browser
  // reports empty labels, so we must not guess a deviceId here: picking
  // videoInputs[0] opens the FRONT camera on most phones. We stay on
  // facingMode:'environment' until the user explicitly chooses a camera, then
  // re-enumerate once labels are available.
  const refreshDevices = React.useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);

      setSelectedDeviceId((current) => {
        if (current && videoInputs.some((d) => d.deviceId === current)) return current;
        const labelled = videoInputs.filter((d) => d.label);
        if (labelled.length === 0) return '';
        const back = labelled.find((d) =>
          /back|rear|environment/i.test(d.label)
        );
        return back ? back.deviceId : '';
      });
    } catch {
      /* enumeration is best-effort */
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  // Record scan result
  const handleScanSuccess = (text: string) => {
    if (!text || text === latestResult) return;
    setLatestResult(text);
    playBeep();

    if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }

    const isUrl = /^https?:\/\//i.test(text.trim());
    const newItem: ScanHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUrl,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.text !== text)].slice(0, 30);
      localStorage.setItem('zosuf_scan_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Start Live Camera
  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'This browser will not expose a camera on an insecure connection. Open ZOSUF over HTTPS, or upload a QR image below instead.'
      );
      return;
    }

    if (!readerRef.current) {
      readerRef.current = new BrowserMultiFormatReader();
    }

    try {
      setIsScanning(true);

      // Prefer the rear camera. `exact` on a stale deviceId throws
      // OverconstrainedError, so fall back to facingMode before giving up.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: { ideal: 'environment' } },
        });
      } catch (primaryError) {
        if (!selectedDeviceId) throw primaryError;
        setSelectedDeviceId('');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      }

      streamRef.current = stream;
      // Labels only become readable after permission is granted.
      void refreshDevices();

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() as any) || {};
      setHasTorch(Boolean(capabilities.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        // Start decode loop
        scannerControlsRef.current = await readerRef.current.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) {
            handleScanSuccess(result.getText());
          }
        });
      }
    } catch (err) {
      stopCamera();
      const name = err instanceof Error ? err.name : '';
      setCameraError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Camera permission denied. Allow camera access in your browser settings to scan live codes.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device. Upload or paste a QR image below instead.'
            : name === 'NotReadableError'
              ? 'The camera is already in use by another app or tab. Close it and try again.'
              : 'Failed to access the video stream. Try another camera or upload a QR image below.'
      );
    }
  };

  // Stop Live Camera
  const stopCamera = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      // Release scanner
      readerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {}
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Upload image to decode
  const handleImageUploadToDecode = async (file: File) => {
    setCameraError('');
    if (!file.type.startsWith('image/')) { setCameraError('Choose a valid image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setCameraError('QR image must be smaller than 10 MB.'); return; }
    const objectUrl = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader();
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('Invalid image')); });
      const result = await reader.decodeFromImageElement(img);
      if (result) handleScanSuccess(result.getText());
    } catch {
      setCameraError('No readable QR code found in this image. Ensure the image is clear and well-lit.');
    } finally { URL.revokeObjectURL(objectUrl); }
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) handleImageUploadToDecode(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCameraError('Clipboard access is blocked here. Select the text above and copy it manually.');
    }
  };

  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('zosuf_scan_history');
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      localStorage.setItem('zosuf_scan_history', JSON.stringify(next));
      return next;
    });
  };

  // Themes CSS classes
  const themeClasses: Record<string, { frame: string; laser: string }> = {
    'zosuf-pulse': { frame: 'border-violet-500 shadow-violet-500/50', laser: 'bg-violet-400 shadow-violet-400' },
    'neon-beam': { frame: 'border-cyan-400 shadow-cyan-400/50', laser: 'bg-cyan-300 shadow-cyan-300' },
    'cyber-grid': { frame: 'border-emerald-400 shadow-emerald-400/50', laser: 'bg-emerald-300 shadow-emerald-300' },
    'minimal-focus': { frame: 'border-white shadow-white/30', laser: 'bg-white shadow-white' },
    'aurora': { frame: 'border-fuchsia-400 shadow-fuchsia-400/50', laser: 'bg-gradient-to-r from-violet-400 to-pink-400 shadow-pink-400' },
    'retro-arcade': { frame: 'border-yellow-400 shadow-yellow-400/50', laser: 'bg-yellow-300 shadow-yellow-300' },
    'detective': { frame: 'border-amber-500 shadow-amber-500/50', laser: 'bg-amber-400 shadow-amber-400' },
    'mystery': { frame: 'border-purple-600 shadow-purple-600/50', laser: 'bg-purple-400 shadow-purple-400' },
    'comic': { frame: 'border-red-500 shadow-red-500/50', laser: 'bg-red-400 shadow-red-400' },
    'party': { frame: 'border-pink-500 shadow-pink-500/50', laser: 'bg-pink-400 shadow-pink-400' },
  };

  const currentTheme = themeClasses[scannerTheme] || themeClasses['zosuf-pulse'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Advanced QR Code Scanner
        </h1>
        <p className="text-slate-300 text-sm">
          Instant camera detection, clipboard & file drag-and-drop, strict safety sandbox, and local scan history.
        </p>
      </div>

      {/* Main Grid: Live Camera / Upload & Scan Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Viewport & Scanning Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-5">
            {/* Top Toolbar: Camera Selector, Torch, Audio & Theme */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-white font-medium disabled:opacity-50"
                >
                  {videoDevices.length === 0 && <option value="">Default Rear Camera</option>}
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>

                {hasTorch && isScanning && (
                  <button
                    onClick={toggleTorch}
                    className={`p-1.5 rounded-xl border transition ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-xl border transition ${
                    soundEnabled
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                  title={soundEnabled ? 'Beep sound enabled' : 'Sound disabled'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setVibrationEnabled(!vibrationEnabled)}
                  className={`p-1.5 rounded-xl border transition ${
                    vibrationEnabled
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                  title={vibrationEnabled ? 'Haptic feedback on' : 'Haptic feedback off'}
                >
                  <Vibrate className="w-4 h-4" />
                </button>

                {/* 10 Themes Selector */}
                <select
                  value={scannerTheme}
                  onChange={(e) => setScannerTheme(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 text-xs"
                >
                  <option value="zosuf-pulse">ZOSUF Pulse</option>
                  <option value="neon-beam">Neon Beam</option>
                  <option value="cyber-grid">Cyber Grid</option>
                  <option value="minimal-focus">Minimal Focus</option>
                  <option value="aurora">Aurora Scanner</option>
                  <option value="retro-arcade">Retro Arcade</option>
                  <option value="detective">Detective Mode</option>
                  <option value="mystery">Mystery Scanner</option>
                  <option value="comic">Comic Scanner</option>
                  <option value="party">Party Scanner</option>
                </select>
              </div>
            </div>

            {/* Live Camera Viewport Target */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/80 backdrop-blur-sm">
                  <Camera className="w-12 h-12 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">
                    Camera is currently inactive
                  </p>
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs shadow-lg shadow-violet-950 hover:brightness-110 active:scale-95 transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Launch Camera Scanner</span>
                  </button>
                </div>
              )}

              {/* Holographic Aim Reticle & Animated Scan Laser */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                  <div
                    className={`relative w-48 sm:w-56 h-48 sm:h-56 rounded-2xl border-2 ${currentTheme.frame} shadow-2xl transition-all duration-300 flex items-center justify-center`}
                  >
                    {/* Corner Brackets */}
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />

                    {/* Animated Laser Bar */}
                    <div
                      className={`w-full h-0.5 ${currentTheme.laser} shadow-[0_0_12px] animate-bounce duration-1000`}
                    />
                  </div>
                </div>
              )}

              {/* Stop Scanning Button in overlay */}
              {isScanning && (
                <button
                  onClick={stopCamera}
                  className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold backdrop-blur transition"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Scanner Notice</span>
                </div>
                <p>{cameraError}</p>
              </div>
            )}

            {/* Alternative Input: Upload File or Drag & Drop */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleImageUploadToDecode(file);
              }}
              className="p-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 hover:border-violet-500 transition text-center text-xs space-y-2 cursor-pointer"
              onClick={() => {
                const input = document.getElementById('qr-upload-scanner-input') as HTMLInputElement;
                input?.click();
              }}
            >
              <input
                id="qr-upload-scanner-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUploadToDecode(file);
                }}
                className="hidden"
              />
              <Upload className="w-5 h-5 mx-auto text-violet-400" />
              <p className="text-slate-300 font-medium">
                Drag & drop a QR image, browse from device, or paste from clipboard (Ctrl+V)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Latest Scanned Result & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Latest Active Scan Result Card */}
          {latestResult && (
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-violet-800/50 backdrop-blur-xl shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>QR Detected</span>
                </span>
                <span className="text-[11px] text-slate-400">Just now</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 font-mono text-xs text-white break-all max-h-36 overflow-y-auto leading-relaxed">
                {latestResult}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => void copyToClipboard(latestResult, 'latest')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950 transition"
                >
                  {copiedId === 'latest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'latest' ? 'Copied' : 'Copy Text'}</span>
                </button>

                {/* Safe URL Opening Dialog Trigger */}
                {/^https?:\/\//i.test(latestResult.trim()) && (
                  <button
                    onClick={() => setSafeLinkModal(latestResult.trim())}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-violet-500/50 bg-violet-950/40 hover:bg-violet-900/50 text-violet-200 font-bold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Safe URL</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Scan History Card */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Scan History
                </h3>
              </div>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No scans recorded in this session. History is stored locally on this device.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                        {item.isUrl && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-950 text-violet-300 font-semibold">
                            Link
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-slate-300 truncate">{item.text}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-1">
                      <button
                        onClick={() => void copyToClipboard(item.text, item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Copy content"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {item.isUrl && (
                        <button
                          onClick={() => setSafeLinkModal(item.text)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-slate-800"
                          title="Open safe URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safe URL Opening Modal */}
      {safeLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#0d0e26] border border-violet-800/60 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-violet-300">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
              <h3 className="text-base font-bold text-white">External Link Safety Gate</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to navigate to an external website discovered in a QR code. Verify the destination domain before continuing:
            </p>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-slate-800 font-mono text-xs text-emerald-400 break-all">
              {safeLinkModal}
            </div>

            {/* Security Protocol Warning */}
            {!safeLinkModal.toLowerCase().startsWith('https://') && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Caution: This link uses insecure HTTP or non-standard protocol.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSafeLinkModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <a
                href={/^https?:\/\//i.test(safeLinkModal) ? safeLinkModal : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSafeLinkModal(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-950"
              >
                <span>Proceed to Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
