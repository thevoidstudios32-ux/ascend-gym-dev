import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { useDashboard, useRefreshDashboard } from "@/hooks/use-dashboard";
import { saveProfile, toggleWorkout } from "@/lib/ascend.functions";
import {
  computeStreak,
  EXPERIENCES,
  GOALS,
  levelFromXp,
  monthGrid,
  todayISO,
  WEEK_PLAN,
} from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Meu painel · ASCEND" },
      { name: "description", content: "Seu nível, sequência de treinos e calendário do mês." },
      { property: "og:title", content: "Meu painel · ASCEND" },
      { property: "og:description", content: "Seu nível, sequência e calendário de treinos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, isLoading, error } = useDashboard();
  const refresh = useRefreshDashboard();

  if (isLoading) return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  if (error)
    return <p className="py-20 text-center text-destructive">Erro ao carregar seus dados.</p>;
  if (!data?.profile) return <p className="py-20 text-center">Perfil não encontrado.</p>;

  if (!data.profile.onboarded) return <Onboarding onDone={refresh} profileName={data.profile.name} />;

  return <Dashboard data={data} onChange={refresh} />;
}

function Onboarding({ onDone, profileName }: { onDone: () => void; profileName: string }) {
  const save = useServerFn(saveProfile);
  const [form, setForm] = useState({
    name: profileName === "Atleta" ? "" : profileName,
    goal: GOALS[0]!,
    experience: EXPERIENCES[0]!,
    age: "28",
    height_cm: "175",
    weight_kg: "78",
    days_per_week: "3",
  });

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          name: form.name.trim() || "Atleta",
          goal: form.goal,
          experience: form.experience,
          age: Number(form.age) || null,
          height_cm: Number(form.height_cm) || null,
          weight_kg: Number(form.weight_kg) || null,
          days_per_week: Number(form.days_per_week) || 3,
        },
      }),
    onSuccess: () => {
      toast.success("Perfil pronto! Bora treinar 🔥");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field = "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

  return (
    <div className="panel p-6">
      <h1 className="text-display text-4xl">VAMOS TE CONHECER</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esses dados personalizam seu plano, suas metas e o Coach IA.
      </p>
      <div className="mt-6 space-y-3">
        <input
          className={field}
          placeholder="Como podemos te chamar?"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className={field}
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
          >
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
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
            placeholder="Idade"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="Altura (cm)"
            value={form.height_cm}
            onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="Peso (kg)"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
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
                onClick={() => setForm({ ...form, days_per_week: String(d) })}
                className={`h-10 flex-1 rounded-xl text-sm font-bold ${
                  Number(form.days_per_week) === d
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
          {mutation.isPending ? "Salvando…" : "Começar"}
        </button>
      </div>
    </div>
  );
}

type DashboardData = NonNullable<ReturnType<typeof useDashboard>["data"]>;

function Dashboard({ data, onChange }: { data: DashboardData; onChange: () => void }) {
  const toggle = useServerFn(toggleWorkout);
  const profile = data.profile!;
  const level = levelFromXp(profile.xp);
  const dates = useMemo(() => data.workouts.map((w) => w.date), [data.workouts]);
  const streak = computeStreak(dates);
  const now = new Date();
  const cells = useMemo(() => monthGrid(now.getFullYear(), now.getMonth()), [now]);
  const today = todayISO();
  const doneSet = new Set(dates);
  const planIndex = new Date().getDay() % WEEK_PLAN.length;
  const plan = WEEK_PLAN[planIndex]!;

  const mutation = useMutation({
    mutationFn: (date: string) => toggle({ data: { date, title: plan.name } }),
    onSuccess: (res) => {
      toast.success(res.added ? "Treino registrado! +120 XP 🔥" : "Treino removido.");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const monthDone = cells.filter((c) => c && doneSet.has(c)).length;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="text-display text-4xl">{profile.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full ember-border bg-surface px-4 py-2">
          <Flame className="size-4 animate-flame text-primary" />
          <span className="font-extrabold">{streak}</span>
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
      </header>

      <section className="panel p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Nível atual
            </p>
            <p className="text-display text-4xl">
              {level.name} <span className="text-primary">{level.level}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">{level.into}</b> / {level.need} XP
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${level.pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            [`${profile.weight_kg ?? "—"}`, "Peso (kg)"],
            [`${profile.days_per_week}`, "Treinos/sem"],
            [`${data.workouts.length}`, "Treinos totais"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-elevated p-3 text-center">
              <p className="text-lg font-extrabold">{v}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel flex items-center gap-4 p-5">
        <span className="text-3xl">{plan.emoji}</span>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Treino de hoje</p>
          <p className="text-lg font-bold">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.detail}</p>
        </div>
        <button
          onClick={() => mutation.mutate(today)}
          disabled={mutation.isPending}
          className={`rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-60 ${
            doneSet.has(today)
              ? "bg-elevated text-muted-foreground"
              : "bg-primary text-primary-foreground shadow-glow"
          }`}
        >
          {doneSet.has(today) ? "Feito ✓" : "Concluir"}
        </button>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            📅{" "}
            {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) =>
              c.toUpperCase(),
            )}
          </h2>
          <span className="rounded-full bg-elevated px-3 py-1 text-xs font-bold text-muted-foreground">
            {monthDone} dias treinados
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <span key={i} className="text-[10px] font-bold uppercase text-muted-foreground">
              {d}
            </span>
          ))}
          {cells.map((iso, i) =>
            iso === null ? (
              <span key={`e${i}`} />
            ) : (
              <button
                key={iso}
                onClick={() => mutation.mutate(iso)}
                disabled={mutation.isPending || iso > today}
                className={`aspect-square rounded-lg text-xs font-bold transition-transform active:scale-90 disabled:opacity-30 ${
                  doneSet.has(iso)
                    ? "bg-primary text-primary-foreground"
                    : iso === today
                      ? "ember-border bg-elevated"
                      : "bg-elevated text-muted-foreground"
                }`}
              >
                {Number(iso.slice(-2))}
              </button>
            ),
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Toque em um dia para marcar ou desmarcar o treino.
        </p>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Últimos recordes</h2>
          <Link to="/app/progresso" className="text-xs font-bold text-primary">
            Ver todos →
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {data.records.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-elevated p-3">
              <div>
                <p className="text-sm font-bold">{r.exercise}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.achieved_on.split("-").reverse().join("/")} · {r.reps} reps
                </p>
              </div>
              <p className="font-extrabold text-primary">{r.weight_kg} kg</p>
            </div>
          ))}
          {data.records.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum recorde ainda. Cadastre o primeiro em Progresso.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
