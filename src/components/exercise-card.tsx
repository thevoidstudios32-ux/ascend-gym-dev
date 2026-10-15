import { ArrowUpRight, Check, Dumbbell, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseMedia } from './exercise-media';
import type { ExerciseInfo, SetEntry } from '@/lib/exercise-detail';
export function ExerciseCard({ exercise, prescription, entries, suggested, onOpen }: {exercise:ExerciseInfo;prescription:{sets:number;reps:string;rest:number};entries:SetEntry[];suggested:number|null;onOpen:()=>void}) {
 const done=entries.filter(e=>e.done).length;const load=entries[0]?.weight_kg;const rir=entries.find(e=>e.rir!==null)?.rir;
 return <article className="rounded-lg border border-border bg-surface p-4">
 <div className="flex items-start gap-4"><ExerciseMedia exercise={exercise} compact /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h2 className="text-base font-bold leading-tight">{exercise.name}</h2>{done===entries.length && done>0 && <Check className="size-4 shrink-0 text-primary" />}</div><p className="mt-1 text-xs text-muted-foreground">{exercise.muscleGroup}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Dumbbell className="size-3" />{exercise.equipment}</p></div></div>
 <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs"><p className="font-semibold">{prescription.sets} séries × {prescription.reps} reps</p><p className="flex items-center justify-end gap-1 text-muted-foreground"><Timer className="size-3" />{prescription.rest}s descanso</p><p>Carga: <strong>{load ? `${load} kg` : suggested ? `${suggested} kg sugeridos` : 'A definir'}</strong></p><p className="text-right text-muted-foreground">{rir!==undefined && rir!==null ? `RIR ${rir} · `:''}{done}/{entries.length} concluídas</p></div>
 {!exercise.videoUrl && !exercise.gifUrl && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{exercise.instructions[0]}</p>}
 <Button variant="secondary" className="mt-4 h-9 w-full justify-between" onClick={onOpen}>Ver execução e detalhes<ArrowUpRight className="size-4" /></Button>
 </article>;
}
