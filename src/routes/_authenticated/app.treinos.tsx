import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCustomWorkouts } from "@/hooks/use-custom";
import { estimateMinutes } from "@/lib/custom";
import { SPLITS, splitOfDay } from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos · ASCEND" },
      { name: "description", content: "Push, Pull, Legs e Full Body com séries, cargas e descanso." },
      { property: "og:title", content: "Treinos · ASCEND" },
      { property: "og:description", content: "Divisões Push/Pull/Legs e Full Body." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const { data, isLoading } = useDashboard();
  const today = splitOfDay();

  return (
    <div className="animate-rise space-y-5">
      <header>
        <h1 className="text-display text-4xl">TREINOS</h1>
        <p className="text-sm text-muted-foreground">
          Escolha a divisão. Séries, descanso e cargas são registrados automaticamente.
        </p>
      </header>

      <section className="space-y-3">
        {SPLITS.map((s) => (
          <Link
            key={s.id}
            to="/app/treino/$split"
            params={{ split: s.id }}
            className="press panel flex items-center gap-4 p-4"
          >
            <span className="text-3xl">{s.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold">
                {s.name}
                {s.id === today.id && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                    hoje
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{s.focus}</p>
              <p className="text-xs text-muted-foreground">
                {s.minutes} min · {s.exercises.length} exercícios
              </p>
            </div>
            <span className="rounded-full bg-elevated px-4 py-2 text-xs font-bold">Iniciar</span>
          </Link>
        ))}
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Histórico</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
        <div className="mt-3 space-y-2">
          {(data?.workouts ?? []).slice(0, 20).map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl bg-elevated p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{w.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {w.date.split("-").reverse().join("/")} · {w.duration_min} min ·{" "}
                  {w.calories ?? 0} kcal
                </p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-primary">+{w.xp} XP</span>
            </div>
          ))}
          {!isLoading && (data?.workouts.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
