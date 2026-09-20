import React, { useState, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  Copy,
  Download,
  Check,
  Eye,
} from 'lucide-react';
import { SAFE_PRANK_TEMPLATES, SAFE_PRANK_THEMES, encodePrankPayload } from '../../utils/safePrankEncoder';
import { PrankPayload, PrankTemplateId, PrankTheme } from '../../types/prank';
import { QRRenderer, QRRendererHandle } from '../qr/QRRenderer';
import { QR_PRESET_STYLES } from '../qr/presets';
import { QRDesignConfig } from '../../types/qr';

export const PrankCreator: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<PrankTemplateId>('mystery');
  const [selectedTheme, setSelectedTheme] = useState<PrankTheme>('zosuf-signature');
  const [toName, setToName] = useState('Alex');
  const [fromName, setFromName] = useState('Mark');
  const [title, setTitle] = useState(SAFE_PRANK_TEMPLATES[0].defaultTitle);
  const [msg, setMsg] = useState(SAFE_PRANK_TEMPLATES[0].defaultMsg);
  const [emoji, setEmoji] = useState(SAFE_PRANK_TEMPLATES[0].defaultEmoji);
  const [confetti, setConfetti] = useState(true);

  // Mandatory Safety Checkbox
  const [isSafeConfirmed, setIsSafeConfirmed] = useState(false);

  // QR design preset for prank
  const [designConfig] = useState<QRDesignConfig>({
    ...QR_PRESET_STYLES[14], // Prank Mode preset
    frameLabel: 'SURPRISE INSIDE',
    frameStyle: 'bottom-bar',
  });

  const [copied, setCopied] = useState(false);
  const qrRef = useRef<QRRendererHandle>(null);

  // When template changes, load default template values
  const handleTemplateChange = (tmplId: PrankTemplateId) => {
    setSelectedTemplateId(tmplId);
    const tmpl = SAFE_PRANK_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setTitle(tmpl.defaultTitle);
      setMsg(tmpl.defaultMsg);
      setEmoji(tmpl.defaultEmoji);
    }
  };

  const payload: PrankPayload = {
    v: 1,
    t: selectedTemplateId,
    th: selectedTheme,
    to: toName,
    from: fromName,
    title,
    msg,
    emoji,
    confetti,
  };

  const { url, isTooLong } = encodePrankPayload(payload);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-fuchsia-950/60 via-purple-950/40 to-slate-900 border border-fuchsia-800/40 backdrop-blur-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Wholesome & Fun</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Safe Prank & Surprise QR Studio
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          Create harmless mystery cards, playful friendship audits, and confetti celebrations. Designed with 100% wholesome vibes, safety guarantees, and zero malicious behavior.
        </p>
      </div>

      {/* Safety Policy Box */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Safe Prank Guarantee:</span>
          <p className="text-slate-400 leading-relaxed">
            ZOSUF surprise links never access cameras, never play loud jump-scares, never steal passwords, and always provide an obvious exit button. Pranks are strictly limited to harmless humor and compliments.
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 20 Templates, Theme Picker & Custom Text */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Choose Template */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              1. Choose a Safe Template (20 Presets)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAFE_PRANK_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplateChange(tmpl.id)}
                    className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-fuchsia-400">
                      {tmpl.badge}
                    </span>
                    <span className="font-bold text-xs text-slate-200 truncate">
                      {tmpl.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Recipient, Sender & Custom Message */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              2. Personalize the Message
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Recipient Name</label>
                <input
                  type="text"
                  maxLength={30}
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Sender Name</label>
                <input
                  type="text"
                  maxLength={30}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Mark"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Surprise Headline</label>
              <input
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Revealed Note / Punchline</label>
              <textarea
                rows={3}
                maxLength={350}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>

            {/* Visual Theme Picker */}
            <div className="space-y-1.5 pt-2">
              <label className="text-slate-300 font-semibold">Atmospheric Card Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SAFE_PRANK_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setSelectedTheme(th.id)}
                    className={`p-2 rounded-xl border text-center transition ${
                      selectedTheme === th.id
                        ? 'border-fuchsia-500 bg-fuchsia-950/50 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confetti Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={confetti}
                onChange={(e) => setConfetti(e.target.checked)}
                className="rounded border-slate-700 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span>Shower festive confetti upon reveal</span>
            </label>

            {/* Payload Length Alert */}
            {isTooLong && (
              <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    This surprise contains too much content for a reliable QR link.
                  </span>
                  <span>Shorten the message or remove the image.</span>
                </div>
              </div>
            )}

            {/* MANDATORY SAFE CONFIRMATION CHECKBOX */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSafeConfirmed(!isSafeConfirmed)}
                className="flex items-start gap-2 text-left cursor-pointer group"
              >
                {isSafeConfirmed ? (
                  <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-5 h-5 text-slate-500 group-hover:text-slate-300 shrink-0 mt-0.5" />
                )}
                <span className={`text-xs font-semibold ${isSafeConfirmed ? 'text-emerald-300' : 'text-slate-300'}`}>
                  I confirm this is a harmless prank and does not request personal information.
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live QR Preview & Share Actions */}
        <div className="lg:col-span-5 sticky top-20 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-violet-950/80 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider text-center">
              Prank QR Code
            </h3>
            <p className="text-xs text-slate-400 mb-6 text-center">
              Scan with camera to open recipient experience
            </p>

            {/* QR Render Target */}
            {isSafeConfirmed && !isTooLong ? (
              <QRRenderer
                ref={qrRef}
                data={url}
                config={designConfig}
              />
            ) : (
              <div className="w-72 h-72 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-500">
                <Sparkles className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-400">
                  {!isSafeConfirmed
                    ? 'Check the harmless prank confirmation box to unlock QR'
                    : 'Message is too long. Please shorten.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                onClick={copyLink}
                disabled={!isSafeConfirmed || isTooLong}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-fuchsia-950 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Surprise Share Link'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => qrRef.current?.download('png', 'zosuf-prank-qr')}
                  disabled={!isSafeConfirmed || isTooLong}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR</span>
                </button>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-violet-700/50 bg-violet-950/40 text-violet-300 font-bold text-xs transition ${
                    !isSafeConfirmed ? 'opacity-30 pointer-events-none' : 'hover:bg-violet-900/50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Test View (/p)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
