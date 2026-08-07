import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronLeft, History, Plus, Trash2 } from "lucide-react";
import { WorkoutTuner } from "@/components/workout-tuner";
import { useCustomAction, useCustomWorkouts } from "@/hooks/use-custom";
import { deleteCustomWorkout, restoreWorkoutVersion, saveCustomWorkout } from "@/lib/custom.functions";
import {
  CALISTHENICS,
  DIFFICULTIES,
  FOCUS_OPTIONS,
  emptyExercise,
  estimateMinutes,
  type CustomExercise,
} from "@/lib/custom";

export const Route = createFileRoute("/_authenticated/app/personalizado/$id")({
  head: () => ({
    meta: [
      { title: "Treino personalizado · ASCEND" },
      {
        name: "description",
        content: "Monte treinos de calistenia e ajuste tudo com o Coach IA do ASCEND.",
      },
      { property: "og:title", content: "Treino personalizado · ASCEND" },
      { property: "og:description", content: "Crie e edite seus treinos de calistenia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomWorkoutPage,
});

function CustomWorkoutPage() {
  const { id } = useParams({ from: "/_authenticated/app/personalizado/$id" });
  const isNew = id === "novo";
  const navigate = useNavigate();
  const custom = useCustomWorkouts();
  const workout = custom.data?.workouts.find((w) => w.id === id) ?? null;

  const save = useCustomAction(useServerFn(saveCustomWorkout));
  const remove = useCustomAction(useServerFn(deleteCustomWorkout));
  const restore = useCustomAction(useServerFn(restoreWorkoutVersion));

  const [name, setName] = useState("Meu treino de calistenia");
  const [focus, setFocus] = useState<string>(FOCUS_OPTIONS[0]);
  const [emoji, setEmoji] = useState("🤸");
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[1]);
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadedKey = workout ? `${workout.id}:${workout.updated_at}` : null;
  useEffect(() => {
    if (!workout) return;
    setName(workout.name);
    setFocus(workout.focus);
    setEmoji(workout.emoji);
    setDifficulty(workout.difficulty);
    setNotes(workout.notes ?? "");
    setExercises(workout.exercises ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedKey]);

  const versions = useMemo(
    () => (custom.data?.versions ?? []).filter((v) => v.workout_id === id),
    [custom.data?.versions, id],
  );

  function patch(i: number, next: Partial<CustomExercise>) {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...next } : e)));
  }

  function submit() {
    const list = exercises.filter((e) => e.name.trim());
    if (!list.length) {
      toast.error("Adicione pelo menos um exercício.");
      return;
    }
    save.mutate(
      {
        id: isNew ? null : id,
        name: name.trim(),
        focus,
        emoji,
        difficulty,
        notes: notes.trim() || null,
        exercises: list,
      },
      {
        onSuccess: (res) => {
          toast.success("Treino salvo 💪");
          if (isNew) navigate({ to: "/app/personalizado/$id", params: { id: res.id } });
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="animate-rise space-y-5 pb-28">
      <button
        onClick={() => navigate({ to: "/app/treinos" })}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Treinos
      </button>

      <header>
        <h1 className="text-display text-4xl">{isNew ? "NOVO TREINO" : "EDITAR TREINO"}</h1>
        <p className="text-sm text-muted-foreground">
          Calistenia, peso do corpo ou o que você quiser — com séries, repetições, isometria e descanso.
        </p>
      </header>

      <section className="panel space-y-3 p-5">
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            aria-label="Emoji do treino"
            className="w-14 rounded-xl bg-elevated px-3 py-2.5 text-center text-lg outline-none ring-ring focus:ring-2"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nome do treino"
            placeholder="Nome do treino"
            className="flex-1 rounded-xl bg-elevated px-3 py-2.5 text-sm font-bold outline-none ring-ring focus:ring-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            aria-label="Foco"
            className="rounded-xl bg-elevated px-3 py-2.5 text-xs outline-none ring-ring focus:ring-2"
          >
            {FOCUS_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="Nível"
            className="rounded-xl bg-elevated px-3 py-2.5 text-xs outline-none ring-ring focus:ring-2"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observações (aquecimento, lesões, ritmo…)"
          className="w-full resize-none rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2"
        />
        <p className="text-xs text-muted-foreground">
          {exercises.length} exercícios · ~{estimateMinutes(exercises)} min estimados
        </p>
      </section>

      <section className="space-y-3">
        {exercises.map((ex, i) => (
          <div key={i} className="panel space-y-2 p-4">
            <div className="flex gap-2">
              <input
                value={ex.emoji}
                onChange={(e) => patch(i, { emoji: e.target.value.slice(0, 4) })}
                aria-label="Emoji do exercício"
                className="w-12 rounded-lg bg-elevated px-2 py-2 text-center outline-none ring-ring focus:ring-2"
              />
              <input
                value={ex.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Exercício"
                aria-label="Nome do exercício"
                className="min-w-0 flex-1 rounded-lg bg-elevated px-3 py-2 text-sm font-bold outline-none ring-ring focus:ring-2"
              />
              <button
                onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label={`Remover ${ex.name || "exercício"}`}
                className="press rounded-lg bg-elevated px-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Séries
                <input
                  type="number"
                  value={ex.sets}
                  onChange={(e) => patch(i, { sets: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 w-full rounded-lg bg-elevated px-2 py-1.5 text-center text-sm text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Reps
                <input
                  value={ex.reps}
                  onChange={(e) => patch(i, { reps: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-elevated px-2 py-1.5 text-center text-sm text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Isometria
                <input
                  type="number"
                  value={ex.hold ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    patch(i, { hold: e.target.value ? Math.max(1, Number(e.target.value)) : null })
                  }
                  className="mt-1 w-full rounded-lg bg-elevated px-2 py-1.5 text-center text-sm text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">
                Descanso
                <input
                  type="number"
                  value={ex.rest}
                  onChange={(e) => patch(i, { rest: Math.max(10, Number(e.target.value) || 60) })}
                  className="mt-1 w-full rounded-lg bg-elevated px-2 py-1.5 text-center text-sm text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
            </div>
            <input
              value={ex.tip}
              onChange={(e) => patch(i, { tip: e.target.value })}
              placeholder="Dica de execução"
              aria-label="Dica de execução"
              className="w-full rounded-lg bg-elevated px-3 py-2 text-xs outline-none ring-ring focus:ring-2"
            />
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={() => setShowCatalog((v) => !v)}
            className="press panel flex-1 py-3 text-xs font-bold"
          >
            📚 Catálogo de calistenia
          </button>
          <button
            onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
            className="press panel flex flex-1 items-center justify-center gap-1 py-3 text-xs font-bold"
          >
            <Plus className="size-4" /> Exercício livre
          </button>
        </div>

        {showCatalog && (
          <div className="panel grid gap-2 p-4 sm:grid-cols-2">
            {CALISTHENICS.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  setExercises((prev) => [...prev, { ...c }]);
                  toast.success(`${c.name} adicionado`);
                }}
                className="press flex items-center gap-2 rounded-xl bg-elevated p-3 text-left"
              >
                <span className="text-lg">{c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{c.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {c.muscle} · {c.sets}x{c.hold ? `${c.hold}s` : c.reps}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!isNew && <WorkoutTuner workoutId={id} />}

      {!isNew && versions.length > 0 && (
        <section className="panel p-5">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center gap-2 text-sm font-bold"
          >
            <History className="size-4 text-primary" /> Histórico de versões ({versions.length})
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-2 rounded-xl bg-elevated p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{v.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("pt-BR")} · {v.reason ?? "alteração"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      restore.mutate(
                        { versionId: v.id },
                        {
                          onSuccess: () => toast.success("Versão restaurada"),
                          onError: (e: Error) => toast.error(e.message),
                        },
                      )
                    }
                    className="press shrink-0 rounded-full bg-surface px-3 py-1.5 text-[11px] font-bold"
                  >
                    Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-4">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            onClick={submit}
            disabled={save.isPending}
            className="press flex-1 rounded-full bg-primary py-4 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {save.isPending ? "Salvando…" : "Salvar treino"}
          </button>
          {!isNew && (
            <button
              onClick={() => {
                if (!confirm("Excluir este treino?")) return;
                remove.mutate(
                  { id },
                  {
                    onSuccess: () => {
                      toast.success("Treino excluído");
                      navigate({ to: "/app/treinos" });
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
              className="press rounded-full bg-elevated px-5 text-sm font-bold text-muted-foreground"
            >
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
