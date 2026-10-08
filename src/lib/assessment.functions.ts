import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessmentSchema, buildAssessmentProgram } from "@/lib/training-assessment";
import { z } from "zod";

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
    if (!current.data) {
      const { error } = await supabase.rpc("save_training_assessment", {
        _assessment: data, _program: proposal, _replace: false,
      });
      if (error) throw new Error(error.message);
    }
    return { proposal, hadProgram: Boolean(current.data) };
  });

export const acceptAssessmentProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ assessment: assessmentSchema, confirmed: z.literal(true) }).parse(input))
  .handler(async ({ context, data }) => {
    const prefs = await context.supabase.from("training_preferences").select("default_rest_seconds").eq("user_id", context.userId).maybeSingle();
    if (prefs.error) throw new Error(prefs.error.message);
    const proposal = buildAssessmentProgram(data.assessment, prefs.data?.default_rest_seconds ?? 90);
    const { error } = await context.supabase.rpc("save_training_assessment", {
      _assessment: data.assessment, _program: proposal, _replace: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });