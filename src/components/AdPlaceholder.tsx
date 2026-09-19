import React from 'react';
import { adsConfig } from '../config/ads';

interface AdPlaceholderProps {
  slot: 'hero' | 'content' | 'footer';
  className?: string;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ slot, className = '' }) => {
  // If ads are disabled or no publisher ID configured, don't show any intrusive boxes
  if (!adsConfig.enabled || !adsConfig.publisherId) {
    return null;
  }

  const slotId = adsConfig.slots[slot];
  if (!slotId) return null;

  return (
    <div
      className={`w-full max-w-5xl mx-auto my-6 p-4 rounded-xl border border-slate-800/60 bg-slate-900/30 text-center text-xs text-slate-500 overflow-hidden ${className}`}
      aria-label="Advertisement"
    >
      <div className="py-8 border border-dashed border-slate-800 rounded-lg">
        <span className="block font-medium tracking-wider uppercase text-[10px] text-slate-600 mb-1">
          Sponsored
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adsConfig.publisherId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};
