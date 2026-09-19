import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShieldCheck, Heart, ExternalLink, Check } from 'lucide-react';
import { ZosufLogo, ZosufWordmark } from '../assets/Logos';
import { siteConfig } from '../config/site';

export const Footer: React.FC = () => {
  const [clearedNotice, setClearedNotice] = useState(false);

  const handleClearLocalData = () => {
    try {
      localStorage.removeItem('zosuf_saved_styles');
      localStorage.removeItem('zosuf_scan_history');
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <footer className="border-t border-violet-950/50 bg-[#060714] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {/* Col 1: Brand & Ethos */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <ZosufLogo className="w-8 h-8" />
            <ZosufWordmark />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {siteConfig.description}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side • No Account Required</span>
          </div>
        </div>

        {/* Col 2: Studio Tools */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Studio Tools
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/image-to-qr" className="hover:text-violet-300 transition flex items-center gap-1.5">
                <span>Image to QR Generator</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-violet-900 text-violet-200">Main</span>
              </Link>
            </li>
            <li>
              <Link to="/qr-generator" className="hover:text-violet-300 transition">
                Advanced QR Generator
              </Link>
            </li>
            <li>
              <Link to="/qr-scanner" className="hover:text-violet-300 transition">
                Live QR Scanner
              </Link>
            </li>
            <li>
              <Link to="/image-tools" className="hover:text-violet-300 transition">
                Browser Image Tools
              </Link>
            </li>
            <li>
              <Link to="/prank-qr" className="hover:text-violet-300 transition">
                Safe Prank QR Creator
              </Link>
            </li>
            <li>
              <Link to="/poster-maker" className="hover:text-violet-300 transition">
                Printable Poster Maker
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Legal & Privacy */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Transparency
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/privacy" className="hover:text-violet-300 transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-violet-300 transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-violet-300 transition">
                Frequently Asked Questions
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-violet-300 transition">
                About ZOSUF
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 4: Creator & Data Control */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Creator & Privacy Controls
          </h4>
          <p className="text-xs text-slate-400">
            Crafted with precision by{' '}
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fuchsia-400 font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              {siteConfig.creator}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>

          <div className="pt-2">
            <button
              onClick={handleClearLocalData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-950/40 hover:border-rose-800/60 hover:text-rose-300 text-[11px] text-slate-400 transition"
              title="Clears local scan history and saved styles from this device"
            >
              {clearedNotice ? <Check className="w-3 h-3 text-emerald-400" /> : <Trash2 className="w-3 h-3" />}
              <span>{clearedNotice ? 'Local Data Cleared!' : 'Clear Local Browser Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} ZOSUF. All rights reserved. Zero external tracking.</p>
        <p className="flex items-center gap-1">
          <span>Designed with care for speed & privacy</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
        </p>
      </div>
    </footer>
  );
};
