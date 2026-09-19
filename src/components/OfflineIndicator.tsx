import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-slate-950 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md border border-amber-300/40"
    >
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Offline Mode — All QR generators and Image tools run 100% locally.</span>
    </div>
  );
};
