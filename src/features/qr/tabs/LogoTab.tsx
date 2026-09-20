import React, { useRef, useState } from 'react';
import { LogoConfig, ErrorCorrectionLevel } from '../../../types/qrStudio';
import { LOCAL_ICON_PRESETS } from '../data/localIcons';
import { Upload, Trash2, X, Image as ImageIcon, Search, Check } from 'lucide-react';

interface Props { config: LogoConfig; errorCorrection: ErrorCorrectionLevel; onChange: (config: LogoConfig) => void; onSetErrorCorrection: (ecc: ErrorCorrectionLevel) => void; }

export const LogoTab: React.FC<Props> = ({ config, errorCorrection, onChange, onSetErrorCorrection }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const update = <K extends keyof LogoConfig>(key: K, value: LogoConfig[K]) => onChange({ ...config, [key]: value });

  const activate = (dataUrl: string, type: string) => { onChange({ ...config, dataUrl, fileType: type }); onSetErrorCorrection('H'); setLibraryOpen(false); setError(''); };
  const upload = (file: File) => {
    setError('');
    if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)) { setError('Use PNG, JPG, WebP or SVG.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('Logo must be smaller than 3 MB.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setError('Logo could not be read.');
    reader.onload = () => {
      const data = String(reader.result || '');
      const img = new Image(); img.onload = () => activate(data, file.type); img.onerror = () => setError('This image could not be decoded.'); img.src = data;
    };
    reader.readAsDataURL(file);
  };
  const shown = LOCAL_ICON_PRESETS.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  return <div className="space-y-5">
    <div><h2 className="text-xl font-black text-slate-900">Logo</h2><p className="text-xs text-slate-500 mt-1">Add a local icon or your own brand mark. Error correction automatically switches to H.</p></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button onClick={() => setLibraryOpen(true)} className="p-5 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:border-violet-500 text-left flex items-center gap-4"><span className="w-12 h-12 rounded-xl bg-violet-600 text-white grid place-items-center"><ImageIcon className="w-6 h-6"/></span><span><b className="block text-slate-900">Open logo library</b><small className="text-slate-500">Social and utility icons</small></span></button>
      <button onClick={() => inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)upload(f);}} className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-violet-500 text-left flex items-center gap-4"><span className="w-12 h-12 rounded-xl bg-slate-100 text-violet-600 grid place-items-center"><Upload className="w-6 h-6"/></span><span><b className="block text-slate-900">Upload custom logo</b><small className="text-slate-500">PNG, JPG, WebP or SVG</small></span></button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/>
    </div>

    {config.dataUrl && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-16 h-16 rounded-xl bg-white border p-2 grid place-items-center"><img src={config.dataUrl} alt="Selected logo" className="max-h-full max-w-full"/></div><div><b className="text-sm text-slate-900">Active center logo</b><p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5"/>ECC {errorCorrection} enabled</p></div></div><button onClick={()=>onChange({...config,dataUrl:undefined,fileType:undefined})} className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1"><Trash2 className="w-4 h-4"/>Remove</button></div>}

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Range label="Logo size" value={Math.round(config.size*100)} min={8} max={30} suffix="%" onChange={v=>update('size',v/100)}/><Range label="Inner padding" value={config.padding} min={0} max={18} suffix="px" onChange={v=>update('padding',v)}/><Range label="Opacity" value={Math.round(config.opacity*100)} min={25} max={100} suffix="%" onChange={v=>update('opacity',v/100)}/><label className="text-xs font-bold text-slate-600">Container shape<select value={config.shape} onChange={e=>update('shape',e.target.value as LogoConfig['shape'])} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="circle">Circle</option><option value="rounded">Rounded square</option><option value="square">Square</option><option value="none">No background</option></select></label></div>
      <label className="text-xs font-bold text-slate-600">Logo background<div className="flex gap-2 mt-1"><input type="color" value={config.bgColor} onChange={e=>update('bgColor',e.target.value)} className="w-12 h-10 rounded-lg"/><input value={config.bgColor} onChange={e=>update('bgColor',e.target.value)} className="flex-1 px-3 rounded-xl border font-mono"/></div></label>
      {config.size>0.25&&<p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">Large logos can reduce scan reliability. Keep the logo at 25% or below.</p>}
    </div>

    {libraryOpen && <div className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-sm p-4 grid place-items-center" role="dialog" aria-modal="true"><div className="w-full max-w-4xl max-h-[84vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"><div className="p-5 border-b flex items-center justify-between"><div><h3 className="text-xl font-black text-slate-900">Logotypes</h3><p className="text-xs text-slate-500">Choose a locally embedded icon.</p></div><button onClick={()=>setLibraryOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button></div><div className="p-4 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search icons" className="w-full pl-9 pr-3 py-2 rounded-xl border"/></div></div><div className="p-5 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 studio-scroll">{shown.map(icon=><button key={icon.id} onClick={()=>activate(icon.dataUrl,'image/svg+xml')} title={icon.name} className="aspect-square min-h-0 rounded-xl border border-slate-200 hover:border-fuchsia-500 hover:bg-fuchsia-50 p-3 flex flex-col items-center justify-center gap-2"><img src={icon.dataUrl} alt="" className="w-9 h-9"/><span className="text-[10px] text-slate-600 truncate max-w-full">{icon.name}</span></button>)}</div><div className="p-4 border-t flex justify-end"><button onClick={()=>setLibraryOpen(false)} className="px-8 py-2 rounded-xl border border-slate-300 text-sm font-bold">Cancel</button></div></div></div>}
  </div>;
};
function Range({label,value,min,max,suffix,onChange}:{label:string;value:number;min:number;max:number;suffix:string;onChange:(n:number)=>void}){return <label className="text-xs font-bold text-slate-600"><span className="flex justify-between"><span>{label}</span><b>{value}{suffix}</b></span><input className="w-full accent-fuchsia-600" type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
