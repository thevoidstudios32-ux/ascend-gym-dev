import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useDashboard, useRefreshDashboard } from "@/hooks/use-dashboard";
import { toggleWorkout } from "@/lib/ascend.functions";
import { todayISO, WEEK_PLAN } from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos da semana · ASCEND" },
      { name: "description", content: "Seu plano semanal de treinos e histórico de sessões." },
      { property: "og:title", content: "Treinos da semana · ASCEND" },
      { property: "og:description", content: "Plano semanal e histórico de treinos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const { data, isLoading } = useDashboard();
  const refresh = useRefreshDashboard();
  const toggle = useServerFn(toggleWorkout);
  const today = todayISO();

  const mutation = useMutation({
    mutationFn: (title: string) => toggle({ data: { date: today, title } }),
    onSuccess: (res) => {
      toast.success(res.added ? "Treino de hoje registrado! +120 XP" : "Treino de hoje removido.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doneToday = data?.workouts.some((w) => w.date === today) ?? false;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-display text-4xl">TREINOS</h1>
        <p className="text-sm text-muted-foreground">Seu plano semanal e o histórico de sessões.</p>
      </header>

      <section className="space-y-3">
        {WEEK_PLAN.map((p, i) => (
          <div key={p.name} className="panel flex items-center gap-4 p-4">
            <span className="text-2xl">{p.emoji}</span>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Dia {i + 1}
              </p>
              <p className="font-bold">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.detail}</p>
            </div>
            <button
              onClick={() => mutation.mutate(p.name)}
              disabled={mutation.isPending || doneToday}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:bg-elevated disabled:text-muted-foreground"
            >
              {doneToday ? "Hoje ✓" : "Fazer hoje"}
            </button>
          </div>
        ))}
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Histórico</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>}
        <div className="mt-3 space-y-2">
          {(data?.workouts ?? []).slice(0, 20).map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl bg-elevated p-3">
              <div>
                <p className="text-sm font-bold">{w.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {w.date.split("-").reverse().join("/")} · {w.duration_min} min
                </p>
              </div>
              <span className="text-xs font-extrabold text-primary">+{w.xp} XP</span>
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
