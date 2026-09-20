import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Instagram,
  Globe,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import { siteConfig } from '../config/site';
import { ZosufLogo } from '../assets/Logos';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-300 py-6">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-violet-950/80 border border-violet-800 text-violet-400 mx-auto flex items-center justify-center shadow-xl shadow-violet-950/40">
          <ZosufLogo className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          About ZOSUF
        </h1>
        <p className="text-slate-300 text-sm max-w-xl mx-auto">
          Built for security professionals, creators, and daily internet users who value absolute digital privacy.
        </p>
      </div>

      {/* Creator Profile Spotlight */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-violet-900/50 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
            Creator & Architect
          </span>
          <h2 className="text-2xl font-black text-white">{siteConfig.creator}</h2>
          <p className="text-xs text-slate-300 max-w-md">
            Product designer, full-stack engineer, and privacy advocate building modern edge web applications that respect human attention and digital rights.
          </p>
        </div>

        <a
          href={siteConfig.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-lg shadow-pink-950/50 transition shrink-0"
        >
          <Instagram className="w-4 h-4" />
          <span>Follow @markzosuf</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-950 text-violet-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Client-Side First</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All QR rendering, image transformations, metadata scrubbing, and barcode verification happen inside your web browser’s JavaScript engine. Your private data never touches a remote server.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Zero Surveillance</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We do not maintain user databases, request tracking permissions, sell advertisements through invasive third-party pixels, or require logins.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-950 text-fuchsia-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Optical Precision</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            High-contrast color checking, micro-contrast evaluation, and real-time camera simulation ensure your generated codes scan effortlessly on any modern smartphone.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-400 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Cloudflare Edge Delivery</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hosted on Cloudflare Pages global network, providing instant load times, military-grade DDoS protection, and SSL encryption everywhere on Earth.
          </p>
        </div>
      </div>
    </div>
  );
};
