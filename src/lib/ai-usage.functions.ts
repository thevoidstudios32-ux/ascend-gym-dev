import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiUsageRow = {
  id: string;
  feature: string;
  model: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  duration_ms: number;
  ok: boolean;
  error: string | null;
  created_at: string;
};

/** Consumo de IA do próprio atleta: totais, por recurso e chamadas recentes. */
export const getAiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [logsRes, msgsRes] = await Promise.all([
      context.supabase
        .from("ai_usage_logs")
        .select("id,feature,model,total_tokens,prompt_tokens,completion_tokens,duration_ms,ok,error,created_at")
        .eq("user_id", context.userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300),
      context.supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
    ]);

    const logs = (logsRes.data ?? []) as AiUsageRow[];
    const ok = logs.filter((l) => l.ok);
    const totalTokens = logs.reduce((a, l) => a + (l.total_tokens || 0), 0);
    const avgMs = ok.length
      ? Math.round(ok.reduce((a, l) => a + (l.duration_ms || 0), 0) / ok.length)
      : 0;
    const slowest = ok.reduce((m, l) => Math.max(m, l.duration_ms || 0), 0);

    const byFeature = Object.values(
      logs.reduce<Record<string, { feature: string; calls: number; tokens: number; ms: number }>>(
        (acc, l) => {
          const cur = acc[l.feature] ?? { feature: l.feature, calls: 0, tokens: 0, ms: 0 };
          cur.calls += 1;
          cur.tokens += l.total_tokens || 0;
          cur.ms += l.duration_ms || 0;
          acc[l.feature] = cur;
          return acc;
        },
        {},
      ),
    )
      .map((f) => ({ ...f, avgMs: Math.round(f.ms / Math.max(1, f.calls)) }))
      .sort((a, b) => b.calls - a.calls);

    // Volume diário dos últimos 14 dias (chamadas + tokens).
    const days: { day: string; calls: number; tokens: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayLogs = logs.filter((l) => l.created_at.slice(0, 10) === d);
      days.push({
        day: d,
        calls: dayLogs.length,
        tokens: dayLogs.reduce((a, l) => a + (l.total_tokens || 0), 0),
      });
    }

    return {
      totals: {
        calls: logs.length,
        errors: logs.length - ok.length,
        tokens: totalTokens,
        avgMs,
        slowestMs: slowest,
        messages: msgsRes.count ?? 0,
      },
      byFeature,
      days,
      recent: logs.slice(0, 30),
    };
  });
