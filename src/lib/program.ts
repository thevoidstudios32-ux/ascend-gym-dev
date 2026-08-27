/* ASCEND AI PROGRAM — tipos e helpers puros (client-safe). */

export type ProgramExercise = {
  name: string;
  emoji: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  purpose: string;
};

export type ProgramIntensity = "pesado" | "moderado" | "leve" | "recovery";

export type ProgramDay = {
  key: string;
  weekday: string;
  title: string;
  focus: string;
  muscles: string[];
  intensity: ProgramIntensity;
  minutes: number;
  exercises: ProgramExercise[];
};

export type Program = {
  id: string;
  name: string;
  goal: string;
  split_label: string;
  days_per_week: number;
  priorities: string[];
  week_focus: string | null;
  notes: string | null;
  days: ProgramDay[];
  version: number;
  active: boolean;
  updated_at: string;
};

export type ProgramProposal = {
  name: string;
  goal: string;
  split_label: string;
  days_per_week: number;
  priorities: string[];
  week_focus: string | null;
  notes: string | null;
  days: ProgramDay[];
  summary: string;
  changes: string[];
};

/** Snapshot serializável de um programa (linha de ai_programs no momento da versão). */
export type ProgramSnapshot = {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  split_label: string;
  days_per_week: number;
  priorities: string[];
  week_focus: string | null;
  notes: string | null;
  days: ProgramDay[];
  version: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramVersion = {
  id: string;
  program_id: string;
  version: number;
  reason: string | null;
  created_at: string;
  snapshot: ProgramSnapshot | null;
};

export type TrainingPreferences = {
  days_per_week: number;
  minutes_per_session: number;
  goal: string;
  experience: string;
  equipment: string[];
  priority_muscles: string[];
  liked_exercises: string[];
  disliked_exercises: string[];
  split_preference: string | null;
  restrictions: string | null;
  notes: string | null;
};

/** JSON recursivo serializável (compatível com a validação RPC do TanStack). */
export type JsonValue = string | number | boolean | null | JsonValue[] | {
  [key: string]: JsonValue;
};

export type Recommendation = {
  id: string;
  kind: string;
  title: string;
  message: string;
  action_label: string | null;
  payload: { [key: string]: JsonValue };
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
};

export const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Panturrilhas",
  "Core",
  "Antebraços",
  "Mobilidade",
] as const;

export const EQUIPMENT_OPTIONS = [
  "Academia completa",
  "Halteres",
  "Barra e anilhas",
  "Kettlebell",
  "Elásticos",
  "Barra fixa",
  "Paralelas",
  "Máquinas",
  "Peso do corpo",
] as const;

export const SPLIT_PREFERENCES = [
  "Deixe a IA decidir",
  "Push / Pull / Legs",
  "Upper / Lower",
  "PPL + Upper/Lower",
  "Full Body",
  "Arnold split",
  "Bro split (1 grupo por dia)",
] as const;

export const GOAL_OPTIONS = [
  "hipertrofia",
  "força",
  "emagrecer",
  "condicionamento",
  "manutenção",
] as const;

export const EXPERIENCE_OPTIONS = ["iniciante", "intermediário", "avançado"] as const;

export const INTENSITY_LABEL: Record<ProgramIntensity, string> = {
  pesado: "Pesado",
  moderado: "Moderado",
  leve: "Leve",
  recovery: "Recovery",
};

export const INTENSITY_STYLE: Record<ProgramIntensity, string> = {
  pesado: "bg-primary/15 text-primary",
  moderado: "bg-elevated text-foreground",
  leve: "bg-elevated text-muted-foreground",
  recovery: "bg-elevated text-muted-foreground",
};

export function emptyProgramExercise(): ProgramExercise {
  return { name: "", emoji: "🏋️", muscle: "", sets: 3, reps: "8-12", rest: 90, purpose: "" };
}

export function dayMinutes(day: ProgramDay) {
  if (day.exercises.length === 0) return day.minutes || 0;
  const seconds = day.exercises.reduce((acc, e) => acc + e.sets * (40 + e.rest), 0);
  return Math.max(10, Math.round(seconds / 60));
}

export function programMuscleVolume(days: ProgramDay[]) {
  const map = new Map<string, number>();
  for (const d of days)
    for (const e of d.exercises) {
      const key = e.muscle || d.focus;
      map.set(key, (map.get(key) ?? 0) + e.sets);
    }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function defaultPreferences(): TrainingPreferences {
  return {
    days_per_week: 4,
    minutes_per_session: 60,
    goal: "hipertrofia",
    experience: "intermediário",
    equipment: [],
    priority_muscles: [],
    liked_exercises: [],
    disliked_exercises: [],
    split_preference: null,
    restrictions: null,
    notes: null,
  };
}

/** Sugestões rápidas mostradas no AI Coach da aba Treinos. */
export const COACH_SUGGESTIONS = [
  "Quero treinar 7 dias por semana",
  "Quero priorizar ombros",
  "Quero mais costas",
  "Mudar minha divisão para PPL + Upper/Lower",
  "Essa semana só consigo treinar 5 dias",
  "Meu treino de quinta está muito longo",
] as const;
