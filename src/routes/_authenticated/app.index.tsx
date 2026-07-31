import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame, Play, Timer, Zap } from "lucide-react";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { saveProfile } from "@/lib/ascend.functions";
import {
  computeStreak,
  EXPERIENCES,
  GOALS,
  levelFromXp,
  monthGrid,
  splitOfDay,
  todayISO,
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

  if (!data.profile.onboarded)
    return <Onboarding onDone={refresh} profileName={data.profile.name} />;

  return <Dashboard data={data} />;
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

  const field =
    "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

  return (
    <div className="panel animate-rise p-6">
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
                className={`press h-10 flex-1 rounded-xl text-sm font-bold ${
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
          className="press w-full rounded-full bg-primary py-3.5 font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {mutation.isPending ? "Salvando…" : "Começar"}
        </button>
      </div>
    </div>
  );
}

type DashboardData = NonNullable<ReturnType<typeof useDashboard>["data"]>;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard({ data }: { data: DashboardData }) {
  const { data: extras } = useExtras();
  const profile = data.profile!;
  const level = levelFromXp(profile.xp);
  const dates = useMemo(() => data.workouts.map((w) => w.date), [data.workouts]);
  const streak = computeStreak(dates);
  const now = new Date();
  const cells = useMemo(() => monthGrid(now.getFullYear(), now.getMonth()), [now]);
  const today = todayISO();
  const doneSet = new Set(dates);
  const split = splitOfDay();
  const doneToday = doneSet.has(today);

  const totals = useMemo(() => {
    const cal = data.workouts.reduce((a, w) => a + (w.calories ?? 0), 0);
    const min = data.workouts.reduce((a, w) => a + (w.duration_min ?? 0), 0);
    const week = data.workouts.filter(
      (w) => new Date(w.date).getTime() > Date.now() - 7 * 86400000,
    ).length;
    return { cal, min, week };
  }, [data.workouts]);

  const weightDelta = useMemo(() => {
    if (data.weights.length < 2) return null;
    const first = Number(data.weights[0]!.weight_kg);
    const last = Number(data.weights[data.weights.length - 1]!.weight_kg);
    return Math.round((last - first) * 10) / 10;
  }, [data.weights]);

  const monthDone = cells.filter((c) => c && doneSet.has(c)).length;
  const medals = extras?.achievements.length ?? 0;

  return (
    <div className="animate-rise space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="truncate text-display text-4xl">{profile.name}</h1>
        </div>
        <div className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2">
          <Flame className="size-4 animate-flame text-primary" />
          <span className="font-extrabold">{streak}</span>
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
      </header>

      <section className="glass p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Nível
            </p>
            <p className="text-display text-4xl">
              {level.name} <span className="text-primary">{level.level}</span>
            </p>
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            <b className="text-foreground">{level.into}</b> / {level.need} XP
          </p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${level.pct}%` }}
          />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <span className="text-3xl">{split.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {doneToday ? "Treino de hoje concluído" : "Próximo treino"}
            </p>
            <p className="truncate text-lg font-bold">{split.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {split.focus} · {split.minutes} min · {split.exercises.length} exercícios
            </p>
          </div>
        </div>
        <Link
          to="/app/treino/$split"
          params={{ split: split.id }}
          className="press flex items-center justify-center gap-2 bg-primary py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground"
        >
          <Play className="size-5 fill-current" />
          {doneToday ? "Treinar de novo" : "Começar treino"}
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, v: totals.cal.toLocaleString("pt-BR"), l: "kcal queimadas" },
          { icon: Timer, v: `${Math.round(totals.min / 60)}h`, l: "tempo treinado" },
          {
            icon: Flame,
            v: weightDelta === null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta}kg`,
            l: "evolução peso",
          },
        ].map((s) => (
          <div key={s.l} className="panel p-4 text-center">
            <s.icon className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-lg font-extrabold">{s.v}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to="/app/nutricao" className="press panel p-4">
          <p className="text-sm font-bold">🥗 Alimentação</p>
          <p className="text-xs text-muted-foreground">Calorias, macros e água</p>
        </Link>
        <Link to="/app/shape" className="press panel p-4">
          <p className="text-sm font-bold">📸 Shape Tracker</p>
          <p className="text-xs text-muted-foreground">Fotos analisadas pela IA</p>
        </Link>
        <Link to="/app/conquistas" className="press panel p-4">
          <p className="text-sm font-bold">🏆 Conquistas</p>
          <p className="text-xs text-muted-foreground">{medals} medalhas · missões</p>
        </Link>
        <Link to="/app/coach" className="press panel p-4">
          <p className="text-sm font-bold">🤖 Coach IA</p>
          <p className="text-xs text-muted-foreground">Treino sob medida agora</p>
        </Link>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">
            {now
              .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
              .replace(/^./, (c) => c.toUpperCase())}
          </h2>
          <span className="rounded-full bg-elevated px-3 py-1 text-xs font-bold text-muted-foreground">
            {monthDone} treinos · {totals.week} nesta semana
          </span>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <span key={`e${i}`} />
            ) : (
              <span
                key={c}
                className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${
                  doneSet.has(c)
                    ? "bg-primary text-primary-foreground"
                    : c === today
                      ? "ember-border text-foreground"
                      : "bg-elevated text-muted-foreground"
                }`}
              >
                {Number(c.slice(-2))}
              </span>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
