import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeShape } from "@/lib/coach.server";
import { ACHIEVEMENTS, waterTarget } from "@/lib/ascend";
import { syncAchievements, type AchievementRow } from "@/lib/achievements.server";
import { z } from "zod";

const setSchema = z.object({
  exercise: z.string().min(1).max(80),
  set_index: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  weight_kg: z.number().min(0).max(600),
  rir: z.number().int().min(0).max(10).nullable().default(null),
});

/* ------------------------- leitura geral dos extras ------------------------- */

export const getExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    // Recalcula/persiste os selos antes de ler (idempotente).
    const badges = await syncAchievements(supabase as never, userId);

    const [water, meals, measurements, photos, sets] = await Promise.all([
      supabase.from("water_logs").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
      supabase.from("meal_logs").select("*").eq("user_id", userId).eq("date", today).order("created_at"),
      supabase.from("body_measurements").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
      supabase.from("progress_photos").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(20),
      supabase.from("exercise_sets").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    ]);

    const signed: Record<string, string> = {};
    for (const p of photos.data ?? []) {
      const { data } = await supabase.storage.from("progress-photos").createSignedUrl(p.path, 3600);
      if (data?.signedUrl) signed[p.id] = data.signedUrl;
    }

    return {
      today,
      water: water.data ?? [],
      meals: meals.data ?? [],
      measurements: measurements.data ?? [],
      photos: photos.data ?? [],
      photoUrls: signed,
      achievements: badges.rows.map((a: AchievementRow) => a.code),
      achievementRows: badges.rows,
      achievementContext: badges.context,
      sets: sets.data ?? [],
    };
  });

/* ------------------------------ sessão de treino ---------------------------- */

export const finishWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        title: z.string().min(1).max(60),
        kind: z.string().min(1).max(60),
        duration_min: z.number().int().min(1).max(400),
        calories: z.number().int().min(0).max(5000),
        sets: z.array(setSchema).max(80),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    // Toda a conclusão do treino (XP, séries, PRs, selos e post) acontece em
    // uma única transação no banco: atômica, idempotente e imune ao frontend.
    const { data: result, error } = await supabase.rpc("complete_workout_with_rir", {
      _payload: {
        date: data.date,
        title: data.title,
        kind: data.kind,
        duration_min: data.duration_min,
        calories: data.calories,
        sets: data.sets,
      } as never,
    });
    if (error) throw new Error(error.message);

    const r = (result ?? {}) as {
      xp?: number;
      duplicate?: boolean;
      newPrs?: string[];
      unlocked?: string[];
      totalXp?: number;
    };

    return {
      xp: r.xp ?? 0,
      duplicate: r.duplicate ?? false,
      newPrs: r.newPrs ?? [],
      unlocked: (r.unlocked ?? [])
        .map((code) => ACHIEVEMENTS.find((a) => a.code === code))
        .filter(Boolean) as { code: string; label: string; emoji: string; desc: string }[],
      totalXp: r.totalXp ?? 0,
    };
  });

/* ---------------------------------- água ---------------------------------- */

export const setWater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ml: z.number().int().min(0).max(10000) }).parse(data))
  .handler(async ({ context, data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("water_logs")
      .upsert(
        { user_id: context.userId, date: today, ml: data.ml, updated_at: new Date().toISOString() },
        { onConflict: "user_id,date" },
      );
    if (error) throw new Error(error.message);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("weight_kg")
      .eq("id", context.userId)
      .maybeSingle();
    if (data.ml >= waterTarget(profile?.weight_kg ? Number(profile.weight_kg) : null)) {
      await context.supabase
        .from("achievements")
        .upsert({ user_id: context.userId, code: "hydrated" }, { onConflict: "user_id,code" });
    }
    return { ok: true };
  });

/* -------------------------------- refeições -------------------------------- */

export const addMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().min(1).max(60),
        kcal: z.number().int().min(0).max(5000),
        protein: z.number().int().min(0).max(500),
        carbs: z.number().int().min(0).max(1000),
        fat: z.number().int().min(0).max(500),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("meal_logs")
      .insert({ ...data, user_id: context.userId, date: new Date().toISOString().slice(0, 10) });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase.from("meal_logs").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

/* ------------------------------- medidas ---------------------------------- */

export const saveMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        chest_cm: z.number().min(0).max(250).nullable(),
        waist_cm: z.number().min(0).max(250).nullable(),
        arm_cm: z.number().min(0).max(120).nullable(),
        thigh_cm: z.number().min(0).max(150).nullable(),
        hip_cm: z.number().min(0).max(250).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("body_measurements").upsert(
      { ...data, user_id: context.userId, date: new Date().toISOString().slice(0, 10) },
      { onConflict: "user_id,date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- fotos de evolução ----------------------------- */

export const registerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ path: z.string().min(3).max(300), pose: z.string().min(1).max(20) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Caminho inválido.");
    const { error } = await context.supabase.from("progress_photos").insert({
      user_id: context.userId,
      path: data.path,
      pose: data.pose,
      date: new Date().toISOString().slice(0, 10),
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("achievements")
      .upsert({ user_id: context.userId, code: "photo_1" }, { onConflict: "user_id,code" });
    return { ok: true };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: photo } = await context.supabase
      .from("progress_photos")
      .select("path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (photo?.path) await context.supabase.storage.from("progress-photos").remove([photo.path]);
    await context.supabase.from("progress_photos").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const analyzeProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: photos } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (!photos || photos.length < 2) throw new Error("Envie ao menos 2 fotos para comparar.");
    const first = photos[0]!;
    const last = photos[photos.length - 1]!;

    const [a, b] = await Promise.all([
      supabase.storage.from("progress-photos").createSignedUrl(first.path, 600),
      supabase.storage.from("progress-photos").createSignedUrl(last.path, 600),
    ]);
    if (!a.data?.signedUrl || !b.data?.signedUrl) throw new Error("Não consegui abrir as fotos.");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    const weeks = Math.max(
      1,
      Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / 604800000),
    );
    const summary = `Objetivo: ${profile?.goal ?? "-"} | Experiência: ${profile?.experience ?? "-"} | Peso atual: ${profile?.weight_kg ?? "-"} kg`;

    const analysis = await analyzeShape(a.data.signedUrl, b.data.signedUrl, summary, weeks, {
      userId: context.userId,
      feature: "shape-tracker",
    });
    await supabase.from("progress_photos").update({ analysis }).eq("id", last.id).eq("user_id", userId);
    return { analysis };
  });
