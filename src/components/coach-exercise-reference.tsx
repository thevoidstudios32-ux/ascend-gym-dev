import { getExerciseInfo } from '@/lib/exercise-detail';
import { ExerciseMedia } from './exercise-media';
import { MuscleMap } from './muscle-map';

/** Read-only proposal sheet; no history query, mutation, or AI request. */
export function CoachExerciseReference({ name, muscle = '', tip = '', sets, reps, rest }: { name: string; muscle?: string; tip?: string; sets: number; reps: string; rest: number }) {
  const info = getExerciseInfo(name, muscle, tip);
  return <details className="border-t border-border py-3">
    <summary className="cursor-pointer text-sm font-bold marker:text-primary">
      {name}<span className="ml-2 inline-block text-xs font-normal text-muted-foreground">{sets} × {reps} · {rest}s</span>
    </summary>
    <div className="mt-4 grid min-w-0 gap-5 md:grid-cols-2">
      <div className="min-w-0 space-y-4"><ExerciseMedia key={info.id} exercise={info} /><p className="text-xs text-muted-foreground">{info.equipment} · {info.difficulty}</p><p className="text-sm">{info.description}</p><ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">{info.instructions.map((step, i) => <li key={i}>{step}</li>)}</ol></div>
      <div className="min-w-0"><MuscleMap primaryMuscles={info.primaryMuscles} secondaryMuscles={info.secondaryMuscles} compact /><p className="mt-3 text-center text-xs text-muted-foreground">{info.primaryMuscles.join(' · ')}{info.secondaryMuscles.length ? ` / ${info.secondaryMuscles.join(' · ')}` : ''}</p></div>
    </div>
  </details>;
}