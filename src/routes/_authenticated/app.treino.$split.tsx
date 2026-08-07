import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, MoreVertical, Pause, Play, RotateCcw } from "lucide-react";
import { ExerciseSwapSheet } from "@/components/exercise-swap";
import { StoryComposer, type StoryDraft } from "@/components/stories";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { useCustomWorkouts } from "@/hooks/use-custom";
import { customToSplit, isUuid } from "@/lib/custom";
import { finishWorkout } from "@/lib/extras.functions";
import { estimateCalories, SPLITS, suggestLoad, todayISO, type Split } from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/treino/$split")({
  head: () => ({
    meta: [
      { title: "Sessão de treino · ASCEND" },
      { name: "description", content: "Cronômetro, séries, cargas e progressão em tempo real." },
      { property: "og:title", content: "Sessão de treino · ASCEND" },
      { property: "og:description", content: "Execute seu treino com cronômetro e registro de cargas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionPage,
});

type Entry = { exercise: string; set_index: number; reps: number; weight_kg: number; done: boolean };

function SessionPage() {
  const { split: splitId } = useParams({ from: "/_authenticated/app/treino/$split" });
  const custom = useCustomWorkouts();
  const customWorkout = isUuid(splitId)
    ? (custom.data?.workouts.find((w) => w.id === splitId) ?? null)
    : null;
  const split: Split = customWorkout
    ? customToSplit(customWorkout)
    : (SPLITS.find((s) => s.id === splitId) ?? SPLITS[0]!);
  const workoutKind = customWorkout ? `custom:${customWorkout.id}` : split.id;
  const navigate = useNavigate();
  const { data } = useDashboard();
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const finish = useServerFn(finishWorkout);

  const [exercises, setExercises] = useState(() => split.exercises.map((e) => ({ ...e })));

  const [swapping, setSwapping] = useState<string | null>(null);
  const [share, setShare] = useState<StoryDraft | null>(null);
  const [shareCard, setShareCard] = useState<{ volume: number; sets: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [rest, setRest] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>(() =>
    split.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exercise: ex.name,
        set_index: i + 1,
        reps: Number(ex.reps.split("-")[0]?.replace(/\D/g, "")) || 10,
        weight_kg: 0,
        done: false,
      })),
    ),
  );

  // O treino personalizado chega depois do primeiro render: recarrega séries.
  const customKey = customWorkout ? `${customWorkout.id}:${customWorkout.updated_at}` : null;
  useEffect(() => {
    if (!customKey || !customWorkout) return;
    const list = customToSplit(customWorkout).exercises;
    setExercises(list.map((e) => ({ ...e })));
    setEntries(
      list.flatMap((ex) =>
        Array.from({ length: ex.sets }, (_, i) => ({
          exercise: ex.name,
          set_index: i + 1,
          reps: Number(ex.reps.split("-")[0]?.replace(/\D/g, "")) || 10,
          weight_kg: 0,
          done: false,
        })),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customKey]);


  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      setRest(null);
      toast.success("Descanso terminou. Bora para a próxima série!");
      return;
    }
    const t = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [rest]);

  // Última carga registrada por exercício, para sugerir progressão
  const last = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number }>();
    for (const s of extras?.sets ?? []) {
      if (!map.has(s.exercise)) map.set(s.exercise, { weight: Number(s.weight_kg), reps: s.reps });
    }
    return map;
  }, [extras?.sets]);

  useEffect(() => {
    setEntries((prev) =>
      prev.map((e) => (e.weight_kg === 0 ? { ...e, weight_kg: last.get(e.exercise)?.weight ?? 0 } : e)),
    );
  }, [last]);

  const doneCount = entries.filter((e) => e.done).length;
  const minutes = Math.max(1, Math.round(elapsed / 60));
  const calories = estimateCalories(minutes, data?.profile?.weight_kg ? Number(data.profile.weight_kg) : null);

  const mutation = useMutation({
    mutationFn: () =>
      finish({
        data: {
          date: todayISO(),
          title: split.name,
          kind: workoutKind,
          duration_min: minutes,
          calories,
          sets: entries
            .filter((e) => e.done)
            .map(({ exercise, set_index, reps, weight_kg }) => ({ exercise, set_index, reps, weight_kg })),
        },
      }),
    onSuccess: (res) => {
      if (res.duplicate) {
        toast.info("Este treino já foi contabilizado hoje — nada foi duplicado.");
      } else {
        toast.success(`Treino salvo! +${res.xp} XP`);
      }
      if (res.newPrs.length) toast.success(`Novo recorde: ${res.newPrs.join(", ")} 🏆`);
      res.unlocked.forEach((a) => toast.success(`${a.emoji} Conquista: ${a.label}`));
      refresh();
      setShareCard({
        volume: entries
          .filter((e) => e.done)
          .reduce((sum, e) => sum + e.reps * e.weight_kg, 0),
        sets: doneCount,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function update(i: number, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function swapExercise(oldName: string, next: { name: string; emoji: string; muscle?: string; tip: string }, keepLoad: boolean) {
    setExercises((prev) =>
      prev.map((e) => (e.name === oldName ? { ...e, name: next.name, emoji: next.emoji, tip: next.tip } : e)),
    );
    setEntries((prev) =>
      prev.map((e) =>
        e.exercise === oldName ? { ...e, exercise: next.name, weight_kg: keepLoad ? e.weight_kg : 0 } : e,
      ),
    );
    setSwapping(null);
    toast.success(`✓ Exercício substituído por ${next.name}`);
  }

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="animate-rise space-y-4 pb-24">
      <button
        onClick={() => navigate({ to: "/app/treinos" })}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Treinos
      </button>

      <header className="glass flex items-center gap-4 p-5">
        <span className="text-3xl animate-exercise">{split.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-display text-3xl">{split.name}</h1>
          <p className="truncate text-xs text-muted-foreground">{split.focus}</p>
        </div>
        <div className="text-right">
          <p className="text-display text-3xl tabular-nums">{clock}</p>
          <div className="mt-1 flex justify-end gap-2">
            <button onClick={() => setRunning((r) => !r)} className="press rounded-full bg-elevated p-2">
              {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button onClick={() => setElapsed(0)} className="press rounded-full bg-elevated p-2">
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {rest !== null && (
        <div className="glass flex items-center justify-between p-4">
          <p className="text-sm font-bold">Descanso</p>
          <p className="text-display text-3xl text-primary tabular-nums">{rest}s</p>
          <button onClick={() => setRest(null)} className="press rounded-full bg-elevated px-3 py-1.5 text-xs font-bold">
            Pular
          </button>
        </div>
      )}

      {exercises.map((ex) => {
        const prev = last.get(ex.name) ?? null;
        const target = Number(ex.reps.split("-").pop()?.replace(/\D/g, "")) || 10;
        const sug = suggestLoad(prev?.weight ?? null, prev?.reps ?? null, target);
        return (
          <section key={ex.name} className="panel p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-exercise">{ex.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{ex.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ex.muscle} · {ex.sets}x{ex.reps} · descanso {ex.rest}s
                </p>
              </div>
              <button
                onClick={() => setSwapping(ex.name)}
                className="press rounded-full bg-elevated p-2"
                aria-label={`Mais opções de ${ex.name}`}
              >
                <MoreVertical className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">💡 {ex.tip}</p>
            {sug && (
              <p className="mt-1 text-xs font-semibold text-primary">
                Sugestão: {sug.weight} kg — {sug.note}
              </p>
            )}
            <div className="mt-3 space-y-2">
              {entries.map((e, i) =>
                e.exercise !== ex.name ? null : (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-elevated p-2">
                    <span className="w-8 text-center text-xs font-bold text-muted-foreground">
                      {e.set_index}ª
                    </span>
                    <input
                      type="number"
                      value={e.weight_kg || ""}
                      onChange={(ev) => update(i, { weight_kg: Number(ev.target.value) })}
                      placeholder="kg"
                      className="w-16 rounded-lg bg-surface px-2 py-1.5 text-center text-sm outline-none ring-ring focus:ring-2"
                    />
                    <span className="text-xs text-muted-foreground">kg ×</span>
                    <input
                      type="number"
                      value={e.reps || ""}
                      onChange={(ev) => update(i, { reps: Number(ev.target.value) })}
                      className="w-14 rounded-lg bg-surface px-2 py-1.5 text-center text-sm outline-none ring-ring focus:ring-2"
                    />
                    <span className="text-xs text-muted-foreground">reps</span>
                    <button
                      onClick={() => {
                        update(i, { done: !e.done });
                        if (!e.done) setRest(ex.rest);
                      }}
                      className={`press ml-auto rounded-full px-3 py-1.5 text-xs font-bold ${
                        e.done ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {e.done ? "✓" : "OK"}
                    </button>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}

      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || doneCount === 0}
            className="press w-full rounded-full bg-primary py-4 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {mutation.isPending
              ? "Salvando…"
              : `Finalizar treino · ${doneCount} séries · ${calories} kcal`}
          </button>
        </div>
      </div>

      {swapping && (
        <ExerciseSwapSheet
          current={swapping}
          muscle={exercises.find((e) => e.name === swapping)?.muscle ?? split.focus}
          onClose={() => setSwapping(null)}
          onSwap={(next, keepLoad) => swapExercise(swapping, next, keepLoad)}
        />
      )}

      {shareCard && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="animate-pop glass w-full max-w-sm space-y-4 p-6 text-center">
            <p className="text-sm font-bold text-muted-foreground">Compartilhar nos Stories?</p>
            <div
              className="space-y-1 rounded-3xl p-6 text-primary-foreground"
              style={{ background: "linear-gradient(150deg,#DC2626 0%,#7f1010 55%,#151515 100%)" }}
            >
              <p className="text-4xl">{split.emoji}</p>
              <p className="text-display text-2xl">{split.name}</p>
              <p className="text-xs opacity-80">
                {minutes} min · {shareCard.sets} séries
              </p>
              <p className="text-xs opacity-80">
                {Math.round(shareCard.volume)} kg de volume · {calories} kcal
              </p>
              <p className="pt-2 text-[11px] opacity-70">
                {exercises.map((e) => e.name).slice(0, 4).join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setShare({
                    kind: "workout",
                    sticker: "workout",
                    bg: "ember",
                    content: `${split.emoji} ${split.name} — ${minutes} min · ${shareCard.sets} séries · ${Math.round(shareCard.volume)} kg · ${calories} kcal`,
                  })
                }
                className="press flex-1 rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                Compartilhar
              </button>
              <button
                onClick={() => navigate({ to: "/app" })}
                className="press flex-1 rounded-full bg-elevated py-3 text-sm font-bold"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {share && (
        <StoryComposer
          preset={share}
          onClose={() => {
            setShare(null);
            navigate({ to: "/app" });
          }}
        />
      )}
    </div>
  );
}
