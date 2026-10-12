import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessmentSchema, buildAssessmentProgram } from "@/lib/training-assessment";
import { z } from "zod";

export const generateAssessmentProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => assessmentSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const current = await supabase.from("ai_programs").select("id,version").eq("user_id", userId).eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (current.error) throw new Error("Não foi possível carregar seu programa. Tente novamente.");
    const proposal = buildAssessmentProgram(data);
    return { proposal, hadProgram: Boolean(current.data), expectedId: current.data?.id ?? null, expectedVersion: current.data?.version ?? null };
  });

export const acceptAssessmentProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ assessment: assessmentSchema, confirmed: z.literal(true), expectedId: z.string().uuid().nullable(), expectedVersion: z.number().int().positive().nullable() }).parse(input))
  .handler(async ({ context, data }) => {
    const proposal = buildAssessmentProgram(data.assessment);
    const { error } = await context.supabase.rpc("save_unified_assessment", {
      _assessment: data.assessment, _program: proposal,
      ...(data.expectedId ? { _expected_id: data.expectedId } : {}),
      ...(data.expectedVersion ? { _expected_version: data.expectedVersion } : {}),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });