import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 py-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero-Knowledge Architecture</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
        <p className="text-slate-400 text-xs">Last updated: September 2026 • Applies to ZOSUF (markzosuf.pages.dev)</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Core Privacy Philosophy</h2>
          <p>
            At ZOSUF, we believe your personal information, Wi-Fi keys, photos, and scanned records belong exclusively to you. ZOSUF does not use accounts, does not collect analytics via intrusive marketing cookies, and does not sell or share data with advertising brokers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. In-Browser Local Processing</h2>
          <p>
            QR generation, barcode decoding, image resizing, and metadata scrubbing occur strictly inside your device’s local browser sandbox using HTML5 Canvas and WebAssembly. ZOSUF has no upload API and does not transmit your files or QR payloads to a ZOSUF server.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Local Storage</h2>
          <p>
            ZOSUF uses your browser's <code className="text-violet-300">localStorage</code> exclusively for your convenience: saving scan history, custom QR design presets, and theme preferences. This data remains on your physical device and can be cleared at any time with a single click.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Camera Access</h2>
          <p>
            When utilizing the camera QR scanner, live video frames are processed frame-by-frame in volatile memory and immediately discarded. No video streams or photos are ever saved to disk or broadcast over the internet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">5. Contact</h2>
          <p>
            For privacy inquiries, security reports, or technical audits, reach out to creator <strong>@markzosuf</strong> via Instagram at <a href="https://instagram.com/markzosuf" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">instagram.com/markzosuf</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
