/* Treinos personalizados de calistenia — lógica pura (client-safe). */

import type { Split } from "@/lib/ascend";

export type CustomExercise = {
  name: string;
  emoji: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  hold: number | null;
  tip: string;
};

export type CustomWorkout = {
  id: string;
  user_id: string;
  name: string;
  focus: string;
  emoji: string;
  difficulty: string;
  notes: string | null;
  exercises: CustomExercise[];
  created_at: string;
  updated_at: string;
};

export type WorkoutVersion = {
  id: string;
  workout_id: string;
  name: string;
  focus: string;
  notes: string | null;
  exercises: CustomExercise[];
  reason: string | null;
  created_at: string;
};

export type Proposal = {
  name: string;
  focus: string;
  emoji: string;
  difficulty: string;
  notes: string | null;
  exercises: CustomExercise[];
  summary: string;
  changes: string[];
};

export const DIFFICULTIES = ["iniciante", "intermediário", "avançado"] as const;

export const FOCUS_OPTIONS = [
  "Corpo inteiro",
  "Empurrar (peito/ombro/tríceps)",
  "Puxar (costas/bíceps)",
  "Pernas",
  "Core / abdômen",
  "Skills / progressões",
] as const;

/** Catálogo base de calistenia (o usuário também pode digitar exercícios novos). */
export const CALISTHENICS: CustomExercise[] = [
  { name: "Flexões", emoji: "🤸", muscle: "Peito", sets: 4, reps: "10-15", rest: 60, hold: null, tip: "Corpo em linha reta, cotovelos a 45°." },
  { name: "Flexão diamante", emoji: "💎", muscle: "Tríceps", sets: 3, reps: "8-12", rest: 60, hold: null, tip: "Mãos juntas sob o peito, cotovelos rentes." },
  { name: "Flexão arqueiro", emoji: "🏹", muscle: "Peito", sets: 3, reps: "6-8", rest: 75, hold: null, tip: "Um braço estica lateralmente enquanto o outro trabalha." },
  { name: "Barra fixa", emoji: "🧗", muscle: "Dorsal", sets: 4, reps: "5-10", rest: 90, hold: null, tip: "Pegada pronada, puxe com os cotovelos até o queixo passar." },
  { name: "Barra supinada", emoji: "🦾", muscle: "Bíceps", sets: 3, reps: "6-10", rest: 90, hold: null, tip: "Palmas viradas para você, escápulas ativas." },
  { name: "Australian pull-up", emoji: "🪃", muscle: "Costas", sets: 4, reps: "10-15", rest: 60, hold: null, tip: "Corpo rígido, puxe o peito até a barra." },
  { name: "Dips / paralelas", emoji: "🪜", muscle: "Peito e tríceps", sets: 4, reps: "8-12", rest: 90, hold: null, tip: "Desça até 90° no cotovelo, ombros longe da orelha." },
  { name: "Agachamento", emoji: "🦵", muscle: "Pernas", sets: 4, reps: "15-20", rest: 60, hold: null, tip: "Peito aberto, desça até a paralela." },
  { name: "Afundo", emoji: "🚶", muscle: "Pernas", sets: 3, reps: "12 cada", rest: 60, hold: null, tip: "Joelho da frente alinhado ao pé." },
  { name: "Pistol squat", emoji: "🔫", muscle: "Pernas", sets: 3, reps: "5 cada", rest: 90, hold: null, tip: "Use apoio no início para controlar a descida." },
  { name: "Elevação de pernas", emoji: "🦿", muscle: "Core", sets: 3, reps: "12-15", rest: 45, hold: null, tip: "Não balance: suba com o abdômen." },
  { name: "L-sit", emoji: "📐", muscle: "Core", sets: 4, reps: "isometria", rest: 60, hold: 20, tip: "Ombros deprimidos, pernas retas e paralelas ao chão." },
  { name: "Prancha", emoji: "🧘", muscle: "Core", sets: 3, reps: "isometria", rest: 45, hold: 45, tip: "Glúteo contraído, quadril alinhado." },
  { name: "Handstand", emoji: "🤸‍♂️", muscle: "Ombro", sets: 4, reps: "isometria", rest: 90, hold: 30, tip: "Comece encostado na parede, core firme." },
  { name: "Pike push-up", emoji: "🔺", muscle: "Ombro", sets: 3, reps: "8-12", rest: 60, hold: null, tip: "Progressão para o handstand push-up." },
  { name: "Negativa de muscle-up", emoji: "⬇️", muscle: "Progressão", sets: 4, reps: "3-5", rest: 120, hold: null, tip: "Desça o mais lento possível a partir do apoio." },
  { name: "Remada de tuck front lever", emoji: "🌀", muscle: "Progressão", sets: 4, reps: "5-8", rest: 120, hold: null, tip: "Joelhos no peito, quadril na altura da barra." },
];

export function emptyExercise(): CustomExercise {
  return { name: "", emoji: "🤸", muscle: "", sets: 3, reps: "10-12", rest: 60, hold: null, tip: "" };
}

export function estimateMinutes(exercises: CustomExercise[]) {
  const seconds = exercises.reduce(
    (acc, e) => acc + e.sets * ((e.hold ?? 40) + e.rest),
    0,
  );
  return Math.max(10, Math.round(seconds / 60));
}

/** Converte um treino personalizado no formato usado pela sessão de treino. */
export function customToSplit(w: CustomWorkout): Split {
  return {
    id: "full",
    name: w.name,
    emoji: w.emoji || "🤸",
    focus: w.focus,
    minutes: estimateMinutes(w.exercises),
    exercises: w.exercises.map((e) => ({
      name: e.name,
      emoji: e.emoji || "🤸",
      muscle: e.muscle || w.focus,
      sets: e.sets,
      reps: e.hold ? `${e.hold}s` : e.reps,
      rest: e.rest,
      tip: e.tip || "Execute com controle total.",
    })),
  };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
