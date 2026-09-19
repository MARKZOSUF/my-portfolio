import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const ZosufLogo: React.FC<LogoProps> = ({ className = 'w-10 h-10', size }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="ZOSUF Logo"
  >
    <defs>
      <linearGradient id="zosufGradMain" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <linearGradient id="zosufGlow" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    {/* Dark glass background with rounded squircle */}
    <rect x="2" y="2" width="96" height="96" rx="26" fill="#0d0e26" stroke="#2e1065" strokeWidth="2" />
    <rect x="6" y="6" width="88" height="88" rx="22" fill="url(#zosufGlow)" />

    {/* Stylized QR Finder Eye - Top Left */}
    <rect x="16" y="16" width="22" height="22" rx="6" stroke="url(#zosufGradMain)" strokeWidth="4" />
    <rect x="22" y="22" width="10" height="10" rx="3" fill="url(#zosufGradMain)" />

    {/* Stylized QR Finder Eye - Top Right */}
    <rect x="62" y="16" width="22" height="22" rx="6" stroke="url(#zosufGradMain)" strokeWidth="4" />
    <rect x="68" y="22" width="10" height="10" rx="3" fill="url(#zosufGradMain)" />

    {/* Stylized QR Finder Eye - Bottom Left */}
    <rect x="16" y="62" width="22" height="22" rx="6" stroke="url(#zosufGradMain)" strokeWidth="4" />
    <rect x="22" y="68" width="10" height="10" rx="3" fill="url(#zosufGradMain)" />

    {/* Dynamic Z Energy Blade */}
    <path
      d="M44 38H68L44 64H68"
      stroke="url(#zosufGradMain)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="56" cy="51" r="2.5" fill="#38bdf8" />
  </svg>
);

export const ZosufWordmark: React.FC<{ className?: string; showTagline?: boolean }> = ({
  className = 'h-8',
  showTagline = false,
}) => (
  <div className="flex flex-col justify-center select-none">
    <div className="flex items-center gap-2">
      <span className="font-extrabold tracking-wider text-xl md:text-2xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent font-['Space_Grotesk',sans-serif]">
        ZOSUF
      </span>
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-violet-950/80 text-violet-300 border border-violet-700/50 uppercase">
        Studio
      </span>
    </div>
    {showTagline && (
      <span className="text-[10px] tracking-widest text-slate-400 uppercase font-medium">
        Privacy-First QR
      </span>
    )}
  </div>
);

export const ZosufMonochromeLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="92" height="92" rx="24" stroke="currentColor" strokeWidth="4" />
    <rect x="16" y="16" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="4" />
    <rect x="22" y="22" width="10" height="10" rx="2" fill="currentColor" />
    <rect x="62" y="16" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="4" />
    <rect x="68" y="22" width="10" height="10" rx="2" fill="currentColor" />
    <rect x="16" y="62" width="22" height="22" rx="6" stroke="currentColor" strokeWidth="4" />
    <rect x="22" y="68" width="10" height="10" rx="2" fill="currentColor" />
    <path d="M44 38H68L44 64H68" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZosufLightLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="2" width="96" height="96" rx="26" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
    <rect x="16" y="16" width="22" height="22" rx="6" stroke="#7c3aed" strokeWidth="4" />
    <rect x="22" y="22" width="10" height="10" rx="2" fill="#7c3aed" />
    <rect x="62" y="16" width="22" height="22" rx="6" stroke="#ec4899" strokeWidth="4" />
    <rect x="68" y="22" width="10" height="10" rx="2" fill="#ec4899" />
    <rect x="16" y="62" width="22" height="22" rx="6" stroke="#0891b2" strokeWidth="4" />
    <rect x="22" y="68" width="10" height="10" rx="2" fill="#0891b2" />
    <path d="M44 38H68L44 64H68" stroke="#6d28d9" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ZosufDarkLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <ZosufLogo className={className} />
);
