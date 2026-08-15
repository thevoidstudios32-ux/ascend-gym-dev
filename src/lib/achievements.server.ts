/**
 * Avaliação e persistência dos SELOS (achievements) do usuário.
 * Server-only: recebe um client Supabase já autenticado como o próprio usuário.
 */
import { ACHIEVEMENTS, computeStreak, levelFromXp, waterTarget } from "@/lib/ascend";

type AnyClient = { from: (t: string) => any };

export type AchievementRow = { code: string; unlocked_at: string };

/** Condições atuais do usuário usadas para desbloquear cada selo. */
export type AchievementContext = {
  workouts: number;
  streak: number;
  level: number;
  records: number;
  photos: number;
  hydratedDays: number;
};

/** Progresso legível de cada selo (usado no perfil e na aba de conquistas). */
export function achievementProgress(code: string, c: AchievementContext): { current: number; target: number } {
  switch (code) {
    case "first_workout":
      return { current: c.workouts, target: 1 };
    case "workouts_10":
      return { current: c.workouts, target: 10 };
    case "workouts_50":
      return { current: c.workouts, target: 50 };
    case "workouts_100":
      return { current: c.workouts, target: 100 };
    case "streak_3":
      return { current: c.streak, target: 3 };
    case "streak_7":
      return { current: c.streak, target: 7 };
    case "streak_30":
      return { current: c.streak, target: 30 };
    case "level_10":
      return { current: c.level, target: 10 };
    case "level_25":
      return { current: c.level, target: 25 };
    case "first_pr":
      return { current: c.records, target: 1 };
    case "photo_1":
      return { current: c.photos, target: 1 };
    case "hydrated":
      return { current: c.hydratedDays, target: 1 };
    default:
      return { current: 0, target: 1 };
  }
}

export function earnedCodes(c: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => {
    const p = achievementProgress(a.code, c);
    return p.current >= p.target;
  }).map((a) => a.code);
}

/**
 * Recalcula todos os selos do usuário e grava no banco os que ainda não existem.
 * Idempotente — pode ser chamado a cada carregamento.
 */
export async function syncAchievements(
  supabase: AnyClient,
  userId: string,
): Promise<{ rows: AchievementRow[]; context: AchievementContext; unlocked: string[] }> {
  const [profileRes, workoutsRes, recordsRes, photosRes, waterRes, ownedRes] = await Promise.all([
    supabase.from("profiles").select("xp,weight_kg").eq("id", userId).maybeSingle(),
    supabase.from("workouts").select("date").eq("user_id", userId),
    supabase.from("records").select("id").eq("user_id", userId),
    supabase.from("progress_photos").select("id").eq("user_id", userId),
    supabase.from("water_logs").select("ml,date").eq("user_id", userId),
    supabase.from("achievements").select("code,unlocked_at").eq("user_id", userId),
  ]);

  const xp = profileRes.data?.xp ?? 0;
  const dates = (workoutsRes.data ?? []).map((w: { date: string }) => w.date);
  const target = waterTarget(profileRes.data?.weight_kg ? Number(profileRes.data.weight_kg) : null);

  const context: AchievementContext = {
    workouts: dates.length,
    streak: computeStreak(dates),
    level: levelFromXp(xp).level,
    records: (recordsRes.data ?? []).length,
    photos: (photosRes.data ?? []).length,
    hydratedDays: (waterRes.data ?? []).filter((w: { ml: number }) => (w.ml ?? 0) >= target).length,
  };

  const owned: AchievementRow[] = (ownedRes.data ?? []) as AchievementRow[];
  const ownedSet = new Set(owned.map((o) => o.code));
  const fresh = earnedCodes(context).filter((c) => !ownedSet.has(c));

  if (fresh.length) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("achievements")
      .insert(fresh.map((code) => ({ user_id: userId, code, unlocked_at: now })));
    if (!error) for (const code of fresh) owned.push({ code, unlocked_at: now });
  }

  return { rows: owned, context, unlocked: fresh };
}
