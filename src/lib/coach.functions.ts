import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { askCoachAnalysis } from "@/lib/coach.server";
import { buildContextSummary, collectCoachData, MODE_PROMPTS } from "@/lib/coach-analysis.server";

/** Métricas reais do atleta para o card "Your Coach Insights" (sem IA). */
export const getCoachInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const data = await collectCoachData(context.supabase as never, context.userId);
    return data.insights;
  });

/** Análises sob demanda do Coach IA (progresso, melhorias, semana, PRs). */
export const runCoachAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ mode: z.enum(["progress", "improve", "weekly", "prs"]) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const collected = await collectCoachData(supabase as never, userId);
    const summary = buildContextSummary(collected);
    const prompt = MODE_PROMPTS[data.mode];

    const reply = await askCoachAnalysis(
      `${prompt.system}\n\nDADOS REAIS DO ATLETA:\n${summary}`,
      prompt.user,
      { userId, feature: `coach-${data.mode}` },
    );

    await supabase.from("chat_messages").insert([
      { user_id: userId, role: "user", content: prompt.user },
      { user_id: userId, role: "assistant", content: reply },
    ]);

    return { reply };
  });
