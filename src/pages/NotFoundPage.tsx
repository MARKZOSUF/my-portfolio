import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home, QrCode } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in">
      <div className="w-20 h-20 rounded-3xl bg-slate-900/80 border border-slate-800 text-violet-400 flex items-center justify-center shadow-xl shadow-violet-950/20">
        <HelpCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-bold uppercase tracking-wider text-violet-400">404 Error</span>
        <h1 className="text-3xl font-black text-white tracking-tight">Page Not Found</h1>
        <p className="text-slate-400 text-xs leading-relaxed">
          The tool or destination you are looking for does not exist or has moved.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950 transition"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>
        <Link
          to="/qr-generator"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition"
        >
          <QrCode className="w-4 h-4" />
          <span>Open QR Generator</span>
        </Link>
      </div>
    </div>
  );
};
