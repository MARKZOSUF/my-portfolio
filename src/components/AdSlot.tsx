import React, { useEffect, useState } from 'react';
import { AdsConfig } from '../types';

interface AdSlotProps {
  position: 'top' | 'middle';
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ position, className = '' }) => {
  const [adsConfig, setAdsConfig] = useState<AdsConfig>({
    enabled: false,
    publisherId: '',
    slots: { top: '', middle: '' },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ZOSUF_ADS_CONFIG) {
      setAdsConfig(window.ZOSUF_ADS_CONFIG);
    }
  }, []);

  const slotId = position === 'top' ? adsConfig.slots.top : adsConfig.slots.middle;
  const isLive = adsConfig.enabled && adsConfig.publisherId.trim().length > 0 && slotId.trim().length > 0;

  return (
    <div
      id={`zosuf-ad-slot-${position}`}
      className={`w-full max-w-5xl mx-auto my-6 p-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/30 text-center transition-all ${className}`}
    >
      {isLive ? (
        <div className="min-h-[90px] flex items-center justify-center">
          {/*
            Live AdSense Integration Point:
            When an approved publisher ID is supplied in index.html,
            the official ad tag is placed here:
            <ins class="adsbygoogle"
                 style={{ display: 'block' }}
                 data-ad-client={adsConfig.publisherId}
                 data-ad-slot={slotId}
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
          */}
          <span className="text-xs text-slate-500 font-mono">Live Ad Container [{position}]</span>
        </div>
      ) : (
        <div className="py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">SPONSORED</span>
            <span className="text-slate-400 font-medium">
              Optional Ad Slot ({position}) — Safe disabled state. Zero remote tracking.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Configure in index.html via window.ZOSUF_ADS_CONFIG
          </span>
        </div>
      )}
    </div>
  );
};
