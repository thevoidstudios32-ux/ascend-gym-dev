import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseInfo } from '@/lib/exercise-detail';
export function ExerciseMedia({ exercise, compact=false }: { exercise: ExerciseInfo; compact?: boolean }) {
 const [frame,setFrame]=useState(0); const [failed,setFailed]=useState(false);
 if(exercise.videoUrl && !compact) return <video src={exercise.videoUrl} controls playsInline className="aspect-video w-full rounded-lg bg-elevated object-contain" />;
 const src=exercise.gifUrl ?? exercise.images[frame % Math.max(1,exercise.images.length)];
 return <div className={compact ? 'relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-elevated' : 'relative overflow-hidden rounded-lg border border-border bg-elevated'}>
 {src && !failed ? <img key={src} src={src} alt={`Execução de ${exercise.name}${frame ? ' — posição final' : ' — posição inicial'}`} onError={()=>setFailed(true)} className={compact ? 'h-full w-full object-cover' : 'aspect-[4/3] max-h-96 w-full object-contain'} /> : <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${compact ? 'h-full' : 'aspect-video'}`}><ImageOff className="size-6" />{!compact && <p className="text-sm">Demonstração ainda não disponível</p>}</div>}
 {!compact && exercise.images.length>1 && <div className="flex justify-center gap-2 border-t border-border p-3">{exercise.images.map((_,i)=><Button key={i} size="sm" variant={frame===i?'default':'secondary'} onClick={()=>setFrame(i)}>{i===0?'Posição inicial':'Posição final'}</Button>)}</div>}
 </div>;
}
