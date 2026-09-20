import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  FastForward,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { decodePrankPayload } from '../../utils/safePrankEncoder';
import { PrankPayload } from '../../types/prank';

export const PrankRecipient: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawData = searchParams.get('d') || '';

  const [payload, setPayload] = useState<PrankPayload | null>(null);
  const [decodeError, setDecodeError] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [showRiddleAnswer, setShowRiddleAnswer] = useState(false);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState('');

  // Decode on mount
  useEffect(() => {
    if (!rawData) {
      setDecodeError('No surprise message attached to this link.');
      return;
    }
    const res = decodePrankPayload(rawData);
    if (res.success && res.data) {
      setPayload(res.data);
    } else {
      setDecodeError(res.error || 'Failed to decode message.');
    }
  }, [rawData]);

  // Loading joke animation
  useEffect(() => {
    if (payload?.t === 'loading-joke' && !isRevealed) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 98) {
            clearInterval(interval);
            return 99;
          }
          return prev + Math.floor(Math.random() * 15 + 5);
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [payload?.t, isRevealed]);

  // The riddle template ships its answer inside the message; keep it hidden
  // behind an explicit tap instead of spoiling it on reveal.
  const riddleParts = (() => {
    const body = payload?.msg || '';
    if (payload?.t !== 'riddle') return { question: body, answer: '' };
    const match = body.match(/^([\s\S]*?)\n+\s*(Answer\s*:[\s\S]*)$/i);
    if (!match) return { question: body, answer: '' };
    return { question: match[1].trim(), answer: match[2].trim() };
  })();

  // Trigger reveal & confetti particles
  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleSpinWheel = () => {
    if (wheelSpinning) return;
    setWheelSpinning(true);
    const options = [
      'Do a 5-second victory dance 💃',
      'Give a huge smile to whoever is closest 😁',
      'Tell the worst dad joke you know 🎭',
      'Recommend your all-time favorite song 🎵',
      'Send a goofy selfie to the sender 📸',
      'High five the nearest friend ✋',
    ];
    setTimeout(() => {
      const chosen = options[Math.floor(Math.random() * options.length)];
      setWheelResult(chosen);
      setWheelSpinning(false);
      setIsRevealed(true);
    }, 2000);
  };

  if (decodeError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Surprise Link Unavailable</h2>
        <p className="text-sm text-slate-400 max-w-md">{decodeError}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to ZOSUF Home</span>
        </Link>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-violet-400" />
        <span className="text-xs text-slate-400">Opening secure surprise...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-between max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Bar with Visible Exit & Skip Animation Buttons */}
      <header className="w-full flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to ZOSUF</span>
        </Link>

        {!isRevealed && (
          <button
            onClick={() => setIsRevealed(true)}
            className="flex items-center gap-1.5 text-xs text-fuchsia-400 hover:text-fuchsia-300 px-3 py-1.5 rounded-xl border border-fuchsia-900/60 bg-fuchsia-950/40 transition font-semibold"
          >
            <span>Skip Animation</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      {/* Main Interactive Surprise Stage */}
      <main className="w-full flex-1 flex flex-col items-center justify-center">
        {!isRevealed ? (
          /* PRE-REVEAL INTERACTION CARDS */
          <div className="w-full p-8 rounded-3xl bg-slate-900/60 border border-violet-900/60 backdrop-blur-2xl shadow-2xl text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white mx-auto flex items-center justify-center text-3xl shadow-xl shadow-fuchsia-900/30 animate-bounce">
              {payload.emoji || '🎁'}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-400">
                Special Delivery
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {payload.to ? `Hey ${payload.to}!` : 'Hey You!'}
              </h1>
              <p className="text-xs text-slate-300">
                {payload.from ? `${payload.from} sent you a classified surprise.` : 'Someone prepared a mystery surprise for you.'}
              </p>
            </div>

            {/* Template Specific Interactivity */}
            {payload.t === 'loading-joke' && (
              <div className="space-y-2 py-3">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>{payload.title}</span>
                  <span>{loadingProgress}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                {loadingProgress >= 99 && (
                  <p className="text-xs text-amber-400 font-medium animate-pulse">
                    Download stuck at 99%! Tap to force reveal...
                  </p>
                )}
              </div>
            )}

            {payload.t === 'choose-box' && (
              <div className="grid grid-cols-3 gap-3 py-2">
                {[1, 2, 3].map((boxNum) => (
                  <button
                    key={boxNum}
                    onClick={() => {
                      setSelectedBox(boxNum);
                      setIsRevealed(true);
                    }}
                    className={`p-4 rounded-2xl bg-slate-950 border text-2xl transition hover:scale-105 active:scale-95 ${
                      selectedBox === boxNum
                        ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/40'
                        : 'border-slate-800 hover:border-fuchsia-500'
                    }`}
                  >
                    🎁
                    <span className="block text-[10px] font-bold text-slate-400 mt-1">
                      Box #{boxNum}
                    </span>
                    {selectedBox === boxNum && (
                      <span className="block text-[9px] font-bold text-fuchsia-400 mt-0.5">Opened</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {payload.t === 'spin-wheel' && (
              <div className="space-y-3 py-2">
                <button
                  onClick={handleSpinWheel}
                  disabled={wheelSpinning}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm shadow-xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition"
                >
                  {wheelSpinning ? 'Spinning the Wheel...' : 'Spin the Wheel of Fun!'}
                </button>
              </div>
            )}

            {/* Default Tap to Open Button */}
            {payload.t !== 'choose-box' && payload.t !== 'spin-wheel' && (
              <button
                onClick={handleReveal}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-xl shadow-violet-950 hover:brightness-110 active:scale-95 transition"
              >
                Tap to Open Surprise
              </button>
            )}
          </div>
        ) : (
          /* REVEALED CARD WITH VIBRANT ANIMATION */
          <div className="w-full p-8 rounded-3xl bg-[#0e1029] border-2 border-fuchsia-500/60 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Confetti celebration badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-950/80 border border-fuchsia-800 text-fuchsia-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Surprise Unlocked!</span>
            </div>

            <div className="text-5xl">{payload.emoji || '🎉'}</div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {payload.title}
              </h2>
              {payload.to && (
                <p className="text-xs text-violet-300 font-semibold">
                  For: {payload.to}
                </p>
              )}
            </div>

            {/* Wholesome Message Body (strictly rendered as text) */}
            <div className="p-5 rounded-2xl bg-black/50 border border-violet-900/50 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-medium">
              {wheelResult || riddleParts.question}
            </div>

            {/* Riddle answers stay hidden behind a tap, as the template promises */}
            {riddleParts.answer && !wheelResult && (
              showRiddleAnswer ? (
                <div className="p-4 rounded-2xl bg-violet-950/50 border border-violet-700/60 text-sm text-violet-100 whitespace-pre-wrap font-medium animate-in fade-in duration-200">
                  {riddleParts.answer}
                </div>
              ) : (
                <button
                  onClick={() => setShowRiddleAnswer(true)}
                  className="w-full py-2.5 px-4 rounded-2xl border border-violet-500/50 bg-violet-950/40 hover:bg-violet-900/50 text-violet-200 font-bold text-xs transition"
                >
                  Tap to reveal the answer
                </button>
              )
            )}

            {payload.from && (
              <p className="text-xs text-slate-400 italic">
                From your friend: <strong className="text-white">{payload.from}</strong>
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer: Create Your Own Safe Prank at ZOSUF */}
      <footer className="w-full pt-4 border-t border-slate-900 text-center space-y-3">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Wholesome, privacy-guaranteed prank created with ZOSUF</span>
        </div>
        <Link
          to="/prank-qr"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500 text-violet-200 text-xs font-bold transition"
        >
          <span>Create Your Own Safe Prank</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </footer>
    </div>
  );
};
