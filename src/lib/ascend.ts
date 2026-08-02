export type Profile = {
  id: string;
  name: string;
  goal: string;
  experience: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  days_per_week: number;
  xp: number;
  onboarded: boolean;
};

export type Workout = { id: string; date: string; title: string; duration_min: number; xp: number };
export type RecordPR = {
  id: string;
  exercise: string;
  weight_kg: number;
  reps: number;
  achieved_on: string;
};
export type WeightLog = { id: string; date: string; weight_kg: number };
export type ChatMessage = { id: string; role: string; content: string; created_at: string };

export const LEVEL_STEP = 500;

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / LEVEL_STEP) + 1;
  const into = xp % LEVEL_STEP;
  const name =
    level >= 70
      ? "LENDA"
      : level >= 50
        ? "ELITE"
        : level >= 25
          ? "ATLETA"
          : level >= 10
            ? "GUERREIRO"
            : "INICIANTE";
  return { level, name, into, need: LEVEL_STEP, pct: Math.round((into / LEVEL_STEP) * 100) };
}

/** Títulos de gamificação (ASCEND 2.0) — sempre visíveis no perfil e na home. */
export const TITLES = [
  { min: 1, name: "Gym Rookie", emoji: "🐣", color: "#a3a3a3" },
  { min: 8, name: "Iron Warrior", emoji: "⚔️", color: "#dc2626" },
  { min: 20, name: "Elite Lifter", emoji: "🔥", color: "#f59e0b" },
  { min: 40, name: "Titan", emoji: "🗿", color: "#38bdf8" },
  { min: 65, name: "Legend", emoji: "👑", color: "#e9c46a" },
] as const;

export function titleFromLevel(level: number) {
  let idx = 0;
  TITLES.forEach((t, i) => {
    if (level >= t.min) idx = i;
  });

  const current = TITLES[idx]!;
  const next = TITLES[idx + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  const pct = next ? Math.min(100, Math.round(((level - current.min) / span) * 100)) : 100;
  return { ...current, next, pct, index: idx };
}

/** IMC simples — usado nas estatísticas premium. */
export function bmi(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  const value = Math.round((weightKg / (m * m)) * 10) / 10;
  const label =
    value < 18.5 ? "Abaixo" : value < 25 ? "Saudável" : value < 30 ? "Sobrepeso" : "Obesidade";
  return { value, label };
}

/** Volume total (kg levantados) de uma lista de séries. */
export function totalVolume(sets: { reps: number; weight_kg: number; created_at?: string }[]) {
  return Math.round(sets.reduce((a, s) => a + s.reps * Number(s.weight_kg), 0));
}


export function todayISO(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function computeStreak(dates: string[]) {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  if (!set.has(todayISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(todayISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7; // segunda = 0
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: start }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(todayISO(new Date(year, month, d)));
  return cells;
}

export function nutritionTargets(p: Pick<Profile, "weight_kg" | "height_cm" | "age" | "goal">) {
  const weight = Number(p.weight_kg) || 75;
  const height = Number(p.height_cm) || 175;
  const age = Number(p.age) || 28;
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = bmr * 1.55;
  const kcal = Math.round(
    p.goal === "emagrecer" ? tdee - 400 : p.goal === "ganhar massa" ? tdee + 350 : tdee,
  );
  const protein = Math.round(weight * 2);
  const fat = Math.round(weight * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}

export const GOALS = ["hipertrofia", "emagrecer", "ganhar massa", "condicionamento"];
export const EXPERIENCES = ["iniciante", "intermediário", "avançado"];

export const WEEK_PLAN = [
  { emoji: "🏋️", name: "Peito & Tríceps", detail: "60 min · 5 exercícios" },
  { emoji: "🦵", name: "Pernas Completo", detail: "75 min · 6 exercícios" },
  { emoji: "💪", name: "Costas & Bíceps", detail: "60 min · 5 exercícios" },
  { emoji: "🏃", name: "Ombros & Core", detail: "50 min · 4 exercícios" },
  { emoji: "⚡", name: "HIIT & Cardio", detail: "35 min · full body" },
  { emoji: "🧘", name: "Mobilidade", detail: "30 min · recuperação" },
];

/* ---------------- Treinos: Push / Pull / Legs / Full Body ---------------- */

export type Exercise = {
  name: string;
  emoji: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number; // segundos
  tip: string;
};

export type Split = {
  id: "push" | "pull" | "legs" | "full";
  name: string;
  emoji: string;
  focus: string;
  minutes: number;
  exercises: Exercise[];
};

export const SPLITS: Split[] = [
  {
    id: "push",
    name: "Push",
    emoji: "🏋️",
    focus: "Peito · Ombro · Tríceps",
    minutes: 60,
    exercises: [
      { name: "Supino reto", emoji: "🏋️", muscle: "Peito", sets: 4, reps: "8-10", rest: 90, tip: "Escápulas retraídas, desça controlado até o peito." },
      { name: "Supino inclinado com halteres", emoji: "💪", muscle: "Peito superior", sets: 3, reps: "10-12", rest: 75, tip: "Banco a 30°, não trave os cotovelos no topo." },
      { name: "Desenvolvimento militar", emoji: "🤸", muscle: "Ombro", sets: 4, reps: "8-10", rest: 90, tip: "Core firme, evite arquear a lombar." },
      { name: "Elevação lateral", emoji: "🕊️", muscle: "Deltoide lateral", sets: 3, reps: "12-15", rest: 45, tip: "Suba até a linha do ombro, sem embalo." },
      { name: "Tríceps corda", emoji: "🪢", muscle: "Tríceps", sets: 3, reps: "12-15", rest: 45, tip: "Abra a corda no final do movimento." },
    ],
  },
  {
    id: "pull",
    name: "Pull",
    emoji: "🧗",
    focus: "Costas · Bíceps",
    minutes: 60,
    exercises: [
      { name: "Barra fixa / Puxada alta", emoji: "🧗", muscle: "Dorsal", sets: 4, reps: "8-10", rest: 90, tip: "Puxe com os cotovelos, peito para cima." },
      { name: "Remada curvada", emoji: "🚣", muscle: "Costas", sets: 4, reps: "8-10", rest: 90, tip: "Tronco a 45°, coluna neutra." },
      { name: "Remada unilateral", emoji: "💪", muscle: "Dorsal", sets: 3, reps: "10-12", rest: 60, tip: "Amplitude total, segure 1s na contração." },
      { name: "Face pull", emoji: "🎯", muscle: "Posterior de ombro", sets: 3, reps: "15", rest: 45, tip: "Ótimo para postura e saúde do ombro." },
      { name: "Rosca direta", emoji: "🦾", muscle: "Bíceps", sets: 3, reps: "10-12", rest: 45, tip: "Cotovelo fixo ao lado do corpo." },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    emoji: "🦵",
    focus: "Quadríceps · Posterior · Glúteo",
    minutes: 70,
    exercises: [
      { name: "Agachamento livre", emoji: "🦵", muscle: "Quadríceps", sets: 4, reps: "6-10", rest: 120, tip: "Joelho na direção do pé, desça até a paralela." },
      { name: "Leg press", emoji: "🛗", muscle: "Pernas", sets: 4, reps: "10-12", rest: 90, tip: "Não deixe a lombar sair do encosto." },
      { name: "Stiff", emoji: "🧎", muscle: "Posterior", sets: 3, reps: "10-12", rest: 75, tip: "Empurre o quadril para trás, joelho semi-flexionado." },
      { name: "Cadeira extensora", emoji: "🪑", muscle: "Quadríceps", sets: 3, reps: "12-15", rest: 45, tip: "Segure 1s no topo." },
      { name: "Panturrilha em pé", emoji: "🦶", muscle: "Panturrilha", sets: 4, reps: "15-20", rest: 40, tip: "Amplitude completa, sem quicar." },
    ],
  },
  {
    id: "full",
    name: "Full Body",
    emoji: "⚡",
    focus: "Corpo inteiro",
    minutes: 50,
    exercises: [
      { name: "Agachamento", emoji: "🦵", muscle: "Pernas", sets: 3, reps: "10", rest: 75, tip: "Base da força de todo o corpo." },
      { name: "Supino reto", emoji: "🏋️", muscle: "Peito", sets: 3, reps: "10", rest: 75, tip: "Controle a descida em 2s." },
      { name: "Remada curvada", emoji: "🚣", muscle: "Costas", sets: 3, reps: "10", rest: 75, tip: "Puxe até o umbigo." },
      { name: "Desenvolvimento", emoji: "🤸", muscle: "Ombro", sets: 3, reps: "10", rest: 60, tip: "Trajetória vertical." },
      { name: "Prancha", emoji: "🧘", muscle: "Core", sets: 3, reps: "45s", rest: 40, tip: "Glúteo contraído, quadril alinhado." },
    ],
  },
];

export function splitOfDay(d = new Date()): Split {
  const order: Split["id"][] = ["push", "pull", "legs", "full", "push", "pull", "legs"];
  const id = order[d.getDay()]!;
  return SPLITS.find((s) => s.id === id)!;
}

export function estimateCalories(minutes: number, weightKg: number | null) {
  const w = Number(weightKg) || 75;
  return Math.round((6 * 3.5 * w) / 200) * Math.max(1, Math.round(minutes));
}

/** Sugestão de progressão de carga com base no último registro do exercício. */
export function suggestLoad(lastWeight: number | null, lastReps: number | null, targetReps: number) {
  if (!lastWeight) return null;
  if ((lastReps ?? 0) >= targetReps) {
    return { weight: Math.round((lastWeight * 1.025) * 2) / 2, note: "Bateu as reps — suba a carga 2,5%." };
  }
  return { weight: lastWeight, note: "Mantenha a carga e feche todas as repetições." };
}

/* ---------------- Nutrição e água ---------------- */

export function waterTarget(weightKg: number | null) {
  return Math.round(((Number(weightKg) || 75) * 35) / 50) * 50;
}

/* ---------------- Gamificação ---------------- */

export type Achievement = { code: string; label: string; emoji: string; desc: string };

export const ACHIEVEMENTS: Achievement[] = [
  { code: "first_workout", label: "Primeiro Passo", emoji: "🥇", desc: "Concluir o primeiro treino" },
  { code: "streak_3", label: "Pegando Ritmo", emoji: "🔥", desc: "3 dias seguidos" },
  { code: "streak_7", label: "Semana Perfeita", emoji: "⚡", desc: "7 dias seguidos" },
  { code: "streak_30", label: "Inquebrável", emoji: "🛡️", desc: "30 dias seguidos" },
  { code: "workouts_10", label: "Dez de Dez", emoji: "💪", desc: "10 treinos registrados" },
  { code: "workouts_50", label: "Veterano", emoji: "🏆", desc: "50 treinos registrados" },
  { code: "workouts_100", label: "Centurião", emoji: "👑", desc: "100 treinos registrados" },
  { code: "level_10", label: "Guerreiro", emoji: "⚔️", desc: "Chegar ao nível 10" },
  { code: "level_25", label: "Atleta", emoji: "🎖️", desc: "Chegar ao nível 25" },
  { code: "first_pr", label: "Recorde Pessoal", emoji: "📈", desc: "Registrar o primeiro PR" },
  { code: "photo_1", label: "Antes & Depois", emoji: "📸", desc: "Enviar a primeira foto de evolução" },
  { code: "hydrated", label: "Hidratado", emoji: "💧", desc: "Bater a meta de água do dia" },
];

export type Mission = { id: string; label: string; xp: number; done: boolean };

export const WEEKLY_CHALLENGES = [
  { id: "w4", label: "Treinar 4 vezes na semana", target: 4, xp: 300 },
  { id: "w_water", label: "Bater a meta de água 5 dias", target: 5, xp: 200 },
  { id: "w_pr", label: "Registrar 1 novo recorde", target: 1, xp: 250 },
];

