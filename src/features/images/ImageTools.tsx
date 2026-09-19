import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2,
  Upload,
  Download,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Maximize2,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ProcessedImageResult } from '../../types/image';
import { processImage } from '../../utils/canvasImageOps';

export const ImageTools: React.FC = () => {
  const navigate = useNavigate();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImageEl, setSourceImageEl] = useState<HTMLImageElement | null>(null);

  // Transformations state
  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(600);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [quality, setQuality] = useState<number>(0.85);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Output result
  const [processed, setProcessed] = useState<ProcessedImageResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState('');

  // Load selected file
  const handleSelectFile = (file: File) => {
    setProcessError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setProcessError('Choose a JPG, PNG or WebP image.'); return; }
    if (file.size > 20 * 1024 * 1024) { setProcessError('Image must be smaller than 20 MB.'); return; }
    setSourceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => { setProcessError('This image could not be decoded.'); setSourceFile(null); };
      img.onload = () => {
        setSourceImageEl(img);
        setTargetWidth(img.naturalWidth);
        setTargetHeight(img.naturalHeight);
        setAspectRatio(img.naturalWidth / img.naturalHeight);
        runProcessing(img, {
          targetWidth: img.naturalWidth,
          targetHeight: img.naturalHeight,
          quality,
          format,
          rotateDegrees: 0,
          flipHorizontal: false,
          flipVertical: false,
          backgroundColor: bgColor,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => { setProcessError('This file could not be read.'); setSourceFile(null); };
    reader.readAsDataURL(file);
  };

  const runProcessing = async (
    img: HTMLImageElement,
    customOpts?: Partial<{
      targetWidth: number;
      targetHeight: number;
      quality: number;
      format: 'image/jpeg' | 'image/png' | 'image/webp';
      rotateDegrees: number;
      flipHorizontal: boolean;
      flipVertical: boolean;
      backgroundColor: string;
    }>
  ) => {
    setIsProcessing(true);
    setProcessError('');
    try {
      const res = await processImage(img, {
        targetWidth: customOpts?.targetWidth ?? targetWidth,
        targetHeight: customOpts?.targetHeight ?? targetHeight,
        quality: customOpts?.quality ?? quality,
        format: customOpts?.format ?? format,
        rotateDegrees: customOpts?.rotateDegrees ?? rotation,
        flipHorizontal: customOpts?.flipHorizontal ?? flipH,
        flipVertical: customOpts?.flipVertical ?? flipV,
        backgroundColor: customOpts?.backgroundColor ?? bgColor,
      });
      setProcessed(res);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : 'Image processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (keepAspectRatio && aspectRatio > 0) {
      const h = Math.round(val / aspectRatio);
      setTargetHeight(h);
      if (sourceImageEl) runProcessing(sourceImageEl, { targetWidth: val, targetHeight: h });
    } else {
      if (sourceImageEl) runProcessing(sourceImageEl, { targetWidth: val });
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (keepAspectRatio && aspectRatio > 0) {
      const w = Math.round(val * aspectRatio);
      setTargetWidth(w);
      if (sourceImageEl) runProcessing(sourceImageEl, { targetWidth: w, targetHeight: val });
    } else {
      if (sourceImageEl) runProcessing(sourceImageEl, { targetHeight: val });
    }
  };

  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    if (sourceImageEl) runProcessing(sourceImageEl, { rotateDegrees: nextRot });
  };

  const handleFlipH = () => {
    const nextH = !flipH;
    setFlipH(nextH);
    if (sourceImageEl) runProcessing(sourceImageEl, { flipHorizontal: nextH });
  };

  const handleFlipV = () => {
    const nextV = !flipV;
    setFlipV(nextV);
    if (sourceImageEl) runProcessing(sourceImageEl, { flipVertical: nextV });
  };

  const handleDownload = () => {
    if (!processed) return;
    const a = document.createElement('a');
    a.href = processed.dataUrl;
    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
    a.download = `zosuf-processed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClear = () => {
    setSourceFile(null);
    setSourceImageEl(null);
    setProcessed(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>100% In-Browser Privacy • Zero Server Upload</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Browser-Based Image Tools
        </h1>
        <p className="text-slate-300 text-sm">
          Image processing happens locally in your browser. Resize, compress, reformat, rotate, flip, and strip metadata with Canvas precision.
        </p>
      </div>

      {processError && <div role="alert" className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-sm text-rose-300">{processError}</div>}

      {!sourceFile ? (
        /* Upload Area */
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleSelectFile(f);
          }}
          className="p-12 rounded-3xl border-2 border-dashed border-slate-800 hover:border-violet-500 bg-slate-900/30 text-center space-y-4 cursor-pointer transition"
          onClick={() => {
            document.getElementById('image-tools-file-input')?.click();
          }}
        >
          <input
            id="image-tools-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleSelectFile(f);
            }}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-violet-950/60 text-violet-400 border border-violet-800/40 mx-auto flex items-center justify-center">
            <Wand2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Choose or Drop an Image</h3>
            <p className="text-xs text-slate-400">
              Supports JPG, PNG, WebP and GIF. All processing happens in local RAM.
            </p>
          </div>
        </div>
      ) : (
        /* Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editing Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  Transforms & Settings
                </span>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Image</span>
                </button>
              </div>

              {/* Format Selection */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Target File Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/webp', label: 'WebP (Modern Compact)' },
                    { id: 'image/jpeg', label: 'JPEG (Universal)' },
                    { id: 'image/png', label: 'PNG (Lossless / Transparent)' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => {
                        const nextFmt = fmt.id as any;
                        setFormat(nextFmt);
                        if (sourceImageEl) runProcessing(sourceImageEl, { format: nextFmt });
                      }}
                      className={`p-2 rounded-xl border text-center font-semibold transition ${
                        format === fmt.id
                          ? 'bg-violet-600/30 border-violet-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* JPEG Background Color if applicable */}
              {format === 'image/jpeg' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <label className="text-slate-300 font-semibold">JPG Background Fill</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        setBgColor(e.target.value);
                        if (sourceImageEl) runProcessing(sourceImageEl, { backgroundColor: e.target.value });
                      }}
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <span className="text-slate-400 font-mono">{bgColor}</span>
                  </div>
                </div>
              )}

              {/* Resize Dimensions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Dimensions (Pixels)</label>
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepAspectRatio}
                      onChange={(e) => setKeepAspectRatio(e.target.checked)}
                      className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                    />
                    <span>Keep Aspect Ratio</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">Width (px)</span>
                    <input
                      type="number"
                      value={targetWidth}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">Height (px)</span>
                    <input
                      type="number"
                      value={targetHeight}
                      onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Compression Quality Slider */}
              {format !== 'image/png' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold">Compression Quality</span>
                    <span className="font-mono text-violet-400 font-bold">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => {
                      const q = parseFloat(e.target.value);
                      setQuality(q);
                      if (sourceImageEl) runProcessing(sourceImageEl, { quality: q });
                    }}
                    className="w-full accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>10% (Maximum Compression)</span>
                    <span>85% (Balanced)</span>
                    <span>100% (High Quality)</span>
                  </div>
                </div>
              )}

              {/* Rotation & Flip Controls */}
              <div className="space-y-1.5 pt-2">
                <label className="text-slate-300 font-semibold">Orientation & Flip</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRotate}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90° ({rotation}°)</span>
                  </button>
                  <button
                    onClick={handleFlipH}
                    className={`p-2 rounded-xl border transition ${
                      flipH ? 'bg-violet-600 text-white border-violet-500' : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                    title="Flip Horizontally"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFlipV}
                    className={`p-2 rounded-xl border transition ${
                      flipV ? 'bg-violet-600 text-white border-violet-500' : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                    title="Flip Vertically"
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Previews & Download Action */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Processed Preview
                </h3>
                {isProcessing && <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />}
              </div>

              {/* Preview Container */}
              <div className="w-full aspect-video rounded-2xl bg-black/60 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                {processed ? (
                  <img
                    src={processed.dataUrl}
                    alt="Processed result"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Processing...</span>
                )}
              </div>

              {/* Comparison Statistics */}
              {processed && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Original File</span>
                    <span className="font-mono font-bold text-slate-200">
                      {(processed.originalSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Processed File</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {(processed.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                    {processed.originalSizeBytes > 0 && (
                      <span className="text-[10px] text-emerald-400/80 ml-1">
                        (-{Math.max(0, Math.round((1 - processed.sizeBytes / processed.originalSizeBytes) * 100))}%)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDownload}
                  disabled={!processed}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-violet-950 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Processed Image</span>
                </button>

                <button
                  onClick={() => navigate('/image-to-qr')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-violet-800/60 bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 font-semibold text-xs transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Send to Image-to-QR Generator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
