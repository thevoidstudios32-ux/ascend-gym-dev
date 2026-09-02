import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { proposeWorkout, snapshotWorkout as snapshot } from "@/lib/custom.server";
import { SPLITS } from "@/lib/ascend";
import { z } from "zod";
import type { CustomExercise, CustomWorkout, WorkoutVersion } from "@/lib/custom";

const exerciseSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(4).default("🤸"),
  muscle: z.string().max(40).default(""),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  rest: z.number().int().min(10).max(600),
  hold: z.number().int().min(1).max(600).nullable().default(null),
  tip: z.string().max(200).default(""),
});

const workoutSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(60),
  focus: z.string().min(1).max(60),
  emoji: z.string().max(4).default("🤸"),
  difficulty: z.string().max(20).default("intermediário"),
  notes: z.string().max(500).nullable().default(null),
  exercises: z.array(exerciseSchema).min(1).max(20),
});

export const listCustomWorkouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [workouts, versions] = await Promise.all([
      supabase
        .from("custom_workouts")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("custom_workout_versions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);
    return {
      workouts: (workouts.data ?? []) as unknown as CustomWorkout[],
      versions: (versions.data ?? []) as unknown as WorkoutVersion[],
    };
  });

export const saveCustomWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => workoutSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = {
      name: data.name,
      focus: data.focus,
      emoji: data.emoji || "🤸",
      difficulty: data.difficulty,
      notes: data.notes,
      exercises: data.exercises as never,
    };

    if (data.id) {
      await snapshot(supabase, userId, data.id, "Edição manual");
      const { error } = await supabase
        .from("custom_workouts")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await supabase
      .from("custom_workouts")
      .insert({ ...payload, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCustomWorkout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("custom_workouts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera uma PROPOSTA de alteração. Nunca altera o treino salvo. */
export const proposeWorkoutChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        request: z.string().min(3).max(400),
        workoutId: z.string().uuid().nullable().optional(),
        splitId: z.string().max(20).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    let base: {
      name: string;
      focus: string;
      emoji: string;
      difficulty: string;
      notes: string | null;
      exercises: CustomExercise[];
    } | null = null;

    if (data.workoutId) {
      const { data: row } = await supabase
        .from("custom_workouts")
        .select("*")
        .eq("id", data.workoutId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!row) throw new Error("Treino não encontrado.");
      base = {
        name: row.name,
        focus: row.focus,
        emoji: row.emoji,
        difficulty: row.difficulty,
        notes: row.notes,
        exercises: (row.exercises ?? []) as unknown as CustomExercise[],
      };
    } else {
      const split = SPLITS.find((s) => s.id === data.splitId) ?? SPLITS[0]!;
      base = {
        name: split.name,
        focus: split.focus,
        emoji: split.emoji,
        difficulty: "intermediário",
        notes: null,
        exercises: split.exercises.map((e) => ({ ...e, hold: null })),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name,goal,experience,equipment,injuries,days_per_week,xp")
      .eq("id", userId)
      .maybeSingle();

    const athlete = [
      `Nome: ${profile?.name ?? "Atleta"}`,
      `Objetivo: ${profile?.goal ?? "-"} | Experiência: ${profile?.experience ?? "-"}`,
      `Equipamentos: ${(profile?.equipment ?? []).join(", ") || "não informado"}`,
      `Lesões/limitações: ${profile?.injuries || "nenhuma"}`,
      `Dias por semana: ${profile?.days_per_week ?? "?"}`,
    ].join("\n");

    const proposal = await proposeWorkout({ request: data.request, workout: base, athlete, userId });
    return { proposal, base, fromSplit: !data.workoutId };
  });

/** Aplica a proposta APÓS confirmação do usuário, salvando a versão anterior. */
export const applyWorkoutChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        workoutId: z.string().uuid().nullable().optional(),
        reason: z.string().max(200).default("Ajuste do Coach IA"),
        proposal: workoutSchema.omit({ id: true }),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const payload = {
      name: data.proposal.name,
      focus: data.proposal.focus,
      emoji: data.proposal.emoji || "🤸",
      difficulty: data.proposal.difficulty,
      notes: data.proposal.notes,
      exercises: data.proposal.exercises as never,
    };

    if (data.workoutId) {
      await snapshot(supabase, userId, data.workoutId, data.reason);
      const { error } = await supabase
        .from("custom_workouts")
        .update(payload)
        .eq("id", data.workoutId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.workoutId, created: false };
    }

    const { data: row, error } = await supabase
      .from("custom_workouts")
      .insert({ ...payload, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, created: true };
  });

/** Restaura a versão anterior de um treino personalizado. */
export const restoreWorkoutVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ versionId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: version } = await supabase
      .from("custom_workout_versions")
      .select("*")
      .eq("id", data.versionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!version) throw new Error("Versão não encontrada.");

    await snapshot(supabase, userId, version.workout_id, "Antes de restaurar");
    const { error } = await supabase
      .from("custom_workouts")
      .update({
        name: version.name,
        focus: version.focus,
        notes: version.notes,
        exercises: version.exercises,
      })
      .eq("id", version.workout_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { id: version.workout_id };
  });
