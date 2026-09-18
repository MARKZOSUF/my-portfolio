import React, { useState, useEffect } from 'react';
import {
  validateImageFile,
  processBrowserImage,
  downloadFile,
  formatBytes,
  ProcessedImageResult
} from '../utils/imageProcessing';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Download,
  Trash2,
  ShieldCheck,
  Crop,
  Layers,
  Sparkles,
  RefreshCw,
  Maximize2
} from 'lucide-react';

interface ImageToolsProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToGeneratorWithUrl?: (url: string) => void;
}

export const ImageTools: React.FC<ImageToolsProps> = ({ onShowToast, onNavigateToGeneratorWithUrl }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [origWidth, setOrigWidth] = useState<number>(0);
  const [origHeight, setOrigHeight] = useState<number>(0);

  // Settings
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(600);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [targetFormat, setTargetFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState<number>(85); // 10 to 100
  const [cropPreset, setCropPreset] = useState<'none' | '1:1' | '16:9' | '4:3'>('none');

  // Processed Result
  const [processedResult, setProcessedResult] = useState<ProcessedImageResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Separate Public Image URL field as requested
  const [publicImageUrl, setPublicImageUrl] = useState<string>('');

  // Handle file select
  const handleFile = (file: File) => {
    const val = validateImageFile(file);
    if (!val.valid) {
      onShowToast(val.error || 'Invalid file format or size.', 'error');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setPreviewUrl(url);

      // Measure dimensions
      const img = new Image();
      img.onload = () => {
        setOrigWidth(img.naturalWidth);
        setOrigHeight(img.naturalHeight);
        setTargetWidth(img.naturalWidth);
        setTargetHeight(img.naturalHeight);
        setAspectRatio(img.naturalWidth / img.naturalHeight);
        executeProcess(url, img.naturalWidth, img.naturalHeight, targetFormat, quality / 100, 'none');
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Run image processing with current parameters
  const executeProcess = async (
    source: string,
    w: number,
    h: number,
    format: 'image/png' | 'image/jpeg' | 'image/webp',
    q: number,
    crop: 'none' | '1:1' | '16:9' | '4:3'
  ) => {
    setIsProcessing(true);
    try {
      let cropRect = undefined;
      if (crop !== 'none' && origWidth > 0 && origHeight > 0) {
        let desiredRatio = 1;
        if (crop === '16:9') desiredRatio = 16 / 9;
        if (crop === '4:3') desiredRatio = 4 / 3;

        let cw = origWidth;
        let ch = origWidth / desiredRatio;
        if (ch > origHeight) {
          ch = origHeight;
          cw = origHeight * desiredRatio;
        }
        const cx = (origWidth - cw) / 2;
        const cy = (origHeight - ch) / 2;
        cropRect = { x: cx, y: cy, width: cw, height: ch };
      }

      const res = await processBrowserImage(source, {
        targetWidth: w,
        targetHeight: h,
        format: format,
        quality: q,
        cropRect,
      });

      setProcessedResult(res);
    } catch (err: any) {
      onShowToast('Image processing error: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger update when parameters change
  const applyChanges = () => {
    if (!previewUrl) return;
    executeProcess(previewUrl, targetWidth, targetHeight, targetFormat, quality / 100, cropPreset);
  };

  const handleWidthChange = (w: number) => {
    setTargetWidth(w);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetHeight(Math.round(w / aspectRatio));
    }
  };

  const handleHeightChange = (h: number) => {
    setTargetHeight(h);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetWidth(Math.round(h * aspectRatio));
    }
  };

  const handleDownload = () => {
    if (!processedResult) return;
    const ok = downloadFile(processedResult.dataUrl, processedResult.filename);
    if (ok) {
      onShowToast(`Downloaded ${processedResult.filename}`, 'success');
    } else {
      onShowToast('Download failed.', 'error');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedResult(null);
    setOrigWidth(0);
    setOrigHeight(0);
    onShowToast('Image cleared.', 'info');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title & Privacy Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-7 h-7 text-purple-400" />
            <span>Browser Image Studio</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resize, convert formats (PNG, JPG, WebP), crop, strip EXIF metadata, and compress without server uploads.
          </p>
        </div>

        {/* Visible Privacy Notice */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>“Your selected image is processed locally in your browser.”</span>
        </div>
      </div>

      {/* Public Image URL Notice Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-800/50 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Public Image URL vs. Local Upload Explanation
            </h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              “A local uploaded image can be previewed in this browser. To create a QR code that opens the image on another phone, use a public image URL.”
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-purple-900/40">
          <input
            type="url"
            value={publicImageUrl}
            onChange={(e) => setPublicImageUrl(e.target.value)}
            placeholder="Paste public image link: https://example.com/photo.jpg"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500 placeholder:text-slate-600"
          />
          {onNavigateToGeneratorWithUrl && (
            <button
              onClick={() => {
                if (!publicImageUrl.trim()) {
                  onShowToast('Please enter a valid image URL first.', 'error');
                  return;
                }
                onNavigateToGeneratorWithUrl(publicImageUrl.trim());
              }}
              className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
            >
              Generate QR for this Image URL
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Area */}
      {!previewUrl ? (
        /* Empty Upload State */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className="border-2 border-dashed border-slate-700 hover:border-purple-500/80 rounded-3xl p-12 text-center bg-slate-900/40 transition-all space-y-4"
        >
          <input
            type="file"
            id="image-tools-upload-input"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
          <label
            htmlFor="image-tools-upload-input"
            className="cursor-pointer flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-200">
                <span className="text-purple-400 underline">Choose an image file</span> or drag & drop here
              </p>
              <p className="text-xs text-slate-400">
                Supports JPG, PNG, and WebP up to 25 MB. Never uploaded to remote servers.
              </p>
            </div>
          </label>
        </div>
      ) : (
        /* Active Processing Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-white text-sm">Processing Controls</h3>
                </div>
                <button
                  onClick={handleClear}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Format Conversion */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Convert Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/webp', label: 'WebP (Smallest)' },
                    { id: 'image/png', label: 'PNG (Lossless)' },
                    { id: 'image/jpeg', label: 'JPG (Standard)' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => {
                        setTargetFormat(fmt.id as any);
                        if (previewUrl) {
                          executeProcess(previewUrl, targetWidth, targetHeight, fmt.id as any, quality / 100, cropPreset);
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        targetFormat === fmt.id
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compression Quality */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Compression Quality</span>
                  <span className="font-mono text-purple-400">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  onMouseUp={applyChanges}
                  onTouchEnd={applyChanges}
                  className="w-full accent-purple-500"
                />
                <p className="text-[11px] text-slate-500">
                  Higher values preserve crisp photographic fidelity; lower values drastically reduce file size.
                </p>
              </div>

              {/* Dimensions Resize */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Resize Dimensions (px)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockAspectRatio}
                      onChange={(e) => setLockAspectRatio(e.target.checked)}
                      className="rounded text-purple-600 bg-slate-950 border-slate-700"
                    />
                    <span>Lock Aspect Ratio</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Width</span>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Height</span>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Crop Presets */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Crop Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Original' },
                    { id: '1:1', label: '1:1 Square' },
                    { id: '16:9', label: '16:9 Widescreen' },
                    { id: '4:3', label: '4:3 Standard' },
                  ].map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => {
                        setCropPreset(cp.id as any);
                        if (previewUrl) {
                          executeProcess(previewUrl, targetWidth, targetHeight, targetFormat, quality / 100, cp.id as any);
                        }
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                        cropPreset === cp.id
                          ? 'bg-purple-600/30 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {cp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              <button
                onClick={applyChanges}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Apply Re-encoding</span>
              </button>
            </div>
          </div>

          {/* Preview & Download Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-semibold text-white text-sm">Processed Result</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-4 h-4" /> EXIF Stripped
                </span>
              </div>

              {/* Image Preview Canvas Display */}
              <div className="relative rounded-xl overflow-hidden bg-black/50 border border-slate-800 flex items-center justify-center min-h-[280px] p-4">
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {processedResult && (
                  <img
                    src={processedResult.dataUrl}
                    alt="Processed output"
                    className="max-h-[380px] max-w-full object-contain rounded-lg shadow-lg"
                  />
                )}
              </div>

              {/* Statistics Comparison */}
              {processedResult && selectedFile && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Original File</span>
                    <span className="font-mono text-slate-300">{formatBytes(selectedFile.size)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Optimized File</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatBytes(processedResult.fileSizeBytes)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-0.5">Dimensions</span>
                    <span className="font-mono text-slate-300">
                      {processedResult.width} × {processedResult.height}px
                    </span>
                  </div>
                </div>
              )}

              {/* Download Action */}
              <button
                onClick={handleDownload}
                disabled={!processedResult}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <Download className="w-4 h-4" />
                <span>Download Processed Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
