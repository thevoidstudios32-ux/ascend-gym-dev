import { createServerFn } from "@tanstack/react-start";
import { assessmentInitial, assessmentSchema, buildAssessmentProgram } from "@/lib/training-assessment";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildProgramContext, programInsights, proposeProgram } from "@/lib/program.server";
import { defaultPreferences, buildPlanningWeeks, type PlanningWeek, type Program, type ProgramVersion, type Recommendation } from "@/lib/program";

const exerciseSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(4).default("🏋️"),
  muscle: z.string().max(40).default(""),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  rest: z.number().int().min(15).max(600),
  purpose: z.string().max(200).default(""),
});

const daySchema = z.object({
  key: z.string().min(1).max(30),
  weekday: z.string().min(2).max(4),
  title: z.string().min(1).max(60),
  focus: z.string().min(1).max(60),
  muscles: z.array(z.string().max(30)).max(8).default([]),
  intensity: z.enum(["pesado", "moderado", "leve", "recovery"]),
  minutes: z.number().int().min(10).max(180),
  exercises: z.array(exerciseSchema).max(12),
});

const programSchema = z.object({
  name: z.string().min(2).max(60),
  goal: z.string().min(2).max(40),
  split_label: z.string().min(2).max(60),
  days_per_week: z.number().int().min(1).max(7),
  priorities: z.array(z.string().max(30)).max(8).default([]),
  week_focus: z.string().max(200).nullable().default(null),
  notes: z.string().max(600).nullable().default(null),
  days: z.array(daySchema).min(1).max(7),
});

const preferencesSchema = z.object({
  days_per_week: z.number().int().min(1).max(7),
  available_weekdays: z.array(z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"])).max(7).default([]),
  minutes_per_session: z.number().int().min(15).max(180),
  default_rest_seconds: z.number().int().min(15).max(600),
  goal: z.string().min(2).max(40),
  experience: z.string().min(2).max(30),
  equipment: z.array(z.string().max(40)).max(20).default([]),
  priority_muscles: z.array(z.string().max(30)).max(5).default([]),
  liked_exercises: z.array(z.string().max(60)).max(20).default([]),
  disliked_exercises: z.array(z.string().max(60)).max(20).default([]),
  split_preference: z.string().max(60).nullable().default(null),
  restrictions: z.string().max(400).nullable().default(null),
  notes: z.string().max(400).nullable().default(null),
}).superRefine((data, ctx) => {
  if (data.available_weekdays.length && (data.available_weekdays.length !== data.days_per_week || new Set(data.available_weekdays).size !== data.days_per_week)) {
    ctx.addIssue({ code: "custom", path: ["available_weekdays"], message: "Selecione exatamente a quantidade de dias informada." });
  }
});

/** Preferências + programa ativo + versões + recomendações + insights reais. */
export const getProgram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [prefRes, programRes, recsRes] = await Promise.all([
      supabase.from("training_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("ai_programs")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_recommendations")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const program = (programRes.data ?? null) as unknown as Program | null;

    let versions: ProgramVersion[] = [];
    if (program) {
      const { data } = await supabase
        .from("ai_program_versions")
        .select("id,program_id,version,reason,created_at,snapshot")
        .eq("program_id", program.id)
        .order("version", { ascending: false })
        .limit(10);
      versions = (data ?? []) as unknown as ProgramVersion[];
    }

    const ctx = await buildProgramContext(supabase, userId);
    const prefs = prefRes.data
      ? {
          ...defaultPreferences(),
          ...(prefRes.data as Record<string, unknown>),
        }
      : null;

    return {
      preferences: prefs as ReturnType<typeof defaultPreferences> | null,
      program,
      versions,
      recommendations: (recsRes.data ?? []) as unknown as Recommendation[],
      insights: programInsights(ctx, program?.days_per_week ?? ctx.profile?.days_per_week ?? 4),
    };
  });

export const saveTrainingPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => preferencesSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("training_preferences")
      .upsert({ ...data, user_id: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera uma PROPOSTA (criar do zero ou ajustar). Nunca salva sozinho. */
export const proposeProgramChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ request: z.string().min(3).max(500) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const [prefRes, programRes, ctx] = await Promise.all([
      supabase.from("training_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("ai_programs")
        .select("name,split_label,days")
        .eq("user_id", userId)
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      buildProgramContext(supabase, userId),
    ]);

    const preferences = { ...defaultPreferences(), ...((prefRes.data ?? {}) as object) };

    const proposal = await proposeProgram({
      request: data.request,
      preferences,
      current: (programRes.data as never) ?? null,
      athlete: ctx.summary,
      userId,
    });

    return { proposal, hadProgram: !!programRes.data };
  });

/** Aplica o programa (proposta da IA ou edição manual) criando uma versão. */
export const applyProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ reason: z.string().max(200).default("Ajuste do Coach IA"), program: programSchema }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const current = await supabase.from("ai_programs").select("planning_weeks,planning_model").eq("user_id",userId).eq("active",true).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if (current.error) throw new Error(current.error.message);
    // Coach proposals and manual edits are explicitly confirmed by the user; custom names and frequency changes are allowed.
    if (new Set(data.program.days.map(d => d.weekday)).size !== data.program.days.length) throw new Error("O programa repete dias de treino.");
    const weeks = buildPlanningWeeks(data.program.days,current.data?.planning_weeks ?? 1);
    const { data: result,error } = await supabase.rpc("apply_program_revision",{ _program: { ...data.program,weeks }, _reason: data.reason });
    if (error) throw new Error(error.message);
    return result as unknown as { id: string; created: boolean };
  });

/** Aceita ou recusa uma recomendação da IA. */
export const respondRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["accepted", "dismissed"]) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("ai_recommendations")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Feedback pós-sessão — alimenta as próximas adaptações da IA. */
export const sendTrainingFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        dayKey: z.string().max(30).nullable().default(null),
        rating: z.enum(["leve", "ideal", "pesado", "dolorido"]),
        durationMin: z.number().int().min(1).max(300).nullable().default(null),
        comment: z.string().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: program } = await context.supabase
      .from("ai_programs")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();

    const { error } = await context.supabase.from("training_feedback").insert({
      user_id: context.userId,
      program_id: program?.id ?? null,
      day_key: data.dayKey,
      rating: data.rating,
      duration_min: data.durationMin,
      comment: data.comment,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Inicia um dia do programa como sessão de treino: materializa o dia em um
 * treino personalizado e devolve o id para abrir /app/treino/$split.
 */
export const startProgramDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ dayKey: z.string().min(1).max(30), week: z.number().int().min(1).max(12).default(1) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: program } = await supabase
      .from("ai_programs")
      .select("id,name,days,weeks,planning_weeks")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();
    if (!program) throw new Error("Você ainda não tem um programa ativo.");

    const week = (program.weeks as unknown as PlanningWeek[]).find(w => w.number === data.week);
    if (data.week > program.planning_weeks) throw new Error("Semana indisponível.");
    const days = (week?.days ?? program.days ?? []) as unknown as {
      key: string;
      title: string;
      focus: string;
      exercises: { name: string; emoji: string; muscle: string; sets: number; reps: string; rest: number; purpose: string }[];
    }[];
    const day = days.find((d) => d.key === data.dayKey);
    if (!day || !day.exercises.length) throw new Error("Dia do programa indisponível.");

    const label = `AI · ${day.title}`;
    const payload = {
      program_id: program.id, program_day_key: day.key,
      name: label.slice(0, 60),
      focus: day.focus.slice(0, 60),
      emoji: day.exercises[0]?.emoji || "🏋️",
      difficulty: "intermediário",
      notes: `Dia do ASCEND AI Program (${program.name}).`,
      exercises: day.exercises.map((e) => ({
        name: e.name,
        emoji: e.emoji || "🏋️",
        muscle: e.muscle,
        sets: e.sets,
        reps: e.reps,
        rest: e.rest,
        hold: null,
        tip: e.purpose || "Execute com controle total.",
      })) as never,
    };

    const { data: row, error } = await supabase.from("custom_workouts")
      .upsert({ ...payload, user_id: userId }, { onConflict: "user_id,program_id,program_day_key" })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { workoutId: row.id as string };
  });
