import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QRType,
  QRCustomization,
  QRHistoryItem
} from '../types';
import {
  QRFormData,
  initialQRFormData,
  generateQRPayload
} from '../utils/qrPayload';
import {
  renderQRToCanvas,
  generateQRSvgString,
  PRESET_LOGOS
} from '../utils/qrRenderer';
import {
  validateImageFile,
  validateImageToQRFile,
  compressImageForQR,
  processBrowserImage,
  downloadFile,
  formatBytes,
  ProcessedImageResult
} from '../utils/imageProcessing';
import confetti from 'canvas-confetti';
import {
  Globe,
  Image as ImageIcon,
  FileText,
  Wifi,
  Contact,
  CreditCard,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Send,
  Youtube,
  Instagram,
  Code2,
  Download,
  Share2,
  Printer,
  Copy,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Check,
  Shield,
  Upload,
  Info,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X
} from 'lucide-react';

interface QRGeneratorProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSaveHistory?: (item: QRHistoryItem) => void;
  controlledType?: QRType;
  onChangeType?: (type: QRType) => void;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  onShowToast,
  onSaveHistory,
  controlledType,
  onChangeType
}) => {
  // Active QR Category - Default to 'image' (Image to QR)
  const [activeType, setActiveTypeState] = useState<QRType>(controlledType || 'image');

  useEffect(() => {
    if (controlledType) {
      setActiveTypeState(controlledType);
    }
  }, [controlledType]);

  const setActiveType = (type: QRType) => {
    setActiveTypeState(type);
    if (onChangeType) onChangeType(type);
  };

  // Form input data
  const [formData, setFormData] = useState<QRFormData>(initialQRFormData);

  // Dedicated "Image to QR" state
  const [imageSourceMode, setImageSourceMode] = useState<'upload' | 'url'>('upload');
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [localImageDimensions, setLocalImageDimensions] = useState<{ width: number; height: number; originalBytes: number } | null>(null);
  const [imageQuality, setImageQuality] = useState<number>(0.5); // 0.1 to 0.9
  const [imageMaxDimension, setImageMaxDimension] = useState<number>(32); // 24, 32, 48, 64, 128
  const [imageFormat, setImageFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string | null>(null);
  const [compressedPayloadSize, setCompressedPayloadSize] = useState<number>(0);
  const [imagePayloadError, setImagePayloadError] = useState<string | null>(null);

  // Customization Options
  const defaultCustomization: QRCustomization = {
    fgColor: '#000000',
    bgColor: '#ffffff',
    transparentBg: false,
    size: 512,
    errorCorrection: 'M',
    margin: 2,
    dotStyle: 'square',
    centerLogo: null,
    logoPreset: 'none',
    logoSize: 22,
    frameStyle: 'none',
    frameText: 'SCAN ME',
    frameColor: '#1e293b',
    textColor: '#ffffff',
  };

  const [custom, setCustom] = useState<QRCustomization>(defaultCustomization);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Canvas ref for live rendering
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // QR categories: Image to QR is the first and most prominent item
  const categories: { id: QRType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'image', label: 'Image to QR', icon: ImageIcon },
    { id: 'url', label: 'Website URL', icon: Globe },
    { id: 'text', label: 'Plain Text', icon: FileText },
    { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi },
    { id: 'vcard', label: 'vCard Contact', icon: Contact },
    { id: 'upi', label: 'UPI Payment', icon: CreditCard },
    { id: 'email', label: 'Email Draft', icon: Mail },
    { id: 'phone', label: 'Phone Call', icon: Phone },
    { id: 'sms', label: 'SMS Message', icon: MessageSquare },
    { id: 'location', label: 'Map / GPS', icon: MapPin },
    { id: 'calendar', label: 'Calendar Event', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp', icon: Send },
    { id: 'telegram', label: 'Telegram', icon: Send },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'custom', label: 'Custom URL/Raw', icon: Code2 },
  ];

  // Update form data helper
  const handleInputChange = (field: keyof QRFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Compute current raw payload string
  const currentPayload = generateQRPayload(activeType, {
    ...formData,
    imageSourceMode
  });

  // In-browser compression and capacity testing for Image to QR
  const performImageCompressionAndTest = async (
    source: File | string,
    maxDim: number,
    quality: number,
    format: 'image/webp' | 'image/jpeg' | 'image/png'
  ) => {
    setIsCompressingImage(true);
    try {
      const result = await compressImageForQR(source, {
        maxDimension: maxDim,
        quality,
        format,
      });

      setCompressedDataUrl(result.dataUrl);
      setCompressedPayloadSize(result.lengthChars);

      // Verify whether the resulting data URL can physically fit into a QR code
      const testCanvas = document.createElement('canvas');
      try {
        await QRCode.toCanvas(testCanvas, result.dataUrl, {
          errorCorrectionLevel: custom.errorCorrection,
          margin: 1,
        });

        // Success: image data URL fits inside the QR code
        setImagePayloadError(null);
        setFormData((prev) => ({
          ...prev,
          imageDataUrl: result.dataUrl,
          imageSourceMode: 'upload',
        }));
        onShowToast(`Image compressed into QR payload (${result.width}×${result.height}px, ${result.lengthChars} chars)`, 'success');
      } catch (qrErr: any) {
        // Image data URL exceeds QR version 40 capacity
        const errMsg = 'This image is too large to store directly inside a QR code. Please use a public image URL or reduce the image size.';
        setImagePayloadError(errMsg);
        setFormData((prev) => ({
          ...prev,
          imageDataUrl: '',
          imageSourceMode: 'upload',
        }));
      }
    } catch (err: any) {
      setImagePayloadError(err?.message || 'Failed processing image.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Automatically adjust recommended error correction if logo is active
  const hasLogo = !!custom.centerLogo || custom.logoPreset !== 'none';
  const showReliabilityWarning = hasLogo && (custom.errorCorrection === 'L' || custom.errorCorrection === 'M');

  // Trigger QR redraw whenever payload or customization changes
  useEffect(() => {
    let isCancelled = false;
    const updateQR = async () => {
      if (!canvasRef.current) return;

      // If in image mode and payload is in error state or empty
      if (activeType === 'image') {
        if (imagePayloadError) {
          setIsRendering(false);
          setRenderError(null);
          return;
        }
        if (imageSourceMode === 'upload' && !formData.imageDataUrl && !formData.publicImageUrl) {
          setIsRendering(false);
          setRenderError(null);
          return;
        }
      }

      setIsRendering(true);
      setRenderError(null);
      try {
        await renderQRToCanvas(canvasRef.current, currentPayload, custom);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('QR Render error:', err);
          setRenderError(err?.message || 'Failed to render QR Code. Content may be too long for selected error correction.');
        }
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    updateQR();
    return () => {
      isCancelled = true;
    };
  }, [currentPayload, custom, activeType, imagePayloadError, imageSourceMode, formData.imageDataUrl, formData.publicImageUrl]);

  // Handle local image upload in Image to QR tab
  const handleLocalImageSelect = async (file: File) => {
    // Validate image format, size (<10MB), and non-empty
    const val = validateImageToQRFile(file);
    if (!val.valid) {
      onShowToast(val.error || 'Invalid image file.', 'error');
      return;
    }

    setLocalImageFile(file);
    setIsCompressingImage(true);
    setImagePayloadError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const previewUrl = e.target?.result as string;
      setLocalImagePreview(previewUrl);

      const img = new Image();
      img.onload = async () => {
        setLocalImageDimensions({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          originalBytes: file.size,
        });

        await performImageCompressionAndTest(previewUrl, imageMaxDimension, imageQuality, imageFormat);
      };
      img.src = previewUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearLocalImage = () => {
    setLocalImageFile(null);
    setLocalImagePreview(null);
    setLocalImageDimensions(null);
    setCompressedDataUrl(null);
    setCompressedPayloadSize(0);
    setImagePayloadError(null);
    setFormData((prev) => ({
      ...prev,
      imageDataUrl: '',
    }));
    onShowToast('Image preview cleared.', 'info');
  };

  const handleAutoMicroCompress = async () => {
    if (!localImagePreview) return;
    setImageMaxDimension(24);
    setImageQuality(0.35);
    setImageFormat('image/webp');
    await performImageCompressionAndTest(localImagePreview, 24, 0.35, 'image/webp');
  };

  const handleGenerateImageQR = async () => {
    if (imageSourceMode === 'url') {
      if (!formData.publicImageUrl.trim()) {
        onShowToast('Please enter a public image URL.', 'error');
        return;
      }
      setImagePayloadError(null);
      onShowToast('Image QR Code generated from public image URL!', 'success');
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      return;
    }

    // Upload mode
    if (!localImageFile && !localImagePreview) {
      onShowToast('Please upload an image file (JPG, PNG, WebP) or provide a public image URL.', 'error');
      return;
    }

    if (!localImagePreview) return;

    await performImageCompressionAndTest(localImagePreview, imageMaxDimension, imageQuality, imageFormat);

    if (imagePayloadError) {
      onShowToast(imagePayloadError, 'error');
    } else {
      onShowToast('Image to QR Code generated successfully!', 'success');
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
    }
  };

  // Custom Logo upload handler
  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = validateImageFile(file);
    if (!val.valid) {
      onShowToast(val.error || 'Invalid logo image.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustom((prev) => ({
        ...prev,
        centerLogo: dataUrl,
        logoPreset: 'custom',
        errorCorrection: 'H', // auto boost to High for scan safety
      }));
      onShowToast('Logo uploaded. Error correction set to High for scan reliability.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Download PNG
  const handleDownloadPNG = () => {
    if (activeType === 'image' && imagePayloadError) {
      onShowToast(imagePayloadError, 'error');
      return;
    }
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const filename = `zosuf-qr-${activeType}-${Date.now()}.png`;
      const ok = downloadFile(dataUrl, filename);
      if (ok) {
        onShowToast(`Downloaded PNG (${custom.size}x${custom.size}px)`, 'success');
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
        if (onSaveHistory) {
          onSaveHistory({
            id: String(Date.now()),
            title: `QR for ${categories.find(c => c.id === activeType)?.label || activeType}`,
            type: activeType,
            content: currentPayload,
            timestamp: Date.now(),
            dataUrl,
          });
        }
      } else {
        onShowToast('Download failed. Browser blocked the file download.', 'error');
      }
    } catch (err: any) {
      onShowToast('Error exporting PNG: ' + err.message, 'error');
    }
  };

  // Download SVG
  const handleDownloadSVG = async () => {
    if (activeType === 'image' && imagePayloadError) {
      onShowToast(imagePayloadError, 'error');
      return;
    }
    try {
      const svgString = await generateQRSvgString(currentPayload, custom);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const filename = `zosuf-qr-${activeType}-${Date.now()}.svg`;
      const ok = downloadFile(url, filename);
      URL.revokeObjectURL(url);
      if (ok) {
        onShowToast('Downloaded vector SVG QR code!', 'success');
      } else {
        onShowToast('SVG download failed.', 'error');
      }
    } catch (err: any) {
      onShowToast('Failed generating SVG: ' + err.message, 'error');
    }
  };

  // Copy encoded string
  const handleCopyContent = async () => {
    if (activeType === 'image' && imagePayloadError) {
      onShowToast(imagePayloadError, 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentPayload);
      onShowToast('Encoded QR payload copied to clipboard!', 'success');
    } catch (err) {
      onShowToast('Failed copying to clipboard. Check browser permissions.', 'error');
    }
  };

  // Copy page link
  const handleCopyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onShowToast('ZOSUF link copied to clipboard!', 'success');
    } catch (err) {
      onShowToast('Unable to copy page link.', 'error');
    }
  };

  // Print QR
  const handlePrint = () => {
    window.print();
  };

  // Web Share
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ZOSUF QR Code',
          text: `Check out this QR code generated with ZOSUF: ${currentPayload}`,
          url: window.location.href,
        });
        onShowToast('Shared successfully!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          onShowToast('Share was cancelled or unsupported.', 'info');
        }
      }
    } else {
      // Fallback: Copy content
      handleCopyContent();
      onShowToast('Web Share API not supported on this browser. Content copied instead!', 'info');
    }
  };

  // Reset form
  const handleResetForm = () => {
    setFormData(initialQRFormData);
    onShowToast('Form content reset to defaults.', 'info');
  };

  // Reset customization
  const handleResetCustomization = () => {
    setCustom(defaultCustomization);
    onShowToast('Customization restored to default sleek theme.', 'info');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Category Tabs Header */}
      <section aria-labelledby="qr-type-heading" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="qr-type-heading" className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
              <span>Select QR Code Type</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-normal">
                16 Formats
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Choose the exact format you want to encode. No accounts, no fees, instant high-res generation.
            </p>
          </div>
          <button
            onClick={handleResetForm}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Content</span>
          </button>
        </div>

        {/* Scrollable / Grid Category Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeType === cat.id;
            return (
              <button
                key={cat.id}
                id={`qr-category-btn-${cat.id}`}
                onClick={() => setActiveType(cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all min-h-[72px] ${
                  isSelected
                    ? 'bg-gradient-to-b from-purple-600/30 to-violet-900/40 border-purple-500 text-white shadow-lg shadow-purple-950/50 scale-[1.02]'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-purple-300' : 'text-slate-400'}`} />
                <span className="text-[11px] font-medium leading-tight line-clamp-1">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Generator Workspace: Split 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Customization Drawer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dynamic Content Form Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-display font-semibold text-white text-base">
                  {categories.find((c) => c.id === activeType)?.label} Data
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">100% Client-Side</span>
            </div>

            {/* Form Fields according to activeType */}

            {/* 1. WEBSITE URL */}
            {activeType === 'url' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Target Website URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    id="input-url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Enter any valid address. When scanned with any smartphone camera, the browser will open this webpage directly.
                </p>
              </div>
            )}

            {/* 1. IMAGE TO QR GENERATOR (Primary & Most Prominent Feature) */}
            {activeType === 'image' && (
              <div className="space-y-5">
                {/* Header Badge and Notice Banner */}
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-purple-300">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Image to QR Generator</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-900/60 text-[10px] text-purple-300 font-mono">
                      JPG • PNG • WebP
                    </span>
                  </div>
                  <p className="leading-relaxed text-purple-100 text-[13px] font-medium">
                    “Small images can be encoded directly into a QR code. For normal-size images, use a public image URL so the QR code can open the image on any phone.”
                  </p>
                  <p className="text-[11px] text-purple-300/80">
                    100% Client-Side Privacy: Your images are processed directly in your browser without any server uploads, databases, or accounts.
                  </p>
                </div>

                {/* Mode Selector Tabs: Upload Image vs Public Image URL */}
                <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setImageSourceMode('upload');
                      if (localImagePreview) {
                        performImageCompressionAndTest(localImagePreview, imageMaxDimension, imageQuality, imageFormat);
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      imageSourceMode === 'upload'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image (JPG, PNG, WebP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageSourceMode('url');
                      setImagePayloadError(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      imageSourceMode === 'url'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Public Image URL</span>
                  </button>
                </div>

                {/* MODE 1: Upload Image File */}
                {imageSourceMode === 'upload' && (
                  <div className="space-y-4">
                    {/* Drag-and-drop upload zone */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleLocalImageSelect(f);
                      }}
                      className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 text-center transition-all bg-slate-950/60 group cursor-pointer"
                    >
                      <input
                        type="file"
                        id="image-to-qr-upload-input"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLocalImageSelect(f);
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="image-to-qr-upload-input"
                        className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold text-purple-400 hover:underline">Choose an image</span> or drag and drop JPG, PNG, WebP
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Maximum file size: 10 MB • Processed 100% locally in browser
                        </p>
                      </label>
                    </div>

                    {/* Image Preview & Controls Card */}
                    {localImagePreview && (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                            <span>Uploaded Image Preview</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleClearLocalImage}
                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-rose-950/30 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>Clear Image</span>
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                          <div className="relative group">
                            <img
                              src={localImagePreview}
                              alt="Uploaded preview"
                              className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-slate-700 shadow-md bg-slate-900"
                            />
                            {isCompressingImage && (
                              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center rounded-xl">
                                <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-400 flex-1 w-full">
                            <div className="flex items-center justify-between text-slate-200 font-semibold truncate">
                              <span className="truncate">{localImageFile?.name || 'Local Image'}</span>
                              <span className="text-[11px] font-mono text-purple-300">
                                {localImageDimensions ? `${localImageDimensions.width}×${localImageDimensions.height}px` : ''}
                              </span>
                            </div>

                            {localImageDimensions && (
                              <p className="text-[11px] text-slate-400">
                                Original size: <span className="text-slate-200 font-medium">{formatBytes(localImageDimensions.originalBytes)}</span>
                              </p>
                            )}

                            {/* Payload status and capacity check */}
                            {imagePayloadError ? (
                              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] space-y-1.5">
                                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                                  <span>Payload exceeds direct QR storage capacity</span>
                                </div>
                                <p className="leading-tight text-amber-200/90">
                                  {imagePayloadError}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleAutoMicroCompress}
                                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px]"
                                  >
                                    Auto-Compress to Micro (24px)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setImageSourceMode('url')}
                                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium"
                                  >
                                    Use Public Image URL Instead
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Fits directly in QR payload</span>
                                </span>
                                <span className="font-mono text-[10px] text-emerald-400">
                                  {compressedPayloadSize} chars
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Image Quality & Compression Controls */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-purple-400" />
                              <span>QR Image Optimization Controls</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Max QR Limit ~2,953 bytes
                            </span>
                          </div>

                          {/* Quick dimension presets */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Micro (24px)', dim: 24, q: 0.35, note: 'Highest fit rate' },
                              { label: 'Compact (32px)', dim: 32, q: 0.5, note: 'Recommended' },
                              { label: 'Standard (48px)', dim: 48, q: 0.65, note: 'Detailed icon' },
                            ].map((preset) => (
                              <button
                                key={preset.dim}
                                type="button"
                                onClick={async () => {
                                  setImageMaxDimension(preset.dim);
                                  setImageQuality(preset.q);
                                  if (localImagePreview) {
                                    await performImageCompressionAndTest(localImagePreview, preset.dim, preset.q, imageFormat);
                                  }
                                }}
                                className={`p-2 rounded-lg border text-left transition-all ${
                                  imageMaxDimension === preset.dim
                                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-sm'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <div className="text-xs font-semibold">{preset.label}</div>
                                <div className="text-[10px] text-slate-500">{preset.note}</div>
                              </button>
                            ))}
                          </div>

                          {/* Sliders for fine tuning */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                <span>Max Resolution</span>
                                <span className="font-mono text-purple-300">{imageMaxDimension}px</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="64"
                                step="2"
                                value={imageMaxDimension}
                                onChange={async (e) => {
                                  const dim = Number(e.target.value);
                                  setImageMaxDimension(dim);
                                  if (localImagePreview) {
                                    await performImageCompressionAndTest(localImagePreview, dim, imageQuality, imageFormat);
                                  }
                                }}
                                className="w-full accent-purple-500"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                <span>Compression Quality</span>
                                <span className="font-mono text-purple-300">{Math.round(imageQuality * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0.15"
                                max="0.85"
                                step="0.05"
                                value={imageQuality}
                                onChange={async (e) => {
                                  const q = Number(e.target.value);
                                  setImageQuality(q);
                                  if (localImagePreview) {
                                    await performImageCompressionAndTest(localImagePreview, imageMaxDimension, q, imageFormat);
                                  }
                                }}
                                className="w-full accent-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Public Image URL Field */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="input-public-image-url"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    >
                      Public Image URL <span className="text-purple-400 font-normal normal-case">— Universal phone scanning</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Scannable on all phones</span>
                  </div>
                  <input
                    type="url"
                    id="input-public-image-url"
                    value={formData.publicImageUrl}
                    onChange={(e) => {
                      handleInputChange('publicImageUrl', e.target.value);
                      if (e.target.value.trim()) {
                        setImagePayloadError(null);
                      }
                    }}
                    placeholder="https://example.com/my-photo.jpg or https://images.unsplash.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    “Small images can be encoded directly into a QR code. For normal-size images, use a public image URL so the QR code can open the image on any phone.”
                  </p>
                </div>

                {/* Explicit Generate Image QR Action Button */}
                <button
                  type="button"
                  id="btn-generate-image-qr"
                  onClick={handleGenerateImageQR}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Image QR</span>
                </button>
              </div>
            )}

            {/* 3. PLAIN TEXT */}
            {activeType === 'text' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Plain Text Content
                </label>
                <textarea
                  id="input-text"
                  rows={4}
                  value={formData.text}
                  onChange={(e) => handleInputChange('text', e.target.value)}
                  placeholder="Type any message, notes, passwords, or instructions..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            )}

            {/* 4. WI-FI NETWORK */}
            {activeType === 'wifi' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Network Name (SSID) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-wifi-ssid"
                      value={formData.wifiSsid}
                      onChange={(e) => handleInputChange('wifiSsid', e.target.value)}
                      placeholder="e.g. Home_WiFi_5G"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Security Type
                    </label>
                    <select
                      value={formData.wifiEncryption}
                      onChange={(e) => handleInputChange('wifiEncryption', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    >
                      <option value="WPA">WPA/WPA2/WPA3 (Standard)</option>
                      <option value="WEP">WEP (Legacy)</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                </div>

                {formData.wifiEncryption !== 'nopass' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Wi-Fi Password
                    </label>
                    <input
                      type="text"
                      id="input-wifi-password"
                      value={formData.wifiPassword}
                      onChange={(e) => handleInputChange('wifiPassword', e.target.value)}
                      placeholder="Network security key"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.wifiHidden}
                    onChange={(e) => handleInputChange('wifiHidden', e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">Hidden SSID (Network does not broadcast name)</span>
                </label>
              </div>
            )}

            {/* 5. VCARD / CONTACT DETAILS */}
            {activeType === 'vcard' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.vcardFirstName}
                      onChange={(e) => handleInputChange('vcardFirstName', e.target.value)}
                      placeholder="Alex"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.vcardLastName}
                      onChange={(e) => handleInputChange('vcardLastName', e.target.value)}
                      placeholder="Morgan"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.vcardPhone}
                      onChange={(e) => handleInputChange('vcardPhone', e.target.value)}
                      placeholder="+1 (555) 234-5678"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.vcardEmail}
                      onChange={(e) => handleInputChange('vcardEmail', e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={formData.vcardOrg}
                      onChange={(e) => handleInputChange('vcardOrg', e.target.value)}
                      placeholder="Design Studio"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={formData.vcardTitle}
                      onChange={(e) => handleInputChange('vcardTitle', e.target.value)}
                      placeholder="Product Lead"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. UPI PAYMENT */}
            {activeType === 'upi' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200">
                  Generates an interoperable UPI payment link (Google Pay, PhonePe, Paytm, BHIM, etc.).
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UPI ID / VPA <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.upiVpa}
                      onChange={(e) => handleInputChange('upiVpa', e.target.value)}
                      placeholder="e.g. name@okhdfcbank"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payee Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.upiPayeeName}
                      onChange={(e) => handleInputChange('upiPayeeName', e.target.value)}
                      placeholder="e.g. Mark Zosuf"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Amount (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.upiAmount}
                      onChange={(e) => handleInputChange('upiAmount', e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Payment Note
                    </label>
                    <input
                      type="text"
                      value={formData.upiNote}
                      onChange={(e) => handleInputChange('upiNote', e.target.value)}
                      placeholder="e.g. Consulting Services"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. EMAIL */}
            {activeType === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={formData.emailRecipient}
                    onChange={(e) => handleInputChange('emailRecipient', e.target.value)}
                    placeholder="contact@zosuf.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.emailSubject}
                    onChange={(e) => handleInputChange('emailSubject', e.target.value)}
                    placeholder="Project Inquiry"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Message Body</label>
                  <textarea
                    rows={3}
                    value={formData.emailBody}
                    onChange={(e) => handleInputChange('emailBody', e.target.value)}
                    placeholder="Hello, I would like to get in touch regarding..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 8. PHONE CALL */}
            {activeType === 'phone' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Phone Number (with Country Code)
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* 9. SMS */}
            {activeType === 'sms' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.smsNumber}
                    onChange={(e) => handleInputChange('smsNumber', e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pre-filled SMS Text</label>
                  <textarea
                    rows={3}
                    value={formData.smsMessage}
                    onChange={(e) => handleInputChange('smsMessage', e.target.value)}
                    placeholder="I am interested in your listing..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 10. MAPS / LOCATION */}
            {activeType === 'location' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={formData.locationLat}
                      onChange={(e) => handleInputChange('locationLat', e.target.value)}
                      placeholder="37.7749"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={formData.locationLng}
                      onChange={(e) => handleInputChange('locationLng', e.target.value)}
                      placeholder="-122.4194"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Or Address / Place Query</label>
                  <input
                    type="text"
                    value={formData.locationQuery}
                    onChange={(e) => handleInputChange('locationQuery', e.target.value)}
                    placeholder="Eiffel Tower, Paris"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 11. CALENDAR EVENT */}
            {activeType === 'calendar' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={formData.calTitle}
                    onChange={(e) => handleInputChange('calTitle', e.target.value)}
                    placeholder="Product Launch Keynote"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.calStart}
                      onChange={(e) => handleInputChange('calStart', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={formData.calEnd}
                      onChange={(e) => handleInputChange('calEnd', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Event Location</label>
                  <input
                    type="text"
                    value={formData.calLocation}
                    onChange={(e) => handleInputChange('calLocation', e.target.value)}
                    placeholder="Convention Center / Zoom"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 12. WHATSAPP */}
            {activeType === 'whatsapp' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    WhatsApp Phone Number (with Country Code)
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsappPhone}
                    onChange={(e) => handleInputChange('whatsappPhone', e.target.value)}
                    placeholder="e.g. 15551234567"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pre-filled Chat Message</label>
                  <textarea
                    rows={3}
                    value={formData.whatsappMessage}
                    onChange={(e) => handleInputChange('whatsappMessage', e.target.value)}
                    placeholder="Hi! I scanned your ZOSUF QR code and wanted to connect..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 13. TELEGRAM */}
            {activeType === 'telegram' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Telegram Username or Channel Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-mono text-sm">@</span>
                  <input
                    type="text"
                    value={formData.telegramUsername}
                    onChange={(e) => handleInputChange('telegramUsername', e.target.value)}
                    placeholder="channel_or_user"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 14. YOUTUBE */}
            {activeType === 'youtube' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  YouTube Video or Channel Link
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* 15. INSTAGRAM */}
            {activeType === 'instagram' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Instagram Handle or Post URL
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-mono text-sm">@</span>
                  <input
                    type="text"
                    value={formData.instagramUsername}
                    onChange={(e) => handleInputChange('instagramUsername', e.target.value)}
                    placeholder="markzosuf"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-pink-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: Visit the creator's profile at @markzosuf
                </p>
              </div>
            )}

            {/* 16. CUSTOM */}
            {activeType === 'custom' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Custom String or Raw URL Scheme
                </label>
                <textarea
                  rows={4}
                  value={formData.customText}
                  onChange={(e) => handleInputChange('customText', e.target.value)}
                  placeholder="customscheme://action?id=123"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 font-mono text-white text-xs outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* Customization Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="font-display font-semibold text-white text-base">
                  Visual Customization & Frame
                </h3>
              </div>
              <button
                onClick={handleResetCustomization}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Reset Customization
              </button>
            </div>

            {/* Scan Reliability Warning if needed */}
            {showReliabilityWarning && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Readability Warning: </span>
                  When embedding a center logo, use <strong>Quartile (Q)</strong> or <strong>High (H)</strong> error correction so phone cameras can reliably scan the code even with the obstructed center.
                </div>
              </div>
            )}

            {/* Colors Section */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Colors & Theme
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Foreground */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-300">QR Pattern Color</span>
                    <p className="text-[11px] text-slate-500 font-mono">{custom.fgColor}</p>
                  </div>
                  <input
                    type="color"
                    value={custom.fgColor}
                    onChange={(e) => setCustom((prev) => ({ ...prev, fgColor: e.target.value }))}
                    className="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                </div>

                {/* Background */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-medium text-slate-300">Background Color</span>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {custom.transparentBg ? 'Transparent' : custom.bgColor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!custom.transparentBg && (
                      <input
                        type="color"
                        value={custom.bgColor}
                        onChange={(e) => setCustom((prev) => ({ ...prev, bgColor: e.target.value }))}
                        className="w-9 h-9 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                    )}
                    <button
                      onClick={() => setCustom((prev) => ({ ...prev, transparentBg: !prev.transparentBg }))}
                      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                        custom.transparentBg
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Transparent
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Dots & Size */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pattern Style</label>
                <select
                  value={custom.dotStyle}
                  onChange={(e) => setCustom((prev) => ({ ...prev, dotStyle: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
                >
                  <option value="square">Standard Crisp Square</option>
                  <option value="rounded">Smooth Rounded</option>
                  <option value="dots">Modern Dot Matrix</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Export Resolution</label>
                <select
                  value={custom.size}
                  onChange={(e) => setCustom((prev) => ({ ...prev, size: Number(e.target.value) as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
                >
                  <option value={256}>256px (Compact Web)</option>
                  <option value={512}>512px (High Quality)</option>
                  <option value={1024}>1024px (Ultra Print HD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Error Correction</label>
                <select
                  value={custom.errorCorrection}
                  onChange={(e) => setCustom((prev) => ({ ...prev, errorCorrection: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none"
                >
                  <option value="L">Low (7% recovery)</option>
                  <option value="M">Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery - Best for Logos)</option>
                </select>
              </div>
            </div>

            {/* Frame & Banner Styling */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Frame & Call-to-Action Text
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'No Frame' },
                  { id: 'bottom-banner', label: 'Bottom Banner' },
                  { id: 'top-banner', label: 'Top Banner' },
                  { id: 'polaroid', label: 'Polaroid Style' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCustom((prev) => ({ ...prev, frameStyle: f.id as any }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      custom.frameStyle === f.id
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {custom.frameStyle !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Banner Label</label>
                    <input
                      type="text"
                      value={custom.frameText}
                      onChange={(e) => setCustom((prev) => ({ ...prev, frameText: e.target.value }))}
                      placeholder="SCAN ME"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Frame Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={custom.frameColor}
                        onChange={(e) => setCustom((prev) => ({ ...prev, frameColor: e.target.value }))}
                        className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-400">{custom.frameColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={custom.textColor}
                        onChange={(e) => setCustom((prev) => ({ ...prev, textColor: e.target.value }))}
                        className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-400">{custom.textColor}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Center Logo Section */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Center Logo Overlay
                </span>
                {hasLogo && (
                  <button
                    onClick={() => setCustom((prev) => ({ ...prev, centerLogo: null, logoPreset: 'none' }))}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Remove Logo
                  </button>
                )}
              </div>

              {/* Preset Logos */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'youtube', label: 'YouTube' },
                  { id: 'wifi', label: 'Wi-Fi' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setCustom((prev) => ({
                        ...prev,
                        logoPreset: preset.id as any,
                        centerLogo: null,
                        errorCorrection: preset.id !== 'none' ? 'H' : prev.errorCorrection,
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      custom.logoPreset === preset.id
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* Custom upload button */}
                <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-purple-500 text-xs font-medium text-purple-300 bg-slate-950 transition-colors flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {hasLogo && (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Logo Size Scale</span>
                    <span>{custom.logoSize}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={28}
                    value={custom.logoSize}
                    onChange={(e) => setCustom((prev) => ({ ...prev, logoSize: Number(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live QR Preview & Actions (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          {/* Printable Container for Clean Window Print */}
          <div
            id="printable-qr-area"
            className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            {/* Subtle glow background */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Live Scannable Preview</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-purple-300">
                {custom.size}×{custom.size}px
              </span>
            </div>

            {/* Error Message / State Display */}
            {activeType === 'image' && imagePayloadError ? (
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-center space-y-3 max-w-sm">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="font-semibold text-amber-300 text-sm leading-snug">
                  {imagePayloadError}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Small images can be encoded directly into a QR code. For normal-size images, use a public image URL so the QR code can open the image on any phone.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageSourceMode('url');
                      const el = document.getElementById('input-public-image-url');
                      if (el) el.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow"
                  >
                    Use Public Image URL
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoMicroCompress}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    Auto-Compress to Micro (24px)
                  </button>
                </div>
              </div>
            ) : activeType === 'image' && imageSourceMode === 'upload' && !formData.imageDataUrl && !formData.publicImageUrl ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3 max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-200">Image to QR Ready</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload an image (JPG, PNG, WebP) or enter a public image URL to generate your scannable QR code.
                </p>
              </div>
            ) : renderError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 max-w-xs space-y-2">
                <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                <p>{renderError}</p>
                <button
                  type="button"
                  onClick={() => setCustom((prev) => ({ ...prev, errorCorrection: 'L' }))}
                  className="px-3 py-1 rounded bg-rose-600 text-white font-medium text-[11px]"
                >
                  Try Lower Error Correction
                </button>
              </div>
            ) : (
              <div className="relative group p-2 bg-transparent rounded-xl flex items-center justify-center min-h-[260px]">
                {isRendering && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  id="zosuf-qr-canvas"
                  className="max-w-full h-auto max-h-[320px] rounded-lg shadow-xl shadow-black/60 object-contain transition-transform group-hover:scale-[1.01]"
                />
              </div>
            )}

            {/* Encoded Content Preview info */}
            <div className="w-full mt-4 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Encoded Payload ({currentPayload.length} chars)
              </span>
              <p className="font-mono text-[11px] text-slate-300 truncate selection:bg-purple-900">
                {currentPayload}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full mt-5 space-y-2.5">
              {/* Primary Download PNG */}
              <button
                id="btn-download-png"
                onClick={handleDownloadPNG}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res PNG ({custom.size}px)</span>
              </button>

              {/* Secondary Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  id="btn-download-svg"
                  onClick={handleDownloadSVG}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Download scalable vector SVG"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SVG</span>
                </button>

                <button
                  id="btn-copy-payload"
                  onClick={handleCopyContent}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy encoded raw text"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-400" />
                  <span>Copy</span>
                </button>

                <button
                  id="btn-share-qr"
                  onClick={handleWebShare}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Share using device share dialog"
                >
                  <Share2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Share</span>
                </button>

                <button
                  id="btn-print-qr"
                  onClick={handlePrint}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  title="Print QR code sheet"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick FAQ / Helper card */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="font-semibold text-slate-300 block">Pro Scan Tip</span>
            <p>
              High-contrast QR codes (dark pattern on light background) scan fastest across all phone cameras under varying lighting conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
