import React, { useMemo, useState } from 'react';
import { FrameConfig } from '../../../types/qrStudio';
import { FRAME_PRESETS } from '../data/framesData';
import { Sliders, Sparkles } from 'lucide-react';

interface Props { config: FrameConfig; onChange: (config: FrameConfig) => void; }
type FrameGroup = 'All'|'Standard'|'Holidays'|'Events'|'Themes';

const groupOf = (name: string, category: string): FrameGroup => {
  const n = name.toLowerCase();
  if (/heart|gift|floral|star|leaf|holiday|christmas|valentine/.test(n)) return 'Holidays';
  if (/ticket|event|vip|pass|coupon/.test(n) || category === 'event') return 'Events';
  if (/neon|cyber|music|coffee|vintage|orbit|hex|speech|phone/.test(n) || category === 'creative') return 'Themes';
  return 'Standard';
};

export const FramesTab: React.FC<Props> = ({ config, onChange }) => {
  const [group, setGroup] = useState<FrameGroup>('All');
  const update = <K extends keyof FrameConfig>(key: K, value: FrameConfig[K]) => onChange({ ...config, [key]: value });
  const visible = useMemo(() => FRAME_PRESETS.filter(p => group === 'All' || groupOf(p.name,p.category) === group), [group]);

  return <div className="space-y-5">
    <div><h2 className="text-xl font-black text-slate-900">Frames</h2><p className="text-xs text-slate-500 mt-1">Original call-to-action frames designed to preserve the QR quiet zone.</p></div>
    <div className="grid grid-cols-5 gap-2 p-1 rounded-xl bg-slate-100">
      {(['All','Standard','Holidays','Events','Themes'] as FrameGroup[]).map(g => <button key={g} onClick={() => setGroup(g)} className={`px-2 py-2 rounded-lg text-xs font-bold ${group===g?'bg-white text-fuchsia-700 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{g}</button>)}
    </div>

    <div className="studio-thumbnail-grid max-h-[420px] overflow-y-auto pr-1 studio-scroll">
      {visible.map(p => {
        const selected = config.style === p.config.style;
        const c = p.config;
        return <button key={p.id} onClick={() => onChange({ ...c })} title={p.name} className={`studio-thumb rounded-xl p-2 flex flex-col justify-between transition ${selected?'ring-2 ring-fuchsia-500 border-fuchsia-500':''}`}>
          <div className="w-full flex-1 min-h-[76px] rounded-lg flex items-center justify-center relative overflow-hidden" style={{background:c.backgroundColor,border:`${Math.max(1,c.borderWidth)}px solid ${c.primaryColor}`,borderRadius:Math.min(18,c.borderRadius)}}>
            <div className="w-11 h-11 bg-white p-1 grid grid-cols-5 gap-[1px] shadow-sm">{Array.from({length:25},(_,i)=><span key={i} style={{background:[0,1,5,6,4,3,8,9,20,21,15,16,12,18,24].includes(i)?c.primaryColor:'transparent'}}/>)}</div>
            {c.ctaText && <span className="absolute bottom-1 left-1 right-1 truncate rounded px-1 py-0.5 text-[7px] font-black" style={{background:c.primaryColor,color:c.ctaTextColor}}>{c.ctaText}</span>}
          </div>
          <span className="mt-2 text-[10px] font-bold text-slate-700 truncate">{p.name}</span>
        </button>;
      })}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <h3 className="font-black text-sm text-slate-900 flex items-center gap-2"><Sliders className="w-4 h-4 text-violet-600"/>Frame controls</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([['primaryColor','Primary'],['secondaryColor','Accent'],['backgroundColor','Background']] as const).map(([key,label]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<div className="mt-1 flex gap-2"><input type="color" value={config[key]} onChange={e=>update(key,e.target.value)} className="w-10 h-10 rounded-lg p-0"/><input value={config[key]} onChange={e=>update(key,e.target.value)} className="min-w-0 flex-1 px-2 py-2 rounded-lg border font-mono text-xs"/></div></label>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Range label="Border width" value={config.borderWidth} min={0} max={12} suffix="px" onChange={v=>update('borderWidth',v)}/>
        <Range label="Corner radius" value={config.borderRadius} min={0} max={48} suffix="px" onChange={v=>update('borderRadius',v)}/>
        <Range label="Padding" value={config.padding} min={10} max={42} suffix="px" onChange={v=>update('padding',v)}/>
        <Range label="Decoration size" value={config.decorationSize} min={8} max={60} suffix="px" onChange={v=>update('decorationSize',v)}/>
        <Range label="Opacity" value={Math.round(config.opacity*100)} min={25} max={100} suffix="%" onChange={v=>update('opacity',v/100)}/>
        <label className="text-xs font-bold text-slate-600">Placement<select value={config.placement} onChange={e=>update('placement',e.target.value as FrameConfig['placement'])} className="mt-1 w-full px-3 py-2 rounded-xl border"><option value="bottom">Bottom</option><option value="top">Top</option><option value="card">Card</option><option value="badge">Badge</option></select></label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
        <label className="text-xs font-bold text-slate-600">Additional text<input value={config.ctaText} maxLength={60} onChange={e=>update('ctaText',e.target.value)} placeholder="SCAN ME" className="mt-1 w-full px-3 py-2 rounded-xl border"/></label>
        <label className="text-xs font-bold text-slate-600">Text color<div className="mt-1 flex gap-2"><input type="color" value={config.ctaTextColor} onChange={e=>update('ctaTextColor',e.target.value)} className="w-10 h-10 rounded-lg"/><input value={config.ctaTextColor} onChange={e=>update('ctaTextColor',e.target.value)} className="min-w-0 flex-1 px-2 rounded-lg border font-mono text-xs"/></div></label>
      </div>
      <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={config.shadow} onChange={e=>update('shadow',e.target.checked)}/>Drop shadow</label><span className="text-xs text-emerald-700 flex items-center gap-1"><Sparkles className="w-4 h-4"/>Changes update the verified preview instantly.</span></div>
    </div>
  </div>;
};

function Range({label,value,min,max,suffix,onChange}:{label:string;value:number;min:number;max:number;suffix:string;onChange:(v:number)=>void}){
 return <label className="text-xs font-bold text-slate-600"><span className="flex justify-between"><span>{label}</span><b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full accent-fuchsia-600"/></label>;
}
