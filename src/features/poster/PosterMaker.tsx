import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  Download,
  Palette,
  Type,
  Layout,
  QrCode,
  Sparkles,
  Share2,
} from 'lucide-react';
import QRCodeStyling from 'qr-code-styling';
import { siteConfig } from '../../config/site';

type PosterSize = 'a4' | 'a5' | 'square' | 'story';

interface PosterTheme {
  id: string;
  name: string;
  bgGradient: [string, string];
  titleColor: string;
  subColor: string;
  ctaBg: string;
  ctaText: string;
  qrBg: string;
  qrFg: string;
}

const POSTER_THEMES: PosterTheme[] = [
  {
    id: 'zosuf-neon',
    name: 'ZOSUF Neon',
    bgGradient: ['#090a1e', '#16082f'],
    titleColor: '#ffffff',
    subColor: '#c084fc',
    ctaBg: '#7c3aed',
    ctaText: '#ffffff',
    qrBg: '#ffffff',
    qrFg: '#090a1e',
  },
  {
    id: 'clean-white',
    name: 'Clean Minimal White',
    bgGradient: ['#ffffff', '#f1f5f9'],
    titleColor: '#09090b',
    subColor: '#475569',
    ctaBg: '#09090b',
    ctaText: '#ffffff',
    qrBg: '#ffffff',
    qrFg: '#09090b',
  },
  {
    id: 'sunset-festive',
    name: 'Sunset Festive',
    bgGradient: ['#1e0a24', '#3b0718'],
    titleColor: '#ffffff',
    subColor: '#fb923c',
    ctaBg: '#f43f5e',
    ctaText: '#ffffff',
    qrBg: '#ffffff',
    qrFg: '#881337',
  },
  {
    id: 'emerald-eco',
    name: 'Emerald Eco',
    bgGradient: ['#021c16', '#062d22'],
    titleColor: '#ffffff',
    subColor: '#34d399',
    ctaBg: '#059669',
    ctaText: '#ffffff',
    qrBg: '#ffffff',
    qrFg: '#064e3b',
  },
  {
    id: 'cyber-dark',
    name: 'Cyber Dark',
    bgGradient: ['#000000', '#0a0d14'],
    titleColor: '#22d3ee',
    subColor: '#94a3b8',
    ctaBg: '#0891b2',
    ctaText: '#ffffff',
    qrBg: '#ffffff',
    qrFg: '#000000',
  },
];

export const PosterMaker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<PosterSize>('a4');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('zosuf-neon');

  // Text contents
  const [title, setTitle] = useState('CONNECT & EXPLORE');
  const [subtitle, setSubtitle] = useState('Scan with any smartphone camera to visit our official page');
  const [ctaText, setCtaText] = useState('SCAN WITH SMARTPHONE CAMERA');
  const [footerNote, setFooterNote] = useState('Free High-Speed Access • No App Download Required');

  // QR Payload
  const [qrPayload, setQrPayload] = useState(siteConfig.productionUrl);

  const activeTheme = POSTER_THEMES.find((t) => t.id === selectedThemeId) || POSTER_THEMES[0];

  // Canvas Dimensions mapping
  const dimensionsMap: Record<PosterSize, { width: number; height: number; label: string }> = {
    a4: { width: 1240, height: 1754, label: 'A4 Print (210 x 297 mm)' },
    a5: { width: 874, height: 1240, label: 'A5 Flyer (148 x 210 mm)' },
    square: { width: 1080, height: 1080, label: 'Square Social (1080 x 1080)' },
    story: { width: 1080, height: 1920, label: 'Story / Reel (1080 x 1920)' },
  };

  const { width: cWidth, height: cHeight } = dimensionsMap[size];

  // Draw Poster onto high-res canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cWidth;
    canvas.height = cHeight;

    // 1. Draw Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, cHeight);
    bgGrad.addColorStop(0, activeTheme.bgGradient[0]);
    bgGrad.addColorStop(1, activeTheme.bgGradient[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cWidth, cHeight);

    // 2. Decorative geometric grid border
    ctx.strokeStyle = activeTheme.subColor;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, cWidth - 80, cHeight - 80);
    ctx.strokeRect(55, 55, cWidth - 110, cHeight - 110);
    ctx.globalAlpha = 1.0;

    // Corner decorative accents
    ctx.fillStyle = activeTheme.subColor;
    const markerSize = 20;
    ctx.fillRect(40, 40, markerSize, 3);
    ctx.fillRect(40, 40, 3, markerSize);
    ctx.fillRect(cWidth - 40 - markerSize, 40, markerSize, 3);
    ctx.fillRect(cWidth - 43, 40, 3, markerSize);
    ctx.fillRect(40, cHeight - 43, markerSize, 3);
    ctx.fillRect(40, cHeight - 40 - markerSize, 3, markerSize);
    ctx.fillRect(cWidth - 40 - markerSize, cHeight - 43, markerSize, 3);
    ctx.fillRect(cWidth - 43, cHeight - 40 - markerSize, 3, markerSize);

    // 3. Render Title & Subtitle
    ctx.textAlign = 'center';

    // Title
    const titleFontSize = Math.round(cWidth * 0.055);
    ctx.font = `900 ${titleFontSize}px sans-serif`;
    ctx.fillStyle = activeTheme.titleColor;
    ctx.fillText(title.toUpperCase(), cWidth / 2, cHeight * 0.16);

    // Subtitle
    const subFontSize = Math.round(cWidth * 0.026);
    ctx.font = `500 ${subFontSize}px sans-serif`;
    ctx.fillStyle = activeTheme.subColor;
    ctx.fillText(subtitle, cWidth / 2, cHeight * 0.22);

    // 4. Generate QR code image
    const qrSize = Math.round(cWidth * 0.48);
    const qrX = (cWidth - qrSize) / 2;
    const qrY = cHeight * 0.28;

    const qrStyling = new QRCodeStyling({
      width: qrSize,
      height: qrSize,
      data: qrPayload,
      dotsOptions: {
        color: activeTheme.qrFg,
        type: 'extra-rounded',
      },
      backgroundOptions: {
        color: activeTheme.qrBg,
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
        color: activeTheme.qrFg,
      },
      cornersDotOptions: {
        type: 'dot',
        color: activeTheme.qrFg,
      },
    });

    qrStyling.getRawData('png').then((blob) => {
      if (!blob) return;
      const img = new Image();
      const url = URL.createObjectURL(blob as Blob);
      img.onload = () => {
        // Draw white card backing for QR with gentle shadow
        const cardPad = 30;
        ctx.fillStyle = activeTheme.qrBg;
        ctx.beginPath();
        ctx.roundRect(qrX - cardPad, qrY - cardPad, qrSize + cardPad * 2, qrSize + cardPad * 2, 28);
        ctx.fill();

        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
        URL.revokeObjectURL(url);

        // 5. CTA Pill Bar below QR
        const ctaY = qrY + qrSize + cardPad * 2 + 50;
        const ctaW = Math.round(cWidth * 0.65);
        const ctaH = Math.round(cWidth * 0.08);
        const ctaX = (cWidth - ctaW) / 2;

        ctx.fillStyle = activeTheme.ctaBg;
        ctx.beginPath();
        ctx.roundRect(ctaX, ctaY, ctaW, ctaH, ctaH / 2);
        ctx.fill();

        ctx.fillStyle = activeTheme.ctaText;
        ctx.font = `bold ${Math.round(ctaH * 0.4)}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(ctaText.toUpperCase(), cWidth / 2, ctaY + ctaH / 2);

        // 6. Footer Notes
        ctx.textBaseline = 'alphabetic';
        ctx.font = `400 ${Math.round(cWidth * 0.022)}px sans-serif`;
        ctx.fillStyle = activeTheme.subColor;
        ctx.fillText(footerNote, cWidth / 2, cHeight * 0.93);
      };
      img.src = url;
    });
  }, [cWidth, cHeight, activeTheme, title, subtitle, ctaText, footerNote, qrPayload]);

  const handleDownloadPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `zosuf-poster-${size}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Printable QR Poster & Flyer Maker
        </h1>
        <p className="text-slate-300 text-sm">
          Design high-resolution vector posters for shops, restaurants, Wi-Fi counters, events, and Instagram stories.
        </p>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Design Settings */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4 text-xs">
            {/* Poster Format Size */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Poster Dimensions</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(dimensionsMap) as PosterSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`p-2 rounded-xl border text-center transition ${
                      size === sz
                        ? 'border-violet-500 bg-violet-950/60 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="uppercase block font-bold text-xs">{sz}</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {dimensionsMap[sz].width}x{dimensionsMap[sz].height}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Poster Themes */}
            <div className="space-y-1.5 pt-1">
              <label className="text-slate-300 font-semibold">Color & Gradient Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POSTER_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setSelectedThemeId(th.id)}
                    className={`p-2 rounded-xl border text-left transition ${
                      selectedThemeId === th.id
                        ? 'border-violet-500 bg-violet-950/50 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Fields */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Poster Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white uppercase font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Subtitle Description</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Call to Action Badge</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white uppercase font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Footer Disclaimer / Note</label>
                <input
                  type="text"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">QR Code Destination</label>
                <input
                  type="text"
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Poster Rendering & Export */}
        <div className="lg:col-span-6 sticky top-20 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-center">
              Print Preview
            </h3>

            {/* Canvas Container with scaled display */}
            <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-black flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm mt-6 space-y-2">
              <button
                onClick={handleDownloadPoster}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950 transition"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res Poster PNG</span>
              </button>

              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Poster</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
