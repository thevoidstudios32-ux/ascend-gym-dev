import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessmentSchema, buildAssessmentProgram } from "@/lib/training-assessment";

export const generateAssessmentProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assessmentSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [current, prefs] = await Promise.all([
      supabase.from("ai_programs").select("id").eq("user_id", userId).eq("active", true).limit(1).maybeSingle(),
      supabase.from("training_preferences").select("default_rest_seconds").eq("user_id", userId).maybeSingle(),
    ]);
    if (current.error || prefs.error) throw new Error("Não foi possível carregar seu programa. Tente novamente.");
    const proposal = buildAssessmentProgram(data, prefs.data?.default_rest_seconds ?? 90);
    const { error: preferenceError } = await supabase.from("training_preferences").upsert({
      user_id: userId, goal: data.goal, experience: data.experience, days_per_week: data.days_per_week,
      available_weekdays: data.available_weekdays, minutes_per_session: data.minutes_per_session,
      equipment: data.equipment, priority_muscles: data.priority_muscles, split_preference: null,
    }, { onConflict: "user_id" });
    if (preferenceError) throw new Error(preferenceError.message);
    if (!current.data) {
      const { summary: _summary, changes: _changes, ...program } = proposal;
      const { error } = await supabase.from("ai_programs").insert({ ...program, days: program.days as never, user_id: userId, active: true });
      if (error) throw new Error(error.message);
    }
    const { error } = await supabase.from("profiles").update({
      gender: data.gender === "nao_informado" ? null : data.gender,
      height_cm: data.height_cm, weight_kg: data.weight_kg, goal: data.goal,
      experience: data.experience, days_per_week: data.days_per_week, equipment: data.equipment,
      training_assessment: data as never, onboarded: true, updated_at: new Date().toISOString(),
    }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { proposal, hadProgram: Boolean(current.data) };
  });