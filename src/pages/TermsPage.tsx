import React from 'react';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          Terms of Use
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: September 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
        <p>
          By accessing and using ZOSUF, you agree to comply with and be bound by these Terms of Use. If you do not agree to these terms, please do not use the application.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">2. Nature of the Service</h2>
        <p>
          ZOSUF provides client-side image editing, formatting, and QR code generation utilities for personal, commercial, and professional use. The application is provided "as is" without warranty of any kind.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>3. QR Code Scan Reliability & Print Verification</span>
        </h2>
        <p>
          While ZOSUF generates standards-compliant QR matrices according to ISO/IEC 18004:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
          <li>You are solely responsible for testing and verifying generated QR codes on multiple physical devices before printing bulk merchandise, signage, or promotional materials.</li>
          <li>Adding high-density center logos, custom low-contrast colors, or selecting Low (L) error correction may reduce the optical scan readability under poor lighting or curved surfaces.</li>
          <li>ZOSUF and its creator (@markzosuf) are not liable for any losses resulting from misprinted or unscannable QR codes.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">4. Payment & Financial Disclaimers (UPI)</h2>
        <p>
          UPI payment QR codes encode standard URI parameters formatted by the user. ZOSUF is not a payment gateway, payment aggregator, or financial intermediary. We do not process, verify, facilitate, or settle transactions. Always verify payee account details before scanning or authorizing payments.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">5. Intellectual Property & Brand</h2>
        <p>
          All branding, visual styling, vector logos, and proprietary code of ZOSUF are the property of the creator (@markzosuf). Generated QR code graphics and processed images remain the exclusive property of the user who generated them.
        </p>
      </section>

      <section className="space-y-3 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white">6. Contact Information</h2>
        <p>
          For licensing or questions regarding ZOSUF, connect with @markzosuf on Instagram.
        </p>
      </section>
    </div>
  );
};
