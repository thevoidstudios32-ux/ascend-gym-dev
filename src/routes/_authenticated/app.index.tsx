import { AscendIcon, Glyph } from "@/components/ascend-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { TitleBadge } from "@/components/title-badge";
import { displayTitle } from "@/lib/titles";
import { TitleSelector } from "@/components/title-selector";
import { useTitles } from "@/hooks/use-titles";
import { Apple, Bot, Camera, Dumbbell, Flame, Play, Timer, Trophy, Zap } from "lucide-react";
import { CountUp, LoadingPage, ProgressBar, StatCard } from "@/components/ui-kit";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { useProgram, useStartProgramDay } from "@/hooks/use-program";
import { WEEKDAYS } from "@/lib/program";
import { saveProfile } from "@/lib/ascend.functions";
import { useT } from "@/lib/i18n";
import {
  computeStreak,
  EXPERIENCES,
  GOALS,
  levelFromXp,
  monthGrid,
  splitOfDay,
  titleFromLevel,
  todayISO,
  totalVolume,
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
  const t = useT();
  const { data, isLoading, error } = useDashboard();
  const refresh = useRefreshDashboard();

  if (isLoading) return <LoadingPage />;
  if (error)
    return <p className="py-20 text-center text-destructive">{t("Erro ao carregar seus dados.")}</p>;

  if (!data?.profile) return <p className="py-20 text-center">{t("Perfil não encontrado.")}</p>;

  if (!data.profile.onboarded)
    return <Onboarding onDone={refresh} profileName={data.profile.name} />;

  return <Dashboard data={data} />;
}

function Onboarding({ onDone, profileName }: { onDone: () => void; profileName: string }) {
  const t = useT();
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
      toast.success(t("Perfil pronto! Bora treinar"));
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const field =
    "w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2";

  return (
    <div className="panel animate-rise p-6">
      <h1 className="text-display text-4xl">{t("VAMOS TE CONHECER")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Esses dados personalizam seu plano, suas metas e o Coach IA.")}
      </p>
      <div className="mt-6 space-y-3">
        <input
          className={field}
          placeholder={t("Como podemos te chamar?")}
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
                {t(g)}
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
                {t(g)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            className={field}
            type="number"
            placeholder={t("Idade")}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder={t("Altura (cm)")}
            value={form.height_cm}
            onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder={t("Peso (kg)")}
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("Dias de treino por semana")}
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
          {mutation.isPending ? t("Salvando…") : t("Começar")}
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
  const t = useT();
  const { data: extras } = useExtras();
  const { data: titles } = useTitles();
  const [titlesOpen, setTitlesOpen] = useState(false);
  const profile = data.profile!;
  const level = levelFromXp(profile.xp);
  const shown = displayTitle(level.level, profile.xp, profile.id ?? null, titles?.equipped ?? null);
  const title = shown.progression;
  const dates = useMemo(() => data.workouts.map((w) => w.date), [data.workouts]);
  const streak = computeStreak(dates);
  const now = new Date();
  const cells = useMemo(() => monthGrid(now.getFullYear(), now.getMonth()), [now]);
  const today = todayISO();
  const doneSet = new Set(dates);
  const split = splitOfDay();
  const doneToday = doneSet.has(today);
  const { data: programData } = useProgram();
  const startDay = useStartProgramDay();
  const navigate = useNavigate();
  const todayProgramDay = useMemo(() => {
    const program = programData?.program;
    if (!program?.active) return null;
    const weekday = WEEKDAYS[(now.getDay() + 6) % 7]!;
    return program.days.find((d) => d.weekday === weekday) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programData?.program]);

  const startProgramWorkout = async (dayKey: string) => {
    try {
      const res = await startDay.mutateAsync(dayKey);
      await navigate({ to: "/app/treino/$split", params: { split: res.workoutId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Não foi possível iniciar o treino."));
    }
  };

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = todayISO(d);
      return {
        iso,
        letter: ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()]!,
        done: doneSet.has(iso),
        isToday: iso === today,
      };
    });
  }, [doneSet, today]);

  const totals = useMemo(() => {
    const cal = data.workouts.reduce((a, w) => a + (w.calories ?? 0), 0);
    const min = data.workouts.reduce((a, w) => a + (w.duration_min ?? 0), 0);
    const week = data.workouts.filter(
      (w) => new Date(w.date).getTime() > Date.now() - 7 * 86400000,
    ).length;
    const avg = data.workouts.length ? Math.round(min / data.workouts.length) : 0;
    return { cal, min, week, avg };
  }, [data.workouts]);

  const weekVolume = useMemo(() => {
    const sets = (extras?.sets ?? []).filter(
      (s) => new Date(s.created_at).getTime() > Date.now() - 7 * 86400000,
    );
    return totalVolume(sets);
  }, [extras?.sets]);

  const weightDelta = useMemo(() => {
    if (data.weights.length < 2) return null;
    const first = Number(data.weights[0]!.weight_kg);
    const last = Number(data.weights[data.weights.length - 1]!.weight_kg);
    return Math.round((last - first) * 10) / 10;
  }, [data.weights]);

  const lastWorkout = data.workouts[data.workouts.length - 1] ?? null;
  const monthDone = cells.filter((c) => c && doneSet.has(c)).length;
  const medals = extras?.achievements.length ?? 0;

  return (
    <div className="animate-rise space-y-4">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <UserAvatar src={profile.avatar_url ?? null} name={profile.name} userId={profile.id} className="size-12" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t(greeting())},</p>
          <h1 className="truncate text-display text-3xl">{profile.name}</h1>
        </div>
        <div className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2">
          <Flame className="size-4 animate-flame text-primary" />
          <span className="font-extrabold">{streak}</span>
          <span className="text-[10px] uppercase text-muted-foreground">{t("dias")}</span>
        </div>
      </header>

      <section className="glass animate-pop p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <TitleBadge visual={titles?.equippedVisual ?? shown.visual} size="sm" onClick={() => setTitlesOpen(true)} />
            <TitleSelector
              open={titlesOpen}
              onClose={() => setTitlesOpen(false)}
              userId={profile.id ?? null}
              owned={(titles?.owned ?? []).map((owned) => owned.id)}
              equipped={titles?.equipped ?? null}
            />
            <p className="mt-2 text-display text-4xl">
              {t("Nível")} <span className="text-primary">{level.level}</span>
            </p>
          </div>
          <p className="shrink-0 text-right text-sm text-muted-foreground">
            <b className="text-foreground">
              <CountUp value={level.into} />
            </b>
            <br />
            <span className="text-xs">{t("de {need} XP", { need: level.need })}</span>
          </p>
        </div>
        <ProgressBar value={level.pct} className="mt-4" />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {title.next
            ? t("Faltam {n} níveis para {name}", {
                n: Math.max(0, title.next.min - level.level),
                name: title.next.name,
              })
            : t("Você alcançou o título máximo. Lenda.")}
        </p>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {last7.map((d) => (
            <div key={d.iso} className="text-center">
              <div
                className={`grid aspect-square place-items-center rounded-xl text-xs font-bold transition-colors ${
                  d.done
                    ? "bg-primary text-primary-foreground"
                    : d.isToday
                      ? "ember-border animate-glow-ring text-foreground"
                      : "bg-elevated text-muted-foreground"
                }`}
              >
                {d.done ? <AscendIcon name="streak" size={14} /> : d.letter}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <span className="animate-exercise text-3xl">
            <Glyph value={todayProgramDay ? todayProgramDay.exercises[0]?.emoji : split.emoji} size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {doneToday ? "Treino de hoje concluído" : "Treino de hoje"}
              {todayProgramDay ? " · programa IA" : ""}
            </p>
            <p className="truncate text-lg font-bold">
              {todayProgramDay ? todayProgramDay.title : split.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {todayProgramDay
                ? `${todayProgramDay.focus} · ${todayProgramDay.minutes} min · ${todayProgramDay.exercises.length} exercícios`
                : `${split.focus} · ${split.minutes} min · ${split.exercises.length} exercícios`}
            </p>
          </div>
        </div>
        {todayProgramDay ? (
          <button
            onClick={() => startProgramWorkout(todayProgramDay.key)}
            disabled={startDay.isPending}
            className="press flex w-full items-center justify-center gap-2 bg-primary py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
          >
            <Play className="size-5 fill-current" />
            {startDay.isPending
              ? "Preparando…"
              : doneToday
                ? "Treinar de novo"
                : "Iniciar treino"}
          </button>
        ) : (
          <Link
            to="/app/treino/$split"
            params={{ split: split.id }}
            className="press flex items-center justify-center gap-2 bg-primary py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground"
          >
            <Play className="size-5 fill-current" />
            {doneToday ? "Treinar de novo" : "Iniciar treino"}
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          value={<CountUp value={weekVolume} />}
          label="volume semanal"
          hint="kg levantados"
          delay={0}
        />
        <StatCard
          icon={Timer}
          value={`${Math.round(totals.min / 60)}h`}
          label="tempo treinado"
          hint={`média ${totals.avg} min`}
          delay={60}
        />
        <StatCard
          icon={Zap}
          value={<CountUp value={totals.cal} />}
          label="kcal queimadas"
          hint={`${totals.week} treinos na semana`}
          delay={120}
        />
        <StatCard
          icon={Flame}
          value={weightDelta === null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta}kg`}
          label="evolução peso"
          hint={
            data.weights.length
              ? `atual ${data.weights[data.weights.length - 1]!.weight_kg} kg`
              : "sem registros"
          }
          delay={180}
        />
      </section>

      {lastWorkout && (
        <section className="card stagger flex items-center gap-4 p-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-elevated text-lg">
            <AscendIcon name="check" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Último treino
            </p>
            <p className="truncate text-sm font-bold">{lastWorkout.title}</p>
            <p className="text-xs text-muted-foreground">
              {lastWorkout.date.split("-").reverse().join("/")} · {lastWorkout.duration_min} min ·
              +{lastWorkout.xp} XP
            </p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        {[
          { to: "/app/nutricao", icon: Apple, t: "Alimentação", d: "Calorias, macros e água" },
          { to: "/app/shape", icon: Camera, t: "Shape Tracker", d: "Fotos analisadas pela IA" },
          {
            to: "/app/conquistas",
            icon: Trophy,
            t: "Conquistas",
            d: `${medals} medalhas · missões`,
          },
          { to: "/app/coach", icon: Bot, t: "Coach IA", d: "Treino sob medida agora" },
        ].map((q, i) => (
          <Link
            key={q.to}
            to={q.to}
            className="press card stagger flex items-center gap-3 p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <q.icon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{q.t}</p>
              <p className="truncate text-[11px] text-muted-foreground">{q.d}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">
            {now
              .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
              .replace(/^./, (c) => c.toUpperCase())}
          </h2>
          <span className="shrink-0 rounded-full bg-elevated px-3 py-1 text-xs font-bold text-muted-foreground">
            {monthDone} treinos
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

