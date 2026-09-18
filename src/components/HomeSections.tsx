import React from 'react';
import {
  Palette,
  ShieldCheck,
  Zap,
  Download,
  CreditCard,
  QrCode,
  Scan,
  Sliders,
  CheckCircle2,
  Lock,
  Image as ImageIcon
} from 'lucide-react';

export const HomeSections: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Select Image to QR or QR Type',
      desc: 'Choose Image to QR to convert photos or link public images, or select from 15 other protocols like Wi-Fi, vCard, and UPI.',
    },
    {
      num: '02',
      title: 'Input or Upload',
      desc: 'Upload a JPG/PNG/WebP, set public image URLs, or input text with client-side verification and zero tracking.',
    },
    {
      num: '03',
      title: 'Personalize & Frame',
      desc: 'Customize colors, dot patterns, add center brand logos, and attach custom "SCAN ME" banners.',
    },
    {
      num: '04',
      title: 'Instant HD Export',
      desc: 'Download ultra-crisp 1024px PNGs, scalable vector SVGs, or print straight from the browser.',
    },
  ];

  const features = [
    {
      icon: ImageIcon,
      title: 'Image to QR Studio',
      desc: 'Upload JPG, PNG, or WebP to encode direct image payloads or link public image URLs for universal scanning on any phone.',
    },
    {
      icon: Palette,
      title: 'Precision Styling & Frames',
      desc: 'Choose custom foreground and background colors, transparent canvases, rounded dot matrices, and call-to-action banner frames.',
    },
    {
      icon: CreditCard,
      title: 'Direct UPI Payment Links',
      desc: 'Generate seamless UPI payment QR codes compatible with GPay, PhonePe, Paytm, and BHIM with custom payee and note fields.',
    },
    {
      icon: ShieldCheck,
      title: '100% Client-Side Privacy',
      desc: 'Zero server uploads. Your text, image files, Wi-Fi passwords, and contact books are processed directly in your browser.',
    },
    {
      icon: Zap,
      title: 'Built-in Image Processor',
      desc: 'Resize dimensions, convert between PNG, JPG, and WebP, compress file size, and strip EXIF camera metadata right in the browser.',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 py-8">
      {/* How It Works Section */}
      <section aria-labelledby="how-it-works-heading" className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            How ZOSUF Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            A frictionless, 4-step workflow engineered for instant creation and clean scanning reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3 relative group hover:border-purple-500/50 transition-colors"
            >
              <span className="font-mono text-xs font-extrabold text-purple-400/80 tracking-wider">
                {s.num}
              </span>
              <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                {s.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section aria-labelledby="features-heading" className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 id="features-heading" className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Why Professionals Choose ZOSUF
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            High-grade vector generation without the clutter, paywalls, or expiring redirect links of legacy tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/70 to-slate-950 border border-slate-800 flex items-start gap-4 hover:border-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
