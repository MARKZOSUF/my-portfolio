import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, Clock3, Download, Upload, RotateCcw, BookmarkPlus, X } from 'lucide-react';
import { StudioTemplate, TemplateCategory, StudioDesignState } from '../../../types/qrStudio';
import { PREMADE_STUDIO_TEMPLATES, TEMPLATE_CATEGORIES } from '../data/templatesData';

interface Props {
  currentDesign: StudioDesignState;
  onApplyTemplate: (template: StudioTemplate) => void;
  onSaveCurrentAsTemplate: (name: string, category: TemplateCategory) => void;
  onResetDesign: () => void;
}

const safeList = (key: string) => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(v => typeof v === 'string').slice(0, 30) : []; }
  catch { return []; }
};

function MiniQR({ template }: { template: StudioTemplate }) {
  const color = template.design.shapes.fgColor;
  const accent = template.design.frame.primaryColor;
  let seed = 0;
  for (const char of template.id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return <div className="relative w-[66px] h-[66px] rounded-lg bg-white p-1.5 shadow-sm" style={{ border: `2px solid ${accent}` }}>
    <div className="grid grid-cols-7 gap-[2px] w-full h-full">
      {Array.from({ length: 49 }, (_, i) => {
        const row = Math.floor(i / 7), col = i % 7;
        const finder = (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3);
        const on = finder ? (row % 2 === 0 || col % 2 === 0) : ((seed >> (i % 24)) + i * 7) % 3 !== 0;
        return <span key={i} className={template.design.shapes.dotType === 'dots' ? 'rounded-full' : 'rounded-[1px]'} style={{ background: on ? color : 'transparent' }} />;
      })}
    </div>
  </div>;
}

export const TemplatesTab: React.FC<Props> = ({ onApplyTemplate, onSaveCurrentAsTemplate, onResetDesign }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [mode, setMode] = useState<'all'|'recent'|'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>(() => safeList('zosuf_fav_templates'));
  const [recent, setRecent] = useState<string[]>(() => safeList('zosuf_recent_templates'));
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('My ZOSUF Design');
  const [saveCategory, setSaveCategory] = useState<TemplateCategory>('Minimal');
  const [notice, setNotice] = useState('');

  useEffect(() => { try { localStorage.setItem('zosuf_fav_templates', JSON.stringify(favorites.slice(0, 30))); } catch {} }, [favorites]);

  const shown = useMemo(() => PREMADE_STUDIO_TEMPLATES.filter(t => {
    const q = query.toLowerCase();
    const textMatch = !q || `${t.name} ${t.category} ${t.description}`.toLowerCase().includes(q);
    const catMatch = category === 'All' || t.category === category;
    const modeMatch = mode === 'all' || (mode === 'recent' ? recent.includes(t.id) : favorites.includes(t.id));
    return textMatch && catMatch && modeMatch;
  }), [query, category, mode, recent, favorites]);

  const apply = (template: StudioTemplate) => {
    onApplyTemplate(template);
    const next = [template.id, ...recent.filter(id => id !== template.id)].slice(0, 12);
    setRecent(next); try { localStorage.setItem('zosuf_recent_templates', JSON.stringify(next)); } catch {}
    setNotice(`${template.name} applied`); setTimeout(() => setNotice(''), 1800);
  };

  const importTemplate = (file: File) => {
    if (file.size > 250_000) { setNotice('Template JSON must be under 250 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => { try {
      const parsed = JSON.parse(String(reader.result));
      const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!candidate || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !candidate.design?.shapes || !candidate.design?.frame) throw new Error();
      apply(candidate as StudioTemplate);
    } catch { setNotice('Invalid ZOSUF template file'); } };
    reader.readAsText(file);
  };

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(PREMADE_STUDIO_TEMPLATES, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'zosuf-template-library.json'; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-slate-900">Pre-Made Templates</h2><p className="text-xs text-slate-500 mt-1">Original ZOSUF designs — click any thumbnail to apply instantly.</p></div>
      <div className="flex gap-2"><button onClick={() => setSaveOpen(true)} className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5"><BookmarkPlus className="w-4 h-4"/>Save Design</button><button onClick={onResetDesign} className="px-3 py-2 rounded-xl border border-slate-200 text-rose-600 text-xs font-bold flex items-center gap-1.5"><RotateCcw className="w-4 h-4"/>Reset</button></div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates, themes or categories" className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm"/></div>
      <div className="flex gap-1.5 overflow-x-auto">
        {([['all','All'],['recent','Recently Used'],['favorites','Favourites']] as const).map(([id,label]) => <button key={id} onClick={() => setMode(id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border ${mode===id?'bg-violet-600 border-violet-600 text-white':'bg-white border-slate-200 text-slate-600'}`}>{id==='recent'&&<Clock3 className="inline w-3.5 h-3.5 mr-1"/>}{id==='favorites'&&<Star className="inline w-3.5 h-3.5 mr-1"/>}{label}</button>)}
      </div>
    </div>

    <div className="flex gap-1.5 overflow-x-auto pb-1 studio-scroll">
      {['All', ...TEMPLATE_CATEGORIES].map(cat => <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${category===cat?'bg-fuchsia-600 text-white':'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>{cat}</button>)}
    </div>

    {notice && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</div>}

    <div className="studio-thumbnail-grid max-h-[610px] overflow-y-auto pr-1 studio-scroll">
      {shown.map(t => <div key={t.id} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') apply(t); }} onClick={() => apply(t)} title={`${t.name} — ${t.description}`} className="studio-thumb group relative rounded-xl p-2 flex flex-col items-center justify-between transition cursor-pointer">
        <button type="button" aria-label={`Favourite ${t.name}`} onClick={e => { e.stopPropagation(); setFavorites(v => v.includes(t.id)?v.filter(x=>x!==t.id):[...v,t.id]); }} className="absolute right-1 top-1 min-h-0 p-1 rounded-md bg-white/90 z-10"><Star className={`w-3.5 h-3.5 ${favorites.includes(t.id)?'fill-amber-400 text-amber-400':'text-slate-300'}`}/></button>
        <div className="flex-1 w-full flex items-center justify-center rounded-lg" style={{background:t.design.frame.backgroundColor}}><MiniQR template={t}/></div>
        <span className="w-full mt-2 text-[10px] font-bold text-slate-700 truncate text-center">{t.name}</span>
      </div>)}
    </div>
    {shown.length===0 && <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-sm">No templates match this filter.</div>}

    <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-200">
      <div className="flex gap-2"><button onClick={exportPresets} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5"><Download className="w-4 h-4"/>Export JSON</button><label className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4"/>Import JSON<input type="file" accept="application/json,.json" className="hidden" onChange={e => e.target.files?.[0]&&importTemplate(e.target.files[0])}/></label></div>
      <span className="text-xs text-slate-400 self-center">{shown.length} designs</span>
    </div>

    {saveOpen && <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm p-4 grid place-items-center" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200"><div className="flex justify-between"><div><h3 className="font-black text-slate-900">Save current template</h3><p className="text-xs text-slate-500">Stored only in this browser.</p></div><button onClick={() => setSaveOpen(false)} className="p-1 min-h-0"><X className="w-5 h-5"/></button></div><div className="space-y-3 mt-5"><input value={name} onChange={e=>setName(e.target.value.slice(0,50))} className="w-full px-3 py-2 rounded-xl border"/><select value={saveCategory} onChange={e=>setSaveCategory(e.target.value as TemplateCategory)} className="w-full px-3 py-2 rounded-xl border">{TEMPLATE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><div className="flex gap-2"><button onClick={()=>setSaveOpen(false)} className="flex-1 rounded-xl border border-slate-200 font-bold text-sm">Cancel</button><button onClick={()=>{if(name.trim()){onSaveCurrentAsTemplate(name.trim(),saveCategory);setSaveOpen(false);setNotice('Design saved to My Templates');}}} className="flex-1 rounded-xl bg-violet-600 text-white font-bold text-sm">Save Template</button></div></div></div></div>}
  </div>;
};
