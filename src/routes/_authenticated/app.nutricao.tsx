import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Droplets, Plus, Trash2 } from "lucide-react";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { addMeal, deleteMeal, setWater } from "@/lib/extras.functions";
import { nutritionTargets, todayISO, waterTarget } from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/nutricao")({
  head: () => ({
    meta: [
      { title: "Alimentação · ASCEND" },
      { name: "description", content: "Calorias, proteínas, carboidratos, gorduras e controle de água." },
      { property: "og:title", content: "Alimentação · ASCEND" },
      { property: "og:description", content: "Plano alimentar e hidratação personalizados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NutricaoPage,
});

function NutricaoPage() {
  const { data } = useDashboard();
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const water = useServerFn(setWater);
  const add = useServerFn(addMeal);
  const del = useServerFn(deleteMeal);
  const [form, setForm] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  const profile = data?.profile;
  const targets = nutritionTargets({
    weight_kg: profile?.weight_kg ?? null,
    height_cm: profile?.height_cm ?? null,
    age: profile?.age ?? null,
    goal: profile?.goal ?? "hipertrofia",
  });

  const meals = extras?.meals ?? [];
  const eaten = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const todayWater = extras?.water.find((w) => w.date === todayISO())?.ml ?? 0;
  const wTarget = waterTarget(profile?.weight_kg ? Number(profile.weight_kg) : null);

  const waterMutation = useMutation({
    mutationFn: (ml: number) => water({ data: { ml: Math.max(0, ml) } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const mealMutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          name: form.name.trim() || "Refeição",
          kcal: Number(form.kcal) || 0,
          protein: Number(form.protein) || 0,
          carbs: Number(form.carbs) || 0,
          fat: Number(form.fat) || 0,
        },
      }),
    onSuccess: () => {
      setForm({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
      toast.success("Refeição registrada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => refresh(),
  });

  const field = "w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2";
  const macros = [
    { l: "Proteína", v: eaten.protein, t: targets.protein, u: "g" },
    { l: "Carbo", v: eaten.carbs, t: targets.carbs, u: "g" },
    { l: "Gordura", v: eaten.fat, t: targets.fat, u: "g" },
  ];

  return (
    <div className="animate-rise space-y-4">
      <header>
        <h1 className="text-display text-4xl">ALIMENTAÇÃO</h1>
        <p className="text-sm text-muted-foreground">Metas calculadas a partir do seu perfil e objetivo.</p>
      </header>

      <section className="glass p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Calorias de hoje
            </p>
            <p className="text-display text-4xl">
              {eaten.kcal} <span className="text-muted-foreground text-2xl">/ {targets.kcal}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            restam <b className="text-foreground">{Math.max(0, targets.kcal - eaten.kcal)}</b> kcal
          </p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (eaten.kcal / targets.kcal) * 100)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {macros.map((m) => (
            <div key={m.l} className="rounded-xl bg-elevated p-3 text-center">
              <p className="text-sm font-extrabold">
                {m.v}
                <span className="text-muted-foreground">/{m.t}{m.u}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Droplets className="size-4 text-primary" /> Água
          </h2>
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">{todayWater}</b> / {wTarget} ml
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (todayWater / wTarget) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {[200, 300, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => waterMutation.mutate(todayWater + ml)}
              className="press flex-1 rounded-xl bg-elevated py-2.5 text-sm font-bold"
            >
              +{ml} ml
            </button>
          ))}
          <button
            onClick={() => waterMutation.mutate(0)}
            className="press rounded-xl bg-elevated px-3 text-xs font-bold text-muted-foreground"
          >
            zerar
          </button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Refeições de hoje</h2>
        <div className="mt-3 space-y-2">
          {meals.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.kcal} kcal · P{m.protein} C{m.carbs} G{m.fat}
                </p>
              </div>
              <button onClick={() => delMutation.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {meals.length === 0 && <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>}
        </div>

        <div className="mt-4 space-y-2">
          <input
            className={field}
            placeholder="Refeição (ex: Frango com arroz)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-4 gap-2">
            {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
              <input
                key={k}
                className={field}
                type="number"
                placeholder={k === "kcal" ? "kcal" : k === "protein" ? "P" : k === "carbs" ? "C" : "G"}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            ))}
          </div>
          <button
            onClick={() => mealMutation.mutate()}
            disabled={mealMutation.isPending}
            className="press flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="size-4" /> Adicionar refeição
          </button>
        </div>
      </section>
    </div>
  );
}
