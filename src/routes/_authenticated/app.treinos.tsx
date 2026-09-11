import { AscendIcon, Glyph, type AscendIconName } from "@/components/ascend-icon";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useCustomWorkouts } from "@/hooks/use-custom";
import { estimateMinutes } from "@/lib/custom";
import { SPLITS, splitOfDay } from "@/lib/ascend";
import { AiProgramSection } from "@/components/program-ai";
import { WorkoutSheetButton } from "@/components/workout-sheet";
import { useT } from "@/lib/i18n";

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
  const custom = useCustomWorkouts();
  const mine = custom.data?.workouts ?? [];
  const today = splitOfDay();
  const t = useT();


  return (
    <div className="animate-rise space-y-5">
      <header>
        <h1 className="text-display text-4xl">{t("TREINOS")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Escolha a divisão. Séries, descanso e cargas são registrados automaticamente.")}
        </p>
      </header>

      <AiProgramSection />

      <WorkoutSheetButton />

      <section className="space-y-3">
        {SPLITS.map((s) => (
          <Link
            key={s.id}
            to="/app/treino/$split"
            params={{ split: s.id }}
            className="press panel flex items-center gap-4 p-4"
          >
            <AscendIcon
              name={({ push: "push", pull: "pull", legs: "legs", full: "fullbody" } as Record<string, AscendIconName>)[s.id] ?? "workout"}
              size={30}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold">
                {s.name}
                {s.id === today.id && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                    {t("hoje")}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{s.focus}</p>
              <p className="text-xs text-muted-foreground">
                {s.minutes} {t("min")} · {s.exercises.length} {t("exercícios")}
              </p>
            </div>
            <span className="rounded-full bg-elevated px-4 py-2 text-xs font-bold">{t("Iniciar")}</span>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("Meus treinos")}</h2>
          <Link
            to="/app/personalizado/$id"
            params={{ id: "novo" }}
            className="press flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-extrabold text-primary-foreground shadow-glow"
          >
            <Plus className="size-3.5" /> {t("Criar")}
          </Link>
        </div>

        {mine.length === 0 ? (
          <p className="panel p-5 text-sm text-muted-foreground">
            {t("Monte treinos de calistenia do seu jeito — ou peça ao Coach IA para criar e ajustar por você.")}
          </p>
        ) : (
          mine.map((w) => (
            <div key={w.id} className="panel flex items-center gap-4 p-4">
              <Glyph value={w.emoji} size={30} fallback="calisthenics" />
              <Link
                to="/app/treino/$split"
                params={{ split: w.id }}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-bold">{w.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {w.focus} · {w.difficulty}
                </p>
                <p className="text-xs text-muted-foreground">
                  ~{estimateMinutes(w.exercises)} {t("min")} · {w.exercises.length} {t("exercícios")}
                </p>
              </Link>
              <Link
                to="/app/personalizado/$id"
                params={{ id: w.id }}
                className="press shrink-0 rounded-full bg-elevated px-3.5 py-2 text-xs font-bold"
              >
                {t("Editar")}
              </Link>
            </div>
          ))
        )}
      </section>

      <section className="panel p-5">

        <h2 className="font-bold">{t("Histórico")}</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">{t("Carregando…")}</p>}
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
            <p className="text-sm text-muted-foreground">{t("Nenhum treino registrado ainda.")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
