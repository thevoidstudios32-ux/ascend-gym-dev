import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pickSubstitution } from "@/lib/coach.server";
import { z } from "zod";

/** Favoritos + equipamentos da academia + lesões. */
export const getGymSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [favs, profile] = await Promise.all([
      supabase.from("favorite_exercises").select("exercise").eq("user_id", userId),
      supabase.from("profiles").select("equipment,injuries,goal,experience").eq("id", userId).maybeSingle(),
    ]);
    return {
      favorites: (favs.data ?? []).map((f) => f.exercise),
      equipment: profile.data?.equipment ?? [],
      injuries: profile.data?.injuries ?? null,
      goal: profile.data?.goal ?? "hipertrofia",
      experience: profile.data?.experience ?? "iniciante",
    };
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
    const [profileRes, setsRes] = await Promise.all([
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
    ]);

    const p = profileRes.data;
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
      `Histórico recente: ${history || "sem registros"}`,
    ].join("\n");

    return pickSubstitution(data.exercise, data.muscle, data.candidates, summary, {
      userId: context.userId,
      feature: "troca-exercicio",
    });
  });
