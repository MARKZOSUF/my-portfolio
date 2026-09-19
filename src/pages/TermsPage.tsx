import React from 'react';
import { Scale, AlertCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 py-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-800 text-violet-400 text-xs font-semibold">
          <Scale className="w-3.5 h-3.5" />
          <span>Acceptable Use & Legal Terms</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Terms of Service</h1>
        <p className="text-slate-400 text-xs">Last updated: October 2026</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Permitted Use</h2>
          <p>
            ZOSUF provides client-side utility tools for generating QR codes, scanning barcodes, processing images, and creating harmless interactive greeting cards. By accessing this service, you agree to use it strictly for lawful purposes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Prohibited Conduct</h2>
          <p>You agree never to use ZOSUF to generate:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Deceptive phishing links or malicious payloads designed to impersonate financial institutions, authentication screens, or government bodies.</li>
            <li>Fraudulent UPI payment requests intended to mislead or trick recipients.</li>
            <li>Harassing, threatening, or non-consensual tracking links.</li>
            <li>Malware distribution or unauthorized device control schemes.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Safe Prank Policy</h2>
          <p>
            The Safe Prank QR feature is strictly intended for wholesome entertainment and compliments among consenting friends. Creating links that inflict distress, fear, or reputational damage violates our service policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Disclaimer of Warranty</h2>
          <p>
            ZOSUF is provided on an "as-is" and "as-available" basis without warranties of any kind. While ZOSUF incorporates real-time optical verification routines, users are responsible for physically verifying printed QR codes prior to mass manufacturing or print distribution.
          </p>
        </section>
      </div>
    </div>
  );
};
