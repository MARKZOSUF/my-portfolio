import React from 'react';
import {
  TextLayersConfig,
  TextLayerConfig,
  LayerItemState,
  LayerId,
} from '../../../types/qrStudio';
import {
  Type,
  Layers,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  Sliders,
} from 'lucide-react';

interface TextLayersTabProps {
  textLayers: TextLayersConfig;
  layers: LayerItemState[];
  onTextLayersChange: (textLayers: TextLayersConfig) => void;
  onLayersChange: (layers: LayerItemState[]) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const TextLayersTab: React.FC<TextLayersTabProps> = ({
  textLayers,
  layers,
  onTextLayersChange,
  onLayersChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const updateTextLayer = (
    key: keyof TextLayersConfig,
    field: keyof TextLayerConfig,
    value: any
  ) => {
    onTextLayersChange({
      ...textLayers,
      [key]: {
        ...textLayers[key],
        [field]: value,
      },
    });
  };

  const toggleLayerVisibility = (id: LayerId) => {
    onLayersChange(
      layers.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;
    const next = [...layers];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onLayersChange(next);
  };

  const fontOptions = [
    'Plus Jakarta Sans',
    'Space Grotesk',
    'Inter',
    'Outfit',
    'Montserrat',
    'Playfair Display',
  ];

  const renderTextEditor = (
    label: string,
    key: keyof TextLayersConfig,
    layerConfig: TextLayerConfig
  ) => {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={layerConfig.enabled}
              onChange={(e) => updateTextLayer(key, 'enabled', e.target.checked)}
              className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{label}</span>
          </label>

          <span className="text-[10px] text-slate-500 font-mono">
            {layerConfig.position} position
          </span>
        </div>

        {layerConfig.enabled && (
          <div className="space-y-3 pt-1 text-xs">
            <input
              type="text"
              value={layerConfig.text}
              onChange={(e) => updateTextLayer(key, 'text', e.target.value)}
              placeholder={`Enter ${label.toLowerCase()} text...`}
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-medium"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400">Font</label>
                <select
                  value={layerConfig.font}
                  onChange={(e) => updateTextLayer(key, 'font', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white"
                >
                  {fontOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Size</span>
                  <span className="text-slate-400">{layerConfig.size}px</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={36}
                  step={1}
                  value={layerConfig.size}
                  onChange={(e) => updateTextLayer(key, 'size', parseInt(e.target.value))}
                  className="w-full accent-violet-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={layerConfig.color}
                    onChange={(e) => updateTextLayer(key, 'color', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={layerConfig.color}
                    onChange={(e) => updateTextLayer(key, 'color', e.target.value)}
                    className="flex-1 px-2 py-1 rounded border border-slate-800 bg-slate-950 text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={layerConfig.uppercase}
                  onChange={(e) => updateTextLayer(key, 'uppercase', e.target.checked)}
                  className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-[11px]">ALL CAPS</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={layerConfig.backgroundPill}
                  onChange={(e) => updateTextLayer(key, 'backgroundPill', e.target.checked)}
                  className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-[11px]">Background Pill Badge</span>
              </label>

              {layerConfig.backgroundPill && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Pill Color:</span>
                  <input
                    type="color"
                    value={layerConfig.pillColor || '#f1f5f9'}
                    onChange={(e) => updateTextLayer(key, 'pillColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Undo / Redo Action Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-violet-400" />
          <span>Layer Composition Stack & Undo History</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
        </div>
      </div>

      {/* Layer Stack Reordering & Visibility Manager */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Layer Hierarchy & Visibility Stack
        </label>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className={`p-1 rounded-lg transition ${
                    layer.visible ? 'text-violet-400 hover:text-violet-300' : 'text-slate-600 hover:text-slate-500'
                  }`}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span className={`font-semibold ${layer.visible ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {layer.name}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveLayer(index, 'up')}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === layers.length - 1}
                  onClick={() => moveLayer(index, 'down')}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Text Layers Editors */}
      <div className="space-y-3">
        {renderTextEditor('Top Heading', 'heading', textLayers.heading)}
        {renderTextEditor('Secondary Subtitle', 'subtitle', textLayers.subtitle)}
        {renderTextEditor('Call-To-Action (CTA)', 'cta', textLayers.cta)}
        {renderTextEditor('Footer Caption', 'footer', textLayers.footer)}
      </div>
    </div>
  );
};
