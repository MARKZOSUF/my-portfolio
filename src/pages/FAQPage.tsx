import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'How does the Image to QR Generator embed an image directly into a QR code?',
    a: 'QR Code standards can store up to 2,953 bytes of alphanumeric data at Error Correction Level L. ZOSUF uses an optimized in-browser Canvas algorithm that converts your image into a low-resolution micro-monochrome bitmap, encodes it via Base64 or Data URI, and places it directly into the QR payload. This means the QR code can be scanned and opened completely offline with no internet or server hosting needed!',
  },
  {
    q: 'Why does ZOSUF verify my QR codes before letting me download?',
    a: 'Adding heavy custom colors, rounded dots, and center logos can degrade scannability. Before unlocking download buttons, ZOSUF runs an in-browser barcode decoding test using @zxing/browser on the rendered canvas. If a camera scanner cannot read the code, ZOSUF alerts you so you do not print unreadable QR codes.',
  },
  {
    q: 'Are my images or scanned contents uploaded to any server?',
    a: 'No. Everything runs 100% locally in your web browser memory. Your images, personal contact details, Wi-Fi credentials, and scanned codes never touch our servers or any third-party clouds.',
  },
  {
    q: 'Does ZOSUF require an API, database, or cloud-storage binding?',
    a: 'No. ZOSUF is a static browser application. It requires no API key, database, server function, Cloudflare R2 bucket, or environment variable. You can embed a tiny image directly or create a QR code for an image URL that is already publicly available.',
  },
  {
    q: 'Can I print QR codes on flyers, posters, or business cards?',
    a: 'Yes! ZOSUF allows downloading vector SVGs or high-resolution PNGs. For physical printing, we recommend exporting SVGs or rendering high-res PNGs and maintaining at least 25 mm x 25 mm (1 inch x 1 inch) physical dimensions for reliable scanning.',
  },
  {
    q: 'What is the Safe Prank QR guarantee?',
    a: 'ZOSUF pranks are strictly designed for wholesome amusement (compliments, friendly jokes, mystery gift boxes, and confetti animations). We prohibit phishing, fake login screens, jump scares, loud sirens, or unauthorized hardware access.',
  },
  {
    q: 'Does ZOSUF work offline?',
    a: 'Yes! ZOSUF is configured as a Progressive Web App (PWA). Once loaded in your browser, the core QR generator, image tools, and offline decoder remain fully operational even without internet connectivity.',
  },
];

export const FAQPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300 py-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-400 text-sm">
          Everything you need to know about ZOSUF, QR standards, image compression, and privacy.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md overflow-hidden transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-900/80 transition"
              >
                <span className="font-bold text-sm text-white">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-violet-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
