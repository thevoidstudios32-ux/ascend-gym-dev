import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, CalendarDays, Dumbbell, Scale, Timer, Trash2, Trophy } from "lucide-react";
import { CountUp, PageHeader, StatCard } from "@/components/ui-kit";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { addRecord, deleteRecord, logWeight } from "@/lib/ascend.functions";
import { bmi, nutritionTargets, totalVolume } from "@/lib/ascend";


export const Route = createFileRoute("/_authenticated/app/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso e recordes · ASCEND" },
      { name: "description", content: "Acompanhe recordes, evolução de peso e metas nutricionais." },
      { property: "og:title", content: "Progresso e recordes · ASCEND" },
      { property: "og:description", content: "Recordes, peso e metas nutricionais." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgressoPage,
});

const field = "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

function ProgressoPage() {
  const { data } = useDashboard();
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const add = useServerFn(addRecord);
  const remove = useServerFn(deleteRecord);
  const weigh = useServerFn(logWeight);

  const [rec, setRec] = useState({ exercise: "", weight_kg: "", reps: "" });
  const [weight, setWeight] = useState("");

  const addMutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          exercise: rec.exercise.trim(),
          weight_kg: Number(rec.weight_kg),
          reps: Number(rec.reps),
        },
      }),
    onSuccess: () => {
      toast.success("Recorde salvo! 💪");
      setRec({ exercise: "", weight_kg: "", reps: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const weightMutation = useMutation({
    mutationFn: () => weigh({ data: { weight_kg: Number(weight) } }),
    onSuccess: () => {
      toast.success("Peso registrado!");
      setWeight("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weights = data?.weights ?? [];
  const min = Math.min(...weights.map((w) => w.weight_kg), Infinity);
  const max = Math.max(...weights.map((w) => w.weight_kg), -Infinity);
  const targets = data?.profile ? nutritionTargets(data.profile) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-display text-4xl">PROGRESSO</h1>
        <p className="text-sm text-muted-foreground">Recordes, peso corporal e metas do dia.</p>
      </header>

      <section className="panel p-5">
        <h2 className="font-bold">Novo recorde</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            className={field}
            placeholder="Exercício"
            value={rec.exercise}
            onChange={(e) => setRec({ ...rec, exercise: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="kg"
            value={rec.weight_kg}
            onChange={(e) => setRec({ ...rec, weight_kg: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="reps"
            value={rec.reps}
            onChange={(e) => setRec({ ...rec, reps: e.target.value })}
          />
          <button
            onClick={() => addMutation.mutate()}
            disabled={
              addMutation.isPending || !rec.exercise.trim() || !rec.weight_kg || !rec.reps
            }
            className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Salvar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {(data?.records ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
              <div className="flex-1">
                <p className="text-sm font-bold">{r.exercise}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.achieved_on.split("-").reverse().join("/")} · {r.reps} reps · 1RM ≈{" "}
                  {Math.round(r.weight_kg * (1 + r.reps / 30))} kg
                </p>
              </div>
              <span className="font-extrabold text-primary">{r.weight_kg} kg</span>
              <button
                onClick={() => delMutation.mutate(r.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Excluir recorde ${r.exercise}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {(data?.records.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum recorde cadastrado.</p>
          )}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Peso corporal</h2>
        <div className="mt-3 flex gap-2">
          <input
            className={field}
            type="number"
            placeholder="Peso de hoje (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button
            onClick={() => weightMutation.mutate()}
            disabled={weightMutation.isPending || !weight}
            className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            Registrar
          </button>
        </div>

        {weights.length > 1 && (
          <div className="mt-5 flex h-32 items-end gap-1">
            {weights.slice(-20).map((w) => {
              const range = max - min || 1;
              const h = 20 + ((w.weight_kg - min) / range) * 80;
              return (
                <div
                  key={w.id}
                  title={`${w.date}: ${w.weight_kg} kg`}
                  className="flex-1 rounded-t bg-primary/70"
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        )}
        {weights.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Atual: <b className="text-foreground">{weights[weights.length - 1]!.weight_kg} kg</b> ·{" "}
            {weights.length} registros
          </p>
        )}
      </section>

      {targets && (
        <section className="panel p-5">
          <h2 className="font-bold">Metas diárias estimadas</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              [targets.kcal, "kcal"],
              [`${targets.protein}g`, "proteína"],
              [`${targets.carbs}g`, "carbo"],
              [`${targets.fat}g`, "gordura"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-elevated p-3">
                <p className="font-extrabold">{v}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
