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
