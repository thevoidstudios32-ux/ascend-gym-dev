import { AscendIcon, type AscendIconName } from "@/components/ascend-icon";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCoachInsights } from "@/lib/coach.functions";

export type AnalysisMode = "progress" | "improve" | "weekly" | "prs";

const ACTIONS: { mode: AnalysisMode; label: string }[] = [
  { mode: "progress", label: "Analisar meu progresso" },
  { mode: "improve", label: "O que devo melhorar?" },
  { mode: "weekly", label: "Relatório da semana" },
  { mode: "prs", label: "Analisar meus PRs" },
];

export function CoachInsights({
  onAnalyze,
  pendingMode,
  disabled,
}: {
  onAnalyze: (mode: AnalysisMode) => void;
  pendingMode: AnalysisMode | null;
  disabled?: boolean;
}) {
  const fetcher = useServerFn(getCoachInsights);
  const { data, isLoading } = useQuery({
    queryKey: ["coach-insights"],
    queryFn: () => fetcher(),
  });

  const metrics: { icon: AscendIconName; text: string }[] = [];
  if (data) {
    if (data.streak !== null && data.streak > 0) metrics.push({ icon: "streak", text: `${data.streak} DIAS DE SEQUÊNCIA` });
    if (data.workoutsThisWeek !== null)
      metrics.push({
        icon: "workout",
        text: `${data.workoutsThisWeek}${data.workoutsGoal ? ` / ${data.workoutsGoal}` : ""} TREINOS NA SEMANA`,
      });
    if (data.newPrs !== null && data.newPrs > 0) metrics.push({ icon: "trophy", text: `${data.newPrs} NOVOS PRs` });
    if (data.xpRecent !== null && data.xpRecent > 0) metrics.push({ icon: "xp", text: `+${data.xpRecent} XP` });
    if (data.consistency !== null) metrics.push({ icon: "chart", text: `${data.consistency}% CONSISTÊNCIA` });
  }

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="text-xs font-black tracking-[0.18em] text-muted-foreground">INSIGHTS DO SEU COACH</h2>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-2/3 animate-pulse rounded bg-elevated" />
          ))}
        </div>
      ) : metrics.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {metrics.map((m) => (
            <li key={m.text} className="flex items-center gap-2 text-sm font-bold">
              <AscendIcon name={m.icon} size={16} />
              <span className="truncate">{m.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Ainda não há dados suficientes. Registre treinos para liberar suas métricas.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {ACTIONS.map((a, i) => (
          <button
            key={a.mode}
            onClick={() => onAnalyze(a.mode)}
            disabled={disabled}
            className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wide transition-transform active:scale-[0.98] disabled:opacity-50 ${
              i === 0
                ? "bg-primary text-primary-foreground"
                : "ember-border bg-elevated text-foreground"
            }`}
          >
            {pendingMode === a.mode ? "Analisando…" : a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
