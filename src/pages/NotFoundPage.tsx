import React from 'react';
import { PageRoute } from '../types';
import { AlertCircle, ArrowLeft, QrCode } from 'lucide-react';

interface NotFoundPageProps {
  setActivePage: (page: PageRoute) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ setActivePage }) => {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-xl shadow-purple-950/50">
        <AlertCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-display font-extrabold text-white tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-slate-200">Page Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested page or QR route does not exist. Return to the generator to create custom codes.
        </p>
      </div>

      <div>
        <button
          onClick={() => {
            setActivePage('generator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Generator</span>
        </button>
      </div>
    </div>
  );
};
