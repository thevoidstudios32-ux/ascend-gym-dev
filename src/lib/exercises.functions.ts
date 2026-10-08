import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pickSubstitution } from "@/lib/coach.server";
import { z } from "zod";
import { substitutesFor } from "@/lib/exercises";

/** Favoritos + equipamentos da academia + lesões. */
export const getGymSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [favs, profile, preferences] = await Promise.all([
      supabase.from("favorite_exercises").select("exercise").eq("user_id", userId),
      supabase.from("profiles").select("equipment,injuries,goal,experience").eq("id", userId).maybeSingle(),
      supabase.from("training_preferences").select("equipment,disliked_exercises,exercise_memory,restrictions").eq("user_id", userId).maybeSingle(),
    ]);
    return {
      favorites: (favs.data ?? []).map((f) => f.exercise),
      equipment: preferences.data?.equipment?.length ? preferences.data.equipment : profile.data?.equipment ?? [],
      disliked: preferences.data?.disliked_exercises ?? [],
      memory: preferences.data?.exercise_memory ?? {},
      restrictions: preferences.data?.restrictions ?? null,
      injuries: profile.data?.injuries ?? null,
      goal: profile.data?.goal ?? "hipertrofia",
      experience: profile.data?.experience ?? "iniciante",
    };
  });

export const saveExerciseMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ exercise: z.string().trim().min(1).max(80), kind: z.enum(["dislike", "machines", "balance", "discomfort"]), note: z.string().trim().max(300) }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: prefs, error: readError } = await context.supabase.from("training_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    if (readError) throw new Error(readError.message);
    const existing = prefs?.exercise_memory;
    const memory = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    const excluded = new Set(prefs?.disliked_exercises ?? []);
    if (data.kind === "dislike" || data.kind === "discomfort") excluded.add(data.exercise);
    const { error } = await context.supabase.from("training_preferences").upsert({ user_id: context.userId, exercise_memory: { ...memory, [data.exercise]: { kind: data.kind, note: data.note, updated_at: new Date().toISOString() } }, disliked_exercises: [...excluded] }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getExerciseHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ exercise: z.string().min(1).max(80) }).parse(input))
  .handler(async ({context,data}) => {
    const { data: rows, error } = await context.supabase.from("exercise_sets").select("weight_kg,reps,rir,date,workout_id,set_index").eq("user_id",context.userId).eq("exercise",data.exercise).order("date",{ascending:false}).order("set_index").limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const toggleFavoriteExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ exercise: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorite_exercises")
      .select("id")
      .eq("user_id", userId)
      .eq("exercise", data.exercise)
      .maybeSingle();
    if (existing) {
      await supabase.from("favorite_exercises").delete().eq("id", existing.id);
      return { favorite: false };
    }
    const { error } = await supabase
      .from("favorite_exercises")
      .insert({ user_id: userId, exercise: data.exercise });
    if (error) throw new Error(error.message);
    return { favorite: true };
  });

export const saveGymSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        equipment: z.array(z.string().max(30)).max(20),
        injuries: z.string().max(300).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ equipment: data.equipment, injuries: data.injuries, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** IA escolhe a melhor substituição considerando objetivo, equipamentos, histórico e lesões. */
export const suggestSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        exercise: z.string().min(1).max(80),
        muscle: z.string().max(60),
        candidates: z.array(z.string().max(80)).min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [profileRes, setsRes, preferenceRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("gender,goal,experience,equipment,injuries,weight_kg")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("exercise_sets")
        .select("exercise,reps,weight_kg,date")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase.from("training_preferences").select("equipment,disliked_exercises,restrictions,exercise_memory").eq("user_id",userId).maybeSingle(),
    ]);

    const p = profileRes.data;
    const prefs = preferenceRes.data;
    const allowed = substitutesFor(data.exercise, { muscle: data.muscle, equipment: prefs?.equipment?.length ? prefs.equipment : p?.equipment ?? [], disliked: prefs?.disliked_exercises ?? [] }).filter(r=>r.available).map(r=>r.exercise.name);
    const candidates = data.candidates.filter(name=>allowed.includes(name));
    if (!candidates.length) throw new Error("Nenhuma alternativa compatível disponível.");
    const history = (setsRes.data ?? [])
      .slice(0, 15)
      .map((s) => `${s.exercise}: ${s.reps}x${s.weight_kg}kg (${s.date})`)
      .join("; ");

    const summary = [
      `Sexo: ${p?.gender ?? "não informado"}`,
      `Objetivo: ${p?.goal ?? "hipertrofia"}`,
      `Experiência: ${p?.experience ?? "iniciante"}`,
      `Peso: ${p?.weight_kg ?? "-"} kg`,
      `Equipamentos disponíveis: ${(p?.equipment ?? []).join(", ") || "não informado (assuma academia completa)"}`,
      `Lesões: ${p?.injuries || "nenhuma registrada"}`,
      `Restrições: ${prefs?.restrictions || "nenhuma registrada"}. Memória do atleta: ${JSON.stringify(prefs?.exercise_memory ?? {})}. Nunca diagnostique dor; se não puder sugerir com segurança, recomende avaliação profissional.`,
      `Histórico recente: ${history || "sem registros"}`,
    ].join("\n");

    const result = await pickSubstitution(data.exercise, data.muscle, candidates, summary, {
      userId: context.userId,
      feature: "troca-exercicio",
    });
    if (!candidates.includes(result.choice)) throw new Error("O Coach não encontrou uma alternativa segura nesta seleção.");
    return result;
  });
