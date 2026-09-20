import React, { useState } from 'react';
import {
  Palette,
  Sparkles,
  RotateCcw,
  Undo2,
  Redo2,
  Shuffle,
  Save,
  FolderOpen,
  Sliders,
  Frame,
  AlertTriangle,
  Upload,
  X,
  Check,
} from 'lucide-react';
import {
  QRDesignConfig,
  DotType,
  CornerSquareType,
  CornerDotType,
  GradientType,
  ErrorCorrectionLevel,
} from '../../types/qr';
import { QR_PRESET_STYLES } from './presets';
import { calculateContrastRatio } from '../../utils/qrVerifier';

interface QRDesignStudioProps {
  config: QRDesignConfig;
  onChangeConfig: (newConfig: QRDesignConfig) => void;
  payloadLength?: number;
}

export const QRDesignStudio: React.FC<QRDesignStudioProps> = ({
  config,
  onChangeConfig,
  payloadLength = 100,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'shapes' | 'colors' | 'logo' | 'frame'>('presets');
  const [history, setHistory] = useState<QRDesignConfig[]>([config]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [savedNotice, setSavedNotice] = useState('');

  // Update config with undo/redo history tracking
  const updateConfig = (updater: (prev: QRDesignConfig) => QRDesignConfig) => {
    const updated = updater(config);
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(updated);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    onChangeConfig(updated);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onChangeConfig(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onChangeConfig(next);
    }
  };

  const handleReset = () => {
    const defaultPreset = QR_PRESET_STYLES[0];
    updateConfig(() => defaultPreset);
  };

  const handleRandomize = () => {
    const randomPreset = QR_PRESET_STYLES[Math.floor(Math.random() * QR_PRESET_STYLES.length)];
    updateConfig(() => ({ ...randomPreset }));
  };

  const handleSaveStyle = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('zosuf_saved_styles') || '[]');
      const newEntry = {
        name: `Custom Style ${saved.length + 1}`,
        date: new Date().toLocaleDateString(),
        config,
      };
      saved.unshift(newEntry);
      localStorage.setItem('zosuf_saved_styles', JSON.stringify(saved.slice(0, 10)));
      setSavedNotice('Style saved to browser storage!');
      setTimeout(() => setSavedNotice(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadSavedStyle = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('zosuf_saved_styles') || '[]');
      if (saved.length > 0) {
        updateConfig(() => saved[0].config);
        setSavedNotice(`Loaded "${saved[0].name}"`);
        setTimeout(() => setSavedNotice(''), 3000);
      } else {
        setSavedNotice('No saved styles found yet.');
        setTimeout(() => setSavedNotice(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateConfig((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        errorCorrection: 'H', // Increase error correction automatically to support center logo
      }));
    };
    reader.readAsDataURL(file);
  };

  // Safety checks calculation
  const contrastRatio = calculateContrastRatio(
    config.fgColor,
    config.transparentBg ? '#ffffff' : config.bgColor
  );
  const isContrastLow = contrastRatio < 3.5;
  const isLogoBig = Boolean(config.logoDataUrl && config.logoSize > 0.25 && config.errorCorrection !== 'H');
  const isMarginSmall = config.margin < 10;
  const isCapacityHigh = payloadLength > 500 && config.errorCorrection === 'H';

  const frameLabelOptions = [
    'SCAN ME',
    'OPEN ME',
    'SURPRISE',
    'VIEW IMAGE',
    'SCAN TO PAY',
    'JOIN WI-FI',
    'SECRET MESSAGE',
    'FOR YOU',
    'BIRTHDAY SURPRISE',
    'FRIENDSHIP CHALLENGE',
    'MYSTERY INSIDE',
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 backdrop-blur-md">
      {/* Studio Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-violet-400" />
          <h3 className="text-base font-bold text-white">QR Design Studio</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800 font-semibold">
            {config.presetName || 'Custom'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo design change"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo design change"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRandomize}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-800/60 bg-violet-950/40 text-violet-300 text-xs font-semibold hover:bg-violet-900/50 transition"
            title="Randomize style"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Randomize</span>
          </button>
          <button
            onClick={handleSaveStyle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/60 text-slate-300 text-xs hover:bg-slate-700 transition"
            title="Save custom style to local storage"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={handleLoadSavedStyle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/60 text-slate-300 text-xs hover:bg-slate-700 transition"
            title="Load saved style from browser storage"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Load</span>
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Reset to default style"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="mb-4 py-1.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Safety Warnings Banner */}
      {(isContrastLow || isLogoBig || isMarginSmall || isCapacityHigh || config.transparentBg) && (
        <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Design Studio Safety Advisories:</span>
          </div>
          {isContrastLow && (
            <p>
              • Low color contrast ({contrastRatio.toFixed(1)}:1). Consider choosing a darker foreground or lighter background for reliable camera scanning.
            </p>
          )}
          {isLogoBig && (
            <p>
              • Large center logo detected. Error correction should be set to &apos;H&apos; (High) to avoid scannability errors.
            </p>
          )}
          {isMarginSmall && (
            <p>
              • Margin is below 10px. Some smartphone camera lenses require a clear quiet zone around the QR matrix.
            </p>
          )}
          {config.transparentBg && (
            <p>
              • Transparent background enabled: Ensure the surface where the QR is placed provides dark-on-light contrast.
            </p>
          )}
          {isCapacityHigh && (
            <p>
              • Large payload ({payloadLength} bytes) with High error correction creates very dense dot matrices. If scanning fails, lower error correction to M or Q.
            </p>
          )}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800 mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'presets' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>20 Presets</span>
        </button>
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'colors' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Colors & Gradients</span>
        </button>
        <button
          onClick={() => setActiveTab('shapes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'shapes' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Patterns & Eyes</span>
        </button>
        <button
          onClick={() => setActiveTab('logo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'logo' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Center Logo</span>
        </button>
        <button
          onClick={() => setActiveTab('frame')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'frame' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Frame className="w-3.5 h-3.5" />
          <span>Frame & Labels</span>
        </button>
      </div>

      {/* Tab 1: 20 Preset Styles */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {QR_PRESET_STYLES.map((preset) => {
            const isSelected = config.presetName === preset.presetName;
            return (
              <button
                key={preset.presetName}
                onClick={() => updateConfig(() => ({ ...preset }))}
                className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between h-20 ${
                  isSelected
                    ? 'border-violet-500 bg-violet-950/40 ring-2 ring-violet-500/50'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-white truncate">
                    {preset.presetName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: preset.fgColor }}
                  />
                  {preset.gradientType !== 'none' && (
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: preset.gradientColor2 }}
                    />
                  )}
                  <span
                    className="w-4 h-4 rounded-md border border-slate-700 shadow-sm ml-auto"
                    style={{ backgroundColor: preset.bgColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 2: Colors & Gradient Settings */}
      {activeTab === 'colors' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary Foreground Color */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Foreground Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.fgColor}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, fgColor: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={config.fgColor}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, fgColor: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 font-mono text-white text-xs uppercase"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium">Background Color</label>
                <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.transparentBg}
                    onChange={(e) =>
                      updateConfig((prev) => ({ ...prev, transparentBg: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Transparent</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={config.transparentBg}
                  value={config.bgColor}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, bgColor: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer disabled:opacity-40"
                />
                <input
                  type="text"
                  disabled={config.transparentBg}
                  value={config.bgColor}
                  onChange={(e) => updateConfig((prev) => ({ ...prev, bgColor: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 font-mono text-white text-xs uppercase disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Gradient Controls */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Gradient Mode</span>
              <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                {(['none', 'linear', 'radial'] as GradientType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateConfig((prev) => ({ ...prev, gradientType: type }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition ${
                      config.gradientType === type
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {config.gradientType !== 'none' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Secondary Gradient Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.gradientColor2}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, gradientColor2: e.target.value }))
                      }
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.gradientColor2}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, gradientColor2: e.target.value }))
                      }
                      className="flex-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {config.gradientType === 'linear' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Gradient Angle</span>
                      <span>{config.gradientRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="15"
                      value={config.gradientRotation}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          gradientRotation: parseInt(e.target.value),
                        }))
                      }
                      className="w-full accent-violet-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Patterns & Eyes */}
      {activeTab === 'shapes' && (
        <div className="space-y-4 text-xs">
          {/* Dot Patterns */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Data Dot Pattern</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(
                [
                  'square',
                  'rounded',
                  'dots',
                  'extra-rounded',
                  'classy',
                  'classy-rounded',
                ] as DotType[]
              ).map((pattern) => (
                <button
                  key={pattern}
                  onClick={() => updateConfig((prev) => ({ ...prev, dotType: pattern }))}
                  className={`p-2 rounded-xl border text-center capitalize text-xs transition ${
                    config.dotType === pattern
                      ? 'border-violet-500 bg-violet-950/60 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {pattern.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Corner Square Eyes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Corner Square Eye Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['square', 'rounded', 'dot', 'extra-rounded'] as CornerSquareType[]).map(
                  (eye) => (
                    <button
                      key={eye}
                      onClick={() =>
                        updateConfig((prev) => ({ ...prev, cornerSquareType: eye }))
                      }
                      className={`p-2 rounded-lg border text-center capitalize text-xs transition ${
                        config.cornerSquareType === eye
                          ? 'border-violet-500 bg-violet-950/60 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {eye.replace('-', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Corner Center Dot Style</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['square', 'rounded', 'dot'] as CornerDotType[]).map((dot) => (
                  <button
                    key={dot}
                    onClick={() => updateConfig((prev) => ({ ...prev, cornerDotType: dot }))}
                    className={`p-2 rounded-lg border text-center capitalize text-xs transition ${
                      config.cornerDotType === dot
                        ? 'border-violet-500 bg-violet-950/60 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {dot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Margin & Error Correction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Quiet Margin: {config.margin}px</label>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={config.margin}
                onChange={(e) =>
                  updateConfig((prev) => ({ ...prev, margin: parseInt(e.target.value) }))
                }
                className="w-full accent-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Error Correction Level</label>
              <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                {(['L', 'M', 'Q', 'H'] as ErrorCorrectionLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => updateConfig((prev) => ({ ...prev, errorCorrection: lvl }))}
                    className={`flex-1 py-1 rounded text-xs font-bold transition ${
                      config.errorCorrection === lvl
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Level ${lvl}: ${lvl === 'L' ? '7%' : lvl === 'M' ? '15%' : lvl === 'Q' ? '25%' : '30%'} recovery`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">Render Resolution</label>
              <select
                value={config.size}
                onChange={(e) =>
                  updateConfig((prev) => ({ ...prev, size: parseInt(e.target.value) }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs"
              >
                <option value="256">256 x 256 px (Compact)</option>
                <option value="512">512 x 512 px (Standard)</option>
                <option value="1024">1024 x 1024 px (High-Res)</option>
                <option value="2048">2048 x 2048 px (Print Master)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Center Logo */}
      {activeTab === 'logo' && (
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-center space-y-2">
            {config.logoDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-xl p-1 bg-white border border-slate-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={config.logoDataUrl}
                    alt="Center logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  onClick={() => updateConfig((prev) => ({ ...prev, logoDataUrl: undefined }))}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-6 h-6 mx-auto text-violet-400" />
                <p className="text-slate-300">Upload a center brand logo or avatar icon</p>
                <p className="text-[11px] text-slate-500">PNG, JPG or SVG under 2 MB</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer transition">
                  <span>Choose Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {config.logoDataUrl && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Logo Scale</span>
                  <span>{Math.round(config.logoSize * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.32"
                  step="0.02"
                  value={config.logoSize}
                  onChange={(e) =>
                    updateConfig((prev) => ({ ...prev, logoSize: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-violet-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Logo Margin Padding</span>
                  <span>{config.logoMargin}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={config.logoMargin}
                  onChange={(e) =>
                    updateConfig((prev) => ({ ...prev, logoMargin: parseInt(e.target.value) }))
                  }
                  className="w-full accent-violet-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Frames & Badges */}
      {activeTab === 'frame' && (
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Frame Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'No Frame' },
                { id: 'bottom-bar', label: 'Bottom Pill Bar' },
                { id: 'neon-border', label: 'Neon Glow Border' },
                { id: 'card', label: 'Card Badge' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    updateConfig((prev) => ({
                      ...prev,
                      frameStyle: f.id as any,
                      frameLabel: prev.frameLabel || 'SCAN ME',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-center text-xs transition ${
                    config.frameStyle === f.id
                      ? 'border-violet-500 bg-violet-950/60 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {config.frameStyle && config.frameStyle !== 'none' && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">Frame CTA Text</label>
                <input
                  type="text"
                  maxLength={25}
                  value={config.frameLabel || ''}
                  onChange={(e) =>
                    updateConfig((prev) => ({ ...prev, frameLabel: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. SCAN ME, OPEN ME"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-semibold uppercase tracking-wider"
                />
              </div>

              {/* Quick Preset Labels */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Quick Picks:</span>
                <div className="flex flex-wrap gap-1.5">
                  {frameLabelOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateConfig((prev) => ({ ...prev, frameLabel: opt }))}
                      className="px-2 py-0.8 rounded-lg bg-slate-800 text-[10px] text-slate-300 hover:text-white hover:bg-violet-950"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Colors */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Frame Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.frameColor || '#7c3aed'}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, frameColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.frameColor || '#7c3aed'}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, frameColor: e.target.value }))
                      }
                      className="flex-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px]">Label Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.frameTextColor || '#ffffff'}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, frameTextColor: e.target.value }))
                      }
                      className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.frameTextColor || '#ffffff'}
                      onChange={(e) =>
                        updateConfig((prev) => ({ ...prev, frameTextColor: e.target.value }))
                      }
                      className="flex-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
