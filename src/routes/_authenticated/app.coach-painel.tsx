import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAiUsage } from "@/lib/ai-usage.functions";
import { getMessages } from "@/lib/ascend.functions";

export const Route = createFileRoute("/_authenticated/app/coach-painel")({
  head: () => ({
    meta: [
      { title: "Painel do Coach IA · ASCEND" },
      { name: "description", content: "Histórico de conversas, consumo e tempo de resposta do Coach IA." },
      { property: "og:title", content: "Painel do Coach IA · ASCEND" },
      { property: "og:description", content: "Acompanhe consumo e desempenho do seu Coach IA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachPanel,
});

const FEATURE_LABELS: Record<string, string> = {
  "coach-chat": "Chat do Coach",
  "coach-progress": "Análise: progresso",
  "coach-improve": "Análise: melhorias",
  "coach-weekly": "Análise: semana",
  "coach-prs": "Análise: PRs",
  "coach-analise": "Análises",
  "troca-exercicio": "Troca de exercício",
  "shape-tracker": "Shape Tracker",
  outros: "Outros",
};
const label = (f: string) => FEATURE_LABELS[f] ?? f;

function ms(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;
}
function when(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Stat({ label: l, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{l}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CoachPanel() {
  const fetchUsage = useServerFn(getAiUsage);
  const fetchMessages = useServerFn(getMessages);

  const { data, isLoading } = useQuery({ queryKey: ["ai-usage"], queryFn: () => fetchUsage() });
  const { data: messages = [] } = useQuery({ queryKey: ["coach-messages"], queryFn: () => fetchMessages() });

  const maxTokens = Math.max(1, ...(data?.days ?? []).map((d) => d.tokens));
  const history = [...messages].reverse().slice(0, 30);

  return (
    <div className="pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-4xl">PAINEL DO COACH</h1>
          <p className="text-sm text-muted-foreground">
            Conversas, consumo de IA e tempo de resposta dos últimos 30 dias.
          </p>
        </div>
        <Link
          to="/app/coach"
          className="rounded-full ember-border bg-elevated px-4 py-2 text-xs font-bold"
        >
          Voltar ao chat
        </Link>
      </header>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando métricas…</p>}

      {data && (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Chamadas de IA" value={String(data.totals.calls)} hint={`${data.totals.errors} com erro`} />
            <Stat label="Tokens consumidos" value={data.totals.tokens.toLocaleString("pt-BR")} hint="entrada + saída" />
            <Stat label="Tempo médio" value={ms(data.totals.avgMs)} hint={`pior: ${ms(data.totals.slowestMs)}`} />
            <Stat label="Mensagens no histórico" value={String(data.totals.messages)} hint="chat do Coach" />
          </section>

          <section className="panel mt-5 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide">Consumo por dia (14 dias)</h2>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {data.days.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">
                    {d.tokens}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
                    style={{ height: `${Math.max(3, (d.tokens / maxTokens) * 100)}%` }}
                    title={`${d.day}: ${d.calls} chamadas · ${d.tokens} tokens`}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel mt-5 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide">Por recurso</h2>
            {data.byFeature.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {data.byFeature.map((f) => (
                  <div key={f.feature} className="flex items-center justify-between rounded-xl bg-elevated px-4 py-2.5 text-sm">
                    <span className="font-semibold">{label(f.feature)}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.calls} chamadas · {f.tokens.toLocaleString("pt-BR")} tokens · {ms(f.avgMs)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel mt-5 p-5">
            <h2 className="text-sm font-black uppercase tracking-wide">Chamadas recentes</h2>
            <div className="mt-3 space-y-2">
              {data.recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-elevated px-4 py-2.5 text-xs">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={`size-2 rounded-full ${r.ok ? "bg-emerald-500" : "bg-destructive"}`} />
                    {label(r.feature)}
                  </span>
                  <span className="text-muted-foreground">
                    {r.total_tokens} tk · {ms(r.duration_ms)} · {when(r.created_at)}
                  </span>
                </div>
              ))}
              {data.recent.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem chamadas nos últimos 30 dias.</p>
              )}
            </div>
          </section>
        </>
      )}

      <section className="panel mt-5 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide">Histórico de conversas</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Você ainda não conversou com o Coach.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {history.map((m) => (
              <div key={m.id} className="rounded-xl bg-elevated px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {m.role === "user" ? "Você" : "Coach IA"} · {when(m.created_at)}
                </p>
                <p className="mt-1 line-clamp-3 text-sm">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
