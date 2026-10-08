import { useState } from 'react';
import { ImageOff, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExerciseInfo } from '@/lib/exercise-detail';
export function ExerciseMedia({ exercise, compact=false }: { exercise: ExerciseInfo; compact?: boolean }) {
 const [frame,setFrame]=useState(0); const [failed,setFailed]=useState(false); const [photoFailed,setPhotoFailed]=useState(false);
 const [mode,setMode]=useState<'video'|'gif'|'photo'>(exercise.videoUrl ? 'video' : exercise.gifUrl ? 'gif' : 'photo');
 const [gifPlaying,setGifPlaying]=useState(false);
 const photo=photoFailed ? undefined : exercise.images[frame % Math.max(1,exercise.images.length)];
 const src=mode==='gif' && gifPlaying && !failed ? exercise.gifUrl : photo;
 return <div className={compact ? 'relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-elevated' : 'relative overflow-hidden rounded-lg border border-border bg-elevated'}>
 {mode==='video' && exercise.videoUrl && !failed ? <video key={exercise.videoUrl} poster={photo} controls playsInline muted={compact} loop={compact} preload="none" aria-label={`Vídeo de ${exercise.name}`} onError={()=>setFailed(true)} className={compact ? 'h-full w-full object-contain' : 'aspect-video max-h-96 w-full object-contain'}>{exercise.webmUrl && <source src={exercise.webmUrl} type="video/webm"/>}<source src={exercise.videoUrl} type="video/mp4"/></video> : src ? <img key={src} src={src} loading="lazy" alt={`Execução de ${exercise.name}${mode==='gif' && gifPlaying ? ' — GIF' : frame ? ' — posição final' : ' — posição inicial'}`} onError={()=>{if(src===exercise.gifUrl)setFailed(true);else setPhotoFailed(true);}} className={compact ? 'h-full w-full object-cover' : 'aspect-[4/3] max-h-96 w-full object-contain'} /> : <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${compact ? 'h-full' : 'aspect-video'}`}><ImageOff className="size-6" />{!compact && <p className="text-sm">Demonstração ainda não disponível</p>}</div>}
 {compact && exercise.videoUrl && exercise.gifUrl && <Button size="sm" variant="secondary" className="absolute left-1 top-1 h-6 px-1 text-[10px]" aria-label={`Mostrar ${mode==='video'?'GIF':'vídeo'} de ${exercise.name}`} onClick={()=>{setMode(mode==='video'?'gif':'video');setGifPlaying(false);setFailed(false);}}>{mode==='video'?'GIF':'Vídeo'}</Button>}
 {mode==='gif' && exercise.gifUrl && <Button size="icon" variant="secondary" title={gifPlaying?'Pausar GIF':'Reproduzir GIF'} aria-label={`${gifPlaying?'Pausar':'Reproduzir'} GIF de ${exercise.name}`} className="absolute right-2 top-2" onClick={()=>{setGifPlaying(!gifPlaying);setFailed(false);}}>{gifPlaying?<Pause className="size-4"/>:<Play className="size-4"/>}</Button>}
 {!compact && <><div className="flex flex-wrap justify-center gap-2 border-t border-border p-3">
 {exercise.videoUrl && <Button size="sm" variant={mode==='video'?'default':'secondary'} onClick={()=>{setMode('video');setFailed(false);setGifPlaying(false);}}>Vídeo</Button>}
 {exercise.gifUrl && <Button size="sm" variant={mode==='gif'?'default':'secondary'} onClick={()=>{setMode('gif');setFailed(false);setGifPlaying(false);}}>GIF</Button>}
 {exercise.images.map((_,i)=><Button key={i} size="sm" variant={mode==='photo' && frame===i?'default':'secondary'} onClick={()=>{setMode('photo');setFrame(i);setFailed(false);setPhotoFailed(false);setGifPlaying(false);}}>{i===0?'Posição inicial':'Posição final'}</Button>)}</div>
 {failed && <p role="status" className="px-3 pb-3 text-xs text-muted-foreground">Não foi possível carregar esta demonstração.</p>}
 {exercise.mediaCredit && <p className="px-3 pb-3 text-xs text-muted-foreground">{exercise.mediaCredit.author} · <a href={exercise.mediaCredit.sourceUrl} target="_blank" rel="noreferrer" className="underline">Fonte</a> · <a href={exercise.mediaCredit.licenseUrl} target="_blank" rel="noreferrer" className="underline">{exercise.mediaCredit.license}</a></p>}</>}
 </div>;
}
