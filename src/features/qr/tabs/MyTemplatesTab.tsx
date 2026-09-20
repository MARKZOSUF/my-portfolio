import React, { useState, useEffect } from 'react';
import {
  StudioTemplate,
  StudioDesignState,
  TemplateCategory,
} from '../../../types/qrStudio';
import {
  Bookmark,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Download,
  Upload,
  Check,
  FolderOpen,
} from 'lucide-react';
import { TEMPLATE_CATEGORIES } from '../data/templatesData';

interface MyTemplatesTabProps {
  currentDesign: StudioDesignState;
  onApplyTemplate: (template: StudioTemplate) => void;
  onSaveCurrentAsTemplate: (name: string, category: TemplateCategory) => void;
}

const STORAGE_KEY = 'zosuf_my_custom_templates';

export const MyTemplatesTab: React.FC<MyTemplatesTabProps> = ({
  currentDesign,
  onApplyTemplate,
  onSaveCurrentAsTemplate,
}) => {
  const [templates, setTemplates] = useState<StudioTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('Brand Master QR');
  const [newTemplateCat, setNewTemplateCat] = useState<TemplateCategory>('Business');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Persist templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.warn('Failed to persist user templates:', e);
    }
  }, [templates]);

  const handleCreate = () => {
    if (!newTemplateName.trim()) return;
    const newTpl: StudioTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      category: newTemplateCat,
      description: `Custom saved design created on ${new Date().toLocaleDateString()}`,
      design: JSON.parse(JSON.stringify(currentDesign)),
    };
    setTemplates([newTpl, ...templates]);
    setIsCreating(false);
    setNewTemplateName('Brand Master QR');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this template permanently from your local library?')) {
      setTemplates(templates.filter((t) => t.id !== id));
    }
  };

  const handleDuplicate = (tpl: StudioTemplate) => {
    const duplicated: StudioTemplate = {
      ...tpl,
      id: `custom-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
    };
    setTemplates([duplicated, ...templates]);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, name: editName.trim() } : t))
    );
    setEditingId(null);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(templates, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zosuf-my-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setTemplates([...imported, ...templates]);
        }
      } catch (err) {
        console.error('Failed to parse imported templates JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-violet-400" />
            <span>Personal Template Vault ({templates.length})</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Stored private and local inside your device&apos;s browser storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={templates.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs font-semibold disabled:opacity-40 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Design</span>
          </button>
        </div>
      </div>

      {/* Creation Modal / Inline Box */}
      {isCreating && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-violet-900/60 space-y-3">
          <h4 className="text-xs font-bold text-white">Save Current QR Design as Template</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Template Title</label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Category</label>
              <select
                value={newTemplateCat}
                onChange={(e) => setNewTemplateCat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-white"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-sm"
            >
              Save to Library
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="p-10 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-950/40 text-violet-400 flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">No Saved Templates Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Customize your QR frame, shapes, colors and logo in the Studio, then click &quot;Save Current Design&quot; to keep it handy.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold"
          >
            Save Current Design Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
          {templates.map((tpl) => {
            const isEditing = editingId === tpl.id;
            return (
              <div
                key={tpl.id}
                className="group p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-violet-500/70 transition space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(tpl.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition">
                          {tpl.name}
                        </h4>
                        <span className="text-[10px] uppercase font-semibold text-slate-400">
                          {tpl.category}
                        </span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(tpl.id);
                            setEditName(tpl.name);
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(tpl)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyTemplate(tpl)}
                  className="w-full py-2 px-3 rounded-xl border border-violet-800/60 bg-violet-950/30 hover:bg-violet-900/50 text-violet-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Apply This Template</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
