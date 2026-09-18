import React, { useState } from 'react';
import { PageRoute } from '../types';
import {
  QrCode,
  Instagram,
  ShieldCheck,
  Trash2,
  Lock,
  Heart,
  ExternalLink
} from 'lucide-react';

interface FooterProps {
  setActivePage: (page: PageRoute) => void;
  onClearLocalData: () => void;
}

export const Footer: React.FC<FooterProps> = ({ setActivePage, onClearLocalData }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    onClearLocalData();
    setShowClearConfirm(false);
  };

  return (
    <footer className="w-full bg-[#070a13] border-t border-slate-800/80 pt-12 pb-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 p-0.5">
                <div className="w-full h-full bg-[#0f172a] rounded-[6px] flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <span className="font-display font-extrabold text-lg text-white tracking-tight">
                ZOSUF
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Next-generation client-side QR code studio and browser image processor.
              Customizable, secure, and built for privacy with zero backend storage.
            </p>
            <div className="pt-1">
              <a
                id="footer-instagram-link"
                href="https://instagram.com/markzosuf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs hover:bg-pink-500/20 transition-all font-medium"
              >
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>Created by @markzosuf</span>
                <ExternalLink className="w-3 h-3 text-pink-400/70" />
              </a>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Tools & Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Universal QR Generator
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('scanner'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Camera & Image QR Scanner
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('image-tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Client Image Converter & Optimizer
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('generator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  UPI Payment QR Codes
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => { setActivePage('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="hover:text-purple-400 transition-colors"
                >
                  Architecture & Security
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Privacy & Client Storage */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Data Sovereignty
            </h4>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Client-Side Sandbox</span>
              </div>
              <p>
                No user input, uploaded images, or payment VPAs are sent to a remote database or cloud server.
              </p>
            </div>
            <button
              id="clear-local-data-btn"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Data & History</span>
            </button>
          </div>
        </div>

        {/* Bottom copyright row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ZOSUF. Crafted with precision for privacy & performance.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>No API Keys Required</span>
            </span>
            <span>•</span>
            <a
              href="https://instagram.com/markzosuf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-pink-400 transition-colors"
            >
              @markzosuf
            </a>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Clear Local Storage?</h3>
              <p className="text-xs text-slate-400">
                This will delete any saved QR history items, custom color presets, and cached preferences stored on this device.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
