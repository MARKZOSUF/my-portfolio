import React from 'react';
import { PageRoute } from '../types';
import {
  QrCode,
  Scan,
  Sparkles,
  ShieldCheck,
  Instagram,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';

interface HeroProps {
  setActivePage: (page: PageRoute) => void;
  onSelectImageToQR?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ setActivePage, onSelectImageToQR }) => {
  return (
    <div className="relative overflow-hidden pt-8 pb-4 text-center">
      {/* Background glow flares */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-violet-600/15 via-fuchsia-600/15 to-cyan-500/10 blur-[110px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Top Eyebrow Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">100% Client-Side Browser Engine</span>
          <span className="text-slate-600">•</span>
          <a
            href="https://instagram.com/markzosuf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
          >
            <Instagram className="w-3 h-3" />
            <span>@markzosuf</span>
          </a>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.15]">
          Precision{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Image to QR
          </span>{' '}
          &amp; QR Studio
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Convert images to scannable QR codes locally or generate precision codes for Wi-Fi, UPI, contacts, and URLs.
          Personalize colors, frames, and logos with zero accounts, no expiring links, and complete privacy.
        </p>

        {/* Quick CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="hero-image-to-qr-btn"
            onClick={() => {
              if (onSelectImageToQR) {
                onSelectImageToQR();
              } else {
                setActivePage('generator');
              }
            }}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-950/60 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ring-1 ring-white/20"
          >
            <ImageIcon className="w-4 h-4 text-purple-200" />
            <span>Create Image to QR</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="hero-create-qr-btn"
            onClick={() => {
              setActivePage('generator');
              const target = document.getElementById('qr-type-heading');
              if (target) target.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            <span>All QR Types</span>
          </button>

          <button
            id="hero-scan-btn"
            onClick={() => {
              setActivePage('scanner');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Scan className="w-4 h-4 text-cyan-400" />
            <span>Scan QR</span>
          </button>

          <button
            id="hero-image-tools-btn"
            onClick={() => {
              setActivePage('image-tools');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-pink-400" />
            <span>Image Studio</span>
          </button>
        </div>

        {/* Micro Trust Stats */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Tracking or Cloud Storage</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>High-Res 1024px &amp; Vector SVG</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>16 QR Standard Protocols</span>
          </span>
        </div>
      </div>
    </div>
  );
};
