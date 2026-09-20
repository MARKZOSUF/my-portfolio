import React from 'react';
import { Link } from 'react-router-dom';
import {
  Image as ImageIcon,
  QrCode,
  ScanLine,
  Wand2,
  Sparkles,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Cpu,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { ZosufLogo } from '../assets/Logos';
import { AdPlaceholder } from '../components/AdPlaceholder';

export const HomePage: React.FC = () => {
  const tools = [
    {
      to: '/image-to-qr',
      title: 'Image to QR Generator',
      badge: 'Featured',
      badgeColor: 'bg-gradient-to-r from-pink-500 to-violet-500 text-white',
      description:
        'Embed micro-photos and graphics directly into scannable QR codes using in-browser Canvas compression, or link to public URLs.',
      icon: ImageIcon,
      iconColor: 'text-pink-400 bg-pink-950/60 border-pink-700/40',
      action: 'Create Image QR',
    },
    {
      to: '/qr-generator',
      title: 'Advanced QR Studio',
      badge: '20 Formats',
      badgeColor: 'bg-violet-950 text-violet-300 border border-violet-800',
      description:
        'Generate Wi-Fi, vCard, UPI payments, email, calendar events, maps, and social profiles with vector styling and live optical checks.',
      icon: QrCode,
      iconColor: 'text-violet-400 bg-violet-950/60 border-violet-700/40',
      action: 'Open QR Generator',
    },
    {
      to: '/qr-scanner',
      title: 'Camera & File Scanner',
      badge: '10 Themes',
      badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
      description:
        'Scan QR codes with your device camera, drag-and-drop image files, or paste from clipboard with a strict security sandbox.',
      icon: ScanLine,
      iconColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/40',
      action: 'Launch Scanner',
    },
    {
      to: '/image-tools',
      title: 'Browser Image Tools',
      badge: 'Zero Upload',
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
      description:
        'Resize, compress, convert (WebP/PNG/JPG), rotate, flip, and strip metadata locally in your browser memory.',
      icon: Wand2,
      iconColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/40',
      action: 'Launch Image Tools',
    },
    {
      to: '/prank-qr',
      title: 'Safe Prank Studio',
      badge: 'Wholesome',
      badgeColor: 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800',
      description:
        'Surprise friends with harmless compliments, friendship quizzes, confetti reveals, and playful mystery cards.',
      icon: Sparkles,
      iconColor: 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-700/40',
      action: 'Build Safe Prank',
    },
    {
      to: '/poster-maker',
      title: 'Printable Poster Maker',
      badge: 'High-Res Print',
      badgeColor: 'bg-amber-950 text-amber-300 border border-amber-800',
      description:
        'Design branded A4/A5 posters, tabletop counter stands, and social media flyers ready for instant printing.',
      icon: Printer,
      iconColor: 'text-amber-400 bg-amber-950/60 border-amber-700/40',
      action: 'Make QR Poster',
    },
  ];

  return (
    <div className="space-y-16 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/70 border border-violet-800/60 text-violet-300 text-xs font-semibold backdrop-blur-md shadow-lg">
          <ZosufLogo className="w-4 h-4" />
          <span>Next-Generation QR & In-Browser Image Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
          The Future of QR & <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Image Privacy
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Privacy-first QR generation, direct in-QR image embedding, camera scanning, browser image manipulation, and wholesome surprise cards — with zero user accounts or server tracking.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/image-to-qr"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:brightness-110 active:scale-95 text-white font-bold text-sm shadow-xl shadow-violet-950/60 transition"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Create Image to QR</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/qr-generator"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold text-sm transition"
          >
            <QrCode className="w-4 h-4" />
            <span>Explore 20 QR Formats</span>
          </Link>

          <Link
            to="/qr-scanner"
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-violet-900/60 bg-violet-950/30 hover:bg-violet-900/40 text-violet-300 font-semibold text-sm transition"
          >
            <ScanLine className="w-4 h-4" />
            <span>Launch Scanner</span>
          </Link>
        </div>

        {/* Privacy Pill Highlights */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero Tracking & No Cookies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-violet-400" />
            <span>100% In-Browser Execution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Optical Scannability Checked</span>
          </div>
        </div>
      </section>

      {/* Optional Ad Placement below Hero */}
      <AdPlaceholder slot="hero" />

      {/* Main Studio Tools Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight">
            ZOSUF Studio Suite
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Select a specialized tool to get started instantly. Everything runs on your device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.to}
                className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 hover:border-violet-600/50 hover:bg-slate-900/80 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden backdrop-blur-md shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${tool.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <Link
                    to={tool.to}
                    className="flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-violet-600 group-hover:bg-violet-600 text-slate-300 group-hover:text-white text-xs font-bold transition"
                  >
                    <span>{tool.action}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mid-Page Ad Placeholder */}
      <AdPlaceholder slot="content" />

      {/* Trust & Architecture Principles Section */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0e1029] to-[#08091a] border border-violet-900/40 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Engineered for Pure Privacy & Performance
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Most online QR and image services silently upload your data to remote telemetry servers. ZOSUF is architecturally designed around local processing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-violet-950 text-violet-400 flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">No Accounts or Passwords</h3>
            <p className="text-slate-400 leading-relaxed">
              No sign-up forms, no cookies, no tracking IDs. You open the application and immediately get productive work done.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-950 text-fuchsia-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Optical Camera Verification</h3>
            <p className="text-slate-400 leading-relaxed">
              Every customized QR code is checked in real-time with an in-browser barcode engine to verify readability before downloading.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center mb-3">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm">Wholesome Prank Ethics</h3>
            <p className="text-slate-400 leading-relaxed">
              Prank features are strictly wholesome compliments, puzzles, and celebration notes — never deceptive phishing or loud scares.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
