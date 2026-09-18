import React from 'react';
import { PageRoute } from '../types';
import {
  ShieldCheck,
  Zap,
  Globe,
  Lock,
  Instagram,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';

interface AboutPageProps {
  setActivePage: (page: PageRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ setActivePage }) => {
  const faqs = [
    {
      q: 'Why does an Image QR code require a public image URL to open on other phones?',
      a: 'When you upload an image file locally, it only exists in your current browser memory or local storage. Smartphones do not have access to your local computer or phone file system. To create a QR code that anyone can scan and view on their own device, the image must be hosted on a public web link (like an image hosting service, portfolio, or cloud drive).',
    },
    {
      q: 'Are my UPI IDs, Wi-Fi passwords, or contacts sent to any server?',
      a: 'No. ZOSUF is engineered with a strict client-side runtime architecture. Everything from QR matrix generation to image resizing and EXIF stripping happens directly inside your web browser’s JavaScript engine. Zero network requests are made with your data.',
    },
    {
      q: 'What is Error Correction and when should I use "High" (H)?',
      a: 'QR codes feature built-in Reed-Solomon error correction. Level L allows 7% damaged data recovery, M allows 15%, Q allows 25%, and H allows up to 30%. When you place a custom logo or brand icon in the center of the QR code, always select Level Q or H so phone cameras can easily read the code despite the center obstruction.',
    },
    {
      q: 'How do UPI payment QR codes work?',
      a: 'UPI QR codes follow the standard NPCI (National Payments Corporation of India) URI specification (`upi://pay?pa=...`). When scanned with Indian banking and payment apps like Google Pay, PhonePe, Paytm, or BHIM, the app automatically pre-fills the payee VPA and amount.',
    },
    {
      q: 'Can I use ZOSUF offline?',
      a: 'Yes! Because all core dependencies are bundled into static frontend assets, once the page is loaded (or installed as a PWA), the QR generator, scanner, and image tools function entirely without an active internet connection.',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      {/* Hero / About Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Architected for Speed & Privacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
          About ZOSUF
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          ZOSUF is a modern, high-precision image processing and QR generation suite crafted to deliver privacy, aesthetic refinement, and offline-first reliability.
        </p>
      </div>

      {/* Creator Spotlight */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-xs uppercase font-bold tracking-wider text-purple-400">
            Product Designer & Creator
          </span>
          <h2 className="text-xl font-display font-bold text-white">Mark Zosuf</h2>
          <p className="text-xs text-slate-300 max-w-md">
            Follow the creator on Instagram for design updates, creative tech showcases, and future releases.
          </p>
        </div>
        <a
          id="about-instagram-button"
          href="https://instagram.com/markzosuf"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-pink-950/50 transition-all hover:scale-105"
        >
          <Instagram className="w-4 h-4" />
          <span>Follow @markzosuf</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">Zero Remote Storage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No telemetry, no remote databases, and no hidden tracking. Your files and QR payloads never leave your device.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">Instant High-Res Output</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Render crisp 256px, 512px, or 1024px print-ready PNGs and scalable SVG vectors with customized frames and brand logos.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base">Cloudflare Pages Ready</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Engineered with pure Vite and static web architectures. Deployable anywhere instantly with zero configuration dependencies.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading" className="space-y-6 pt-6 border-t border-slate-800">
        <div className="text-center space-y-2">
          <h2 id="faq-heading" className="text-2xl font-display font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-purple-400" />
            <span>Frequently Asked Questions</span>
          </h2>
          <p className="text-xs text-slate-400">
            Everything you need to know about QR specifications, scanning reliability, and image formatting.
          </p>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2"
            >
              <h3 className="text-sm font-semibold text-slate-100">{faq.q}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <div className="text-center pt-4">
        <button
          onClick={() => {
            setActivePage('generator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-950/40"
        >
          Open QR Generator Studio
        </button>
      </div>
    </div>
  );
};
