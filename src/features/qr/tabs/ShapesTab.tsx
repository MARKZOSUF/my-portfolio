import React from 'react';
import { ShapesConfig } from '../../../types/qrStudio';
import { Palette } from 'lucide-react';

interface ShapesTabProps {
  config: ShapesConfig;
  onChange: (config: ShapesConfig) => void;
}

export const ShapesTab: React.FC<ShapesTabProps> = ({ config, onChange }) => {
  const updateField = <K extends keyof ShapesConfig>(field: K, value: ShapesConfig[K]) => {
    onChange({ ...config, [field]: value });
  };

  const dotPatterns: Array<{ id: ShapesConfig['dotType']; label: string }> = [
    { id: 'rounded', label: 'Rounded' },
    { id: 'dots', label: 'Dots' },
    { id: 'classy', label: 'Classy' },
    { id: 'classy-rounded', label: 'Classy Rounded' },
    { id: 'extra-rounded', label: 'Extra Rounded' },
    { id: 'square', label: 'Square (Classic)' },
  ];

  const cornerOuterShapes: Array<{ id: ShapesConfig['cornerSquareType']; label: string }> = [
    { id: 'rounded', label: 'Rounded' },
    { id: 'extra-rounded', label: 'Pill / Extra' },
    { id: 'square', label: 'Square' },
    { id: 'dot', label: 'Circular Ring' },
  ];

  const cornerInnerDots: Array<{ id: ShapesConfig['cornerDotType']; label: string }> = [
    { id: 'dot', label: 'Circular Dot' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'square', label: 'Square' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Body Matrix Dot Pattern */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          QR Body Matrix Dot Pattern
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {dotPatterns.map((p) => {
            const isSelected = config.dotType === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => updateField('dotType', p.id)}
                className={`p-3 rounded-xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-violet-600/20 border-violet-500 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{p.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-violet-400' : 'bg-slate-700'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Corner Eyes Shapes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Corner Outer Eye Frame
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cornerOuterShapes.map((c) => {
              const isSelected = config.cornerSquareType === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateField('cornerSquareType', c.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Corner Inner Eye Dot
          </label>
          <div className="grid grid-cols-3 gap-2">
            {cornerInnerDots.map((d) => {
              const isSelected = config.cornerDotType === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => updateField('cornerDotType', d.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Colors & Gradient Engine */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-violet-400" />
            <span>Matrix Colors & Gradient System</span>
          </h3>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={config.transparentBg}
              onChange={(e) => updateField('transparentBg', e.target.checked)}
              className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
            />
            <span>Transparent Background</span>
          </label>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Foreground / Dot Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.fgColor}
                onChange={(e) => updateField('fgColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.fgColor}
                onChange={(e) => updateField('fgColor', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Background Canvas</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={config.transparentBg}
                value={config.bgColor}
                onChange={(e) => updateField('bgColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 disabled:opacity-30"
              />
              <input
                type="text"
                disabled={config.transparentBg}
                value={config.bgColor}
                onChange={(e) => updateField('bgColor', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono text-xs disabled:opacity-30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Corner Outer Eye</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.cornerSquareColor}
                onChange={(e) => updateField('cornerSquareColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.cornerSquareColor}
                onChange={(e) => updateField('cornerSquareColor', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Corner Inner Dot</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.cornerDotColor}
                onChange={(e) => updateField('cornerDotColor', e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.cornerDotColor}
                onChange={(e) => updateField('cornerDotColor', e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Gradient Settings */}
        <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Gradient Style</label>
              <select
                value={config.gradientType}
                onChange={(e) => updateField('gradientType', e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              >
                <option value="none">Solid Color (High Reliability)</option>
                <option value="linear">Linear Gradient</option>
                <option value="radial">Radial Gradient</option>
              </select>
            </div>

            {config.gradientType !== 'none' && (
              <>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Gradient Second Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.gradientColor2}
                      onChange={(e) => updateField('gradientColor2', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.gradientColor2}
                      onChange={(e) => updateField('gradientColor2', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Rotation Angle</span>
                    <span className="text-slate-400">{config.gradientRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={15}
                    value={config.gradientRotation}
                    onChange={(e) => updateField('gradientRotation', parseInt(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Margin & Error Correction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between">
            <label className="font-bold text-slate-300">Quiet Zone Margin</label>
            <span className="text-slate-400">{config.margin}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={2}
            value={config.margin}
            onChange={(e) => updateField('margin', parseInt(e.target.value))}
            className="w-full accent-violet-500 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400">
            A quiet zone margin helps mobile cameras distinguish the code from background clutter.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <label className="font-bold text-slate-300">Error Correction Level (ECC)</label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'L', name: 'L (7%)', desc: 'Dense' },
              { id: 'M', name: 'M (15%)', desc: 'Standard' },
              { id: 'Q', name: 'Q (25%)', desc: 'Recommended' },
              { id: 'H', name: 'H (30%)', desc: 'Heavy Logo' },
            ].map((lvl) => {
              const isSelected = config.errorCorrection === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => updateField('errorCorrection', lvl.id as any)}
                  className={`py-2 px-1 rounded-xl border text-center transition ${
                    isSelected
                      ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs">{lvl.id}</div>
                  <div className="text-[9px] text-slate-400">{lvl.desc}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Level Q or H is strongly advised whenever adding a center logo or badge.
          </p>
        </div>
      </div>
    </div>
  );
};
