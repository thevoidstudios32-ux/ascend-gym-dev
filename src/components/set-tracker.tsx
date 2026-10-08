import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SetEntry } from '@/lib/exercise-detail';
export function SetTracker({ entries,onChange,onComplete }: {entries:SetEntry[];onChange:(index:number,patch:Partial<SetEntry>)=>void;onComplete:(index:number)=>void}) {
 return <div className="space-y-2">{entries.map((e,i)=><div key={e.set_index} className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.5rem] items-end gap-2 rounded-lg border border-border bg-elevated p-3">
 <span className="pb-2 text-sm font-bold">{e.set_index}</span>{(['weight_kg','reps','rir'] as const).map(k=><label key={k} className="min-w-0 text-[10px] uppercase text-muted-foreground">{k==='weight_kg'?'Carga · kg':k==='reps'?'Reps':'RIR'}<input aria-label={`${k==='weight_kg'?'Carga':k==='reps'?'Repetições':'RIR'} série ${e.set_index}`} type="number" min={0} max={k==='rir'?10:k==='reps'?100:600} step={k==='weight_kg'?0.5:1} value={e[k]??''} onChange={ev=>onChange(i,{[k]: k==='rir' && ev.target.value==='' ? null : Number(ev.target.value)})} className="mt-1 h-10 w-full rounded-md border border-border bg-surface px-2 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>)}
 <Button size="icon" variant={e.done?'default':'secondary'} aria-label={`${e.done?'Reabrir':'Concluir'} série ${e.set_index}`} aria-pressed={e.done} onClick={()=>onComplete(i)}><Check className="size-4" /></Button>
 </div>)}</div>;
}
