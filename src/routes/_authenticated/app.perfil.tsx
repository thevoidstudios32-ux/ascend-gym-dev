import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard, useRefreshDashboard } from "@/hooks/use-dashboard";
import { saveProfile } from "@/lib/ascend.functions";
import { EXPERIENCES, GOALS, levelFromXp } from "@/lib/ascend";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil · ASCEND" },
      { name: "description", content: "Ajuste seus dados, objetivo e frequência de treino." },
      { property: "og:title", content: "Meu perfil · ASCEND" },
      { property: "og:description", content: "Ajuste dados, objetivo e frequência de treino." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerfilPage,
});

const field = "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

function PerfilPage() {
  const { data } = useDashboard();
  const refresh = useRefreshDashboard();
  const save = useServerFn(saveProfile);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const p = data?.profile;

  const [form, setForm] = useState<null | {
    name: string;
    goal: string;
    experience: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    days_per_week: string;
  }>(null);

  const current =
    form ??
    (p
      ? {
          name: p.name,
          goal: p.goal,
          experience: p.experience,
          age: String(p.age ?? ""),
          height_cm: String(p.height_cm ?? ""),
          weight_kg: String(p.weight_kg ?? ""),
          days_per_week: String(p.days_per_week),
        }
      : null);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          name: current!.name.trim() || "Atleta",
          goal: current!.goal,
          experience: current!.experience,
          age: Number(current!.age) || null,
          height_cm: Number(current!.height_cm) || null,
          weight_kg: Number(current!.weight_kg) || null,
          days_per_week: Number(current!.days_per_week) || 3,
        },
      }),
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!current || !p) return <LoadingPage />;

  const level = levelFromXp(p.xp);
  const title = titleFromLevel(level.level);
  const streak = computeStreak((data?.workouts ?? []).map((w) => w.date));
  const medals = extras?.achievements.length ?? 0;
  const initials =
    p.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join("") || "A";
  const imc = bmi(p.weight_kg ? Number(p.weight_kg) : null, p.height_cm ? Number(p.height_cm) : null);

  return (
    <div className="animate-rise space-y-5">
      <section className="card overflow-hidden">
        <div className="h-28 bg-ember ember-border border-x-0 border-t-0" />
        <div className="-mt-12 px-5 pb-5">
          <div className="grid size-24 place-items-center rounded-3xl border-4 border-card bg-primary text-3xl font-extrabold text-primary-foreground shadow-glow">
            {initials}
          </div>
          <h1 className="mt-3 truncate text-display text-4xl">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.goal} · {p.experience}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="rounded-full border border-border px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: title.color }}
            >
              {title.emoji} {title.name}
            </span>
            <span className="rounded-full bg-elevated px-3 py-1 text-[11px] font-bold">
              Nível {level.level}
            </span>
            <span className="rounded-full bg-elevated px-3 py-1 text-[11px] font-bold text-primary">
              {p.xp} XP
            </span>
          </div>
          <ProgressBar value={level.pct} className="mt-4" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {level.into}/{level.need} XP para o próximo nível
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={<CountUp value={data?.workouts.length ?? 0} />} label="treinos" />
        <StatCard value={`${streak}`} label="sequência" hint="dias seguidos" />
        <StatCard value={`${medals}`} label="medalhas" />
        <StatCard
          value={imc ? imc.value : "—"}
          label="IMC"
          hint={imc ? imc.label : "informe peso e altura"}
        />
      </section>


      <section className="panel space-y-3 p-5">
        <input
          className={field}
          value={current.name}
          onChange={(e) => setForm({ ...current, name: e.target.value })}
          placeholder="Nome"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={field}
            value={current.goal}
            onChange={(e) => setForm({ ...current, goal: e.target.value })}
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={current.experience}
            onChange={(e) => setForm({ ...current, experience: e.target.value })}
          >
            {EXPERIENCES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            className={field}
            type="number"
            value={current.age}
            onChange={(e) => setForm({ ...current, age: e.target.value })}
            placeholder="Idade"
          />
          <input
            className={field}
            type="number"
            value={current.height_cm}
            onChange={(e) => setForm({ ...current, height_cm: e.target.value })}
            placeholder="Altura (cm)"
          />
          <input
            className={field}
            type="number"
            value={current.weight_kg}
            onChange={(e) => setForm({ ...current, weight_kg: e.target.value })}
            placeholder="Peso (kg)"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Dias de treino por semana
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setForm({ ...current, days_per_week: String(d) })}
                className={`h-10 flex-1 rounded-xl text-sm font-bold ${
                  Number(current.days_per_week) === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-elevated text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {mutation.isPending ? "Salvando…" : "Salvar alterações"}
        </button>
      </section>

      <button
        onClick={signOut}
        className="w-full rounded-full border border-border py-3 text-sm font-bold text-muted-foreground"
      >
        Sair da conta
      </button>
    </div>
  );
}
