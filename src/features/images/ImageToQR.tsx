import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Link2,
  Cpu,
  AlertTriangle,
  Sliders,
  Download,
  Upload,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ImageToQRMode, ProcessedImageResult } from '../../types/image';
import { processImage, QR_BYTE_CAPACITY } from '../../utils/canvasImageOps';
import { sanitizeWebUrl } from '../../utils/qrPayloads';
import { QRRenderer, QRRendererHandle } from '../qr/QRRenderer';
import { QRDesignStudio } from '../qr/QRDesignStudio';
import { QR_PRESET_STYLES } from '../qr/presets';
import { QRDesignConfig } from '../../types/qr';

export const ImageToQR: React.FC = () => {
  const [mode, setMode] = useState<ImageToQRMode>('direct');
  const [designConfig, setDesignConfig] = useState<QRDesignConfig>(QR_PRESET_STYLES[0]);
  const qrRef = useRef<QRRendererHandle>(null);

  // Mode A: Public Image URL
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1579546929518-9e396f3cc809');
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; sanitized: string; error?: string }>({
    isValid: true,
    sanitized: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
  });

  // Mode B: Direct Small Image
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [directResult, setDirectResult] = useState<ProcessedImageResult | null>(null);
  const [maxDimension, setMaxDimension] = useState<number>(36); // e.g. 36x36 for low payload size
  const [quality, setQuality] = useState<number>(0.35); // heavily compressed
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  // Scannability verification state
  const [isVerified, setIsVerified] = useState(false);

  // Process Direct Small Image whenever file, maxDimension, or quality changes
  const processDirectImage = async (file: File) => {
    setIsProcessing(true);
    setProcessError('');
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Input image exceeds maximum 10MB limit');
      }

      const result = await processImage(file, {
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        quality: quality,
        format: 'image/jpeg',
      });

      setDirectResult(result);
    } catch (err: any) {
      setProcessError(err.message || 'Error processing image locally');
      setDirectResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDropOrSelect = (file: File) => {
    setSelectedFile(file);
    processDirectImage(file);
  };

  // Determine current active QR Payload based on mode
  let activePayload = '';
  let payloadByteLength = 0;
  let isPayloadTooLarge = false;

  if (mode === 'url') {
    activePayload = urlValidation.isValid ? urlValidation.sanitized : '';
    payloadByteLength = new TextEncoder().encode(activePayload).length;
  } else if (mode === 'direct') {
    activePayload = directResult?.dataUrl || '';
    payloadByteLength = new TextEncoder().encode(activePayload).length;
    // QR Version 40 maximum bytes at Error Correction L is ~2953
    isPayloadTooLarge = payloadByteLength > QR_BYTE_CAPACITY[designConfig.errorCorrection];
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Breadcrumb */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/60 via-purple-950/40 to-slate-900 border border-violet-800/40 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-bold uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Featured Core Capability</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Image to QR Generator
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Store photos, avatars, and graphics inside scannable QR codes. Choose direct browser compression for offline embedding or instant URL linking.
          </p>
        </div>
      </div>

      {/* Mode Selector (A, B, C) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mode B: Direct Small Image QR */}
        <button
          onClick={() => setMode('direct')}
          className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
            mode === 'direct'
              ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-950/50 text-white'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${mode === 'direct' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-pink-600 text-white">
              Embedded
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Direct Small-Image QR</h3>
            <p className="text-xs text-slate-400 mt-1">
              Encodes micro-photos directly into the QR pattern. 100% offline.
            </p>
          </div>
        </button>

        {/* Mode A: Public Image URL */}
        <button
          onClick={() => setMode('url')}
          className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
            mode === 'url'
              ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-950/50 text-white'
              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${mode === 'url' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Link2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Universal
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Public Image URL</h3>
            <p className="text-xs text-slate-400 mt-1">
              Links to any hosted image (Unsplash, Cloudinary, AWS, website).
            </p>
          </div>
        </button>

        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              API-Free
            </span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Private Browser Processing</h3>
            <p className="text-xs text-slate-400 mt-1">
              Images stay on your device. No server, API key, or upload setup required.
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout: Configuration & Live QR Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Controls according to Active Mode */}
        <div className="lg:col-span-7 space-y-6">
          {/* MODE B: Direct Small-Image QR Controls */}
          {mode === 'direct' && (
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-violet-400" />
                  <h2 className="text-base font-bold text-white">Direct Image Compression</h2>
                </div>
                <span className="text-xs text-slate-400">Canvas In-Browser</span>
              </div>

              {/* Notice regarding QR size limits */}
              <div className="p-3.5 rounded-2xl bg-violet-950/40 border border-violet-800/40 text-xs text-slate-300 leading-relaxed space-y-1">
                <p className="font-semibold text-violet-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Technical Direct QR Rule:</span>
                </p>
                <p>
                  Direct image QR works only for extremely small, heavily compressed images. Normal photos are too large for direct QR storage.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileDropOrSelect(f);
                }}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 hover:border-violet-500 transition text-center space-y-3 cursor-pointer"
                onClick={() => {
                  const input = document.getElementById('direct-image-picker') as HTMLInputElement;
                  input?.click();
                }}
              >
                <input
                  id="direct-image-picker"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileDropOrSelect(f);
                  }}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto text-violet-400" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedFile ? selectedFile.name : 'Drag & drop an image or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports JPG, PNG, WebP (Max 10MB input, will be resized)
                  </p>
                </div>
              </div>

              {/* Processing Controls: Dimension & Quality */}
              {selectedFile && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Max Dimension Selector */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-medium">Target Max Dimension</span>
                        <span className="text-violet-400 font-mono font-bold">{maxDimension}x{maxDimension}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="64"
                        step="4"
                        value={maxDimension}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setMaxDimension(val);
                          if (selectedFile) {
                            processImage(selectedFile, {
                              maxWidth: val,
                              maxHeight: val,
                              quality: quality,
                              format: 'image/jpeg',
                            }).then(setDirectResult).catch((error) => { setProcessError(error instanceof Error ? error.message : 'Image processing failed'); setDirectResult(null); });
                          }
                        }}
                        className="w-full accent-violet-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>16px (Ultra-Compact)</span>
                        <span>36px (Recommended)</span>
                        <span>64px (High)</span>
                      </div>
                    </div>

                    {/* Compression Quality */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-medium">JPEG Quality</span>
                        <span className="text-violet-400 font-mono font-bold">{Math.round(quality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        value={quality}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setQuality(val);
                          if (selectedFile) {
                            processImage(selectedFile, {
                              maxWidth: maxDimension,
                              maxHeight: maxDimension,
                              quality: val,
                              format: 'image/jpeg',
                            }).then(setDirectResult).catch((error) => { setProcessError(error instanceof Error ? error.message : 'Image processing failed'); setDirectResult(null); });
                          }
                        }}
                        className="w-full accent-violet-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Low (Safe QR)</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Status & Metrics Card */}
                  {directResult && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Processed Preview:</span>
                        <span className="text-violet-300 font-mono">
                          {directResult.width} x {directResult.height} px
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl border border-slate-700 bg-black/50 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={directResult.dataUrl}
                            alt="Micro preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Original Size:</span>
                            <span className="text-slate-200 font-mono font-semibold">
                              {(directResult.originalSizeBytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Embedded Payload:</span>
                            <span
                              className={`font-mono font-bold ${
                                isPayloadTooLarge ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {payloadByteLength} bytes
                            </span>
                            <span className="text-slate-500">/ max ~2953B</span>
                          </div>
                        </div>
                      </div>

                      {/* Error if payload exceeds QR Version 40 capacity */}
                      {isPayloadTooLarge && (
                        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 space-y-2">
                          <div className="font-bold flex items-center gap-1.5 text-rose-400">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>This image is too large to store directly inside a QR code.</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-rose-300">
                            Use Public Image URL instead, or lower the Max Dimension slider to 28px or Quality to 20%.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE A: Public Image URL Controls */}
          {mode === 'url' && (
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-violet-400" />
                <h2 className="text-base font-bold text-white">Public Image URL</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste any valid HTTPS image link. The resulting QR code will open this image directly on any scanning smartphone.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Image Web Address</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageUrl(val);
                    setUrlValidation(sanitizeWebUrl(val));
                  }}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                />
                {!urlValidation.isValid && (
                  <p className="text-xs text-rose-400 mt-1">{urlValidation.error}</p>
                )}
              </div>

              {/* Sample Quick Links */}
              <div className="pt-2 text-xs space-y-1.5">
                <span className="text-slate-500 text-[11px]">Quick Samples:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Unsplash Abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809' },
                    { label: 'Nature Photo', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05' },
                    { label: 'Studio Gradient', url: 'https://images.unsplash.com/photo-1557683316-973673baf926' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => {
                        setImageUrl(s.url);
                        setUrlValidation(sanitizeWebUrl(s.url));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Design Studio Sub-Controls */}
          <QRDesignStudio
            config={designConfig}
            onChangeConfig={setDesignConfig}
            payloadLength={payloadByteLength}
          />
        </div>

        {/* Right Column: Live QR Preview & Download Station */}
        <div className="lg:col-span-5 sticky top-20 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-violet-950/80 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider text-center">
              Live QR Preview
            </h3>
            <p className="text-xs text-slate-400 mb-6 text-center">
              Real-time rendering • Local optical verification
            </p>

            {/* QR Rendering Target */}
            {activePayload && !isPayloadTooLarge ? (
              <QRRenderer
                ref={qrRef}
                data={activePayload}
                config={designConfig}
                onVerificationChange={(result) => setIsVerified(result.verified)}
              />
            ) : (
              <div className="w-72 h-72 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
                <ImageIcon className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-400 font-medium">
                  {isPayloadTooLarge
                    ? 'Payload too large for QR storage'
                    : 'Select or input an image to generate QR'}
                </p>
              </div>
            )}

            {/* Export & Action Buttons */}
            <div className="w-full mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => qrRef.current?.download('png', 'zosuf-image-qr')}
                  disabled={!activePayload || isPayloadTooLarge || !isVerified}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={!isVerified ? 'Verification required before downloading' : 'Download PNG'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => qrRef.current?.download('svg', 'zosuf-image-qr')}
                  disabled={!activePayload || isPayloadTooLarge || !isVerified}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={!isVerified ? 'Verification required before downloading' : 'Download SVG'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>
              </div>

              {!isVerified && activePayload && !isPayloadTooLarge && (
                <p className="text-[11px] text-amber-400 text-center font-medium">
                  Downloads unlock once optical scannability is verified.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
