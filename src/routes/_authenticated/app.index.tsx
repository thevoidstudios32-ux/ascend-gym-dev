import { AscendIcon, Glyph } from "@/components/ascend-icon";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { TitleBadge } from "@/components/title-badge";
import { displayTitle } from "@/lib/titles";
import { TitleSelector } from "@/components/title-selector";
import { useTitles } from "@/hooks/use-titles";
import { Apple, Bot, Camera, Dumbbell, Flame, Play, Timer, Trophy, Zap } from "lucide-react";
import { CountUp, LoadingPage, ProgressBar, StatCard } from "@/components/ui-kit";
import { useDashboard, useExtras } from "@/hooks/use-dashboard";
import { useProgram, useStartProgramDay } from "@/hooks/use-program";
import { WEEKDAYS } from "@/lib/program";
import { useI18n, useT } from "@/lib/i18n";
import {
  computeStreak,
  levelFromXp,
  monthGrid,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const t = useT();
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <LoadingPage />;
  if (error)
    return <p className="py-20 text-center text-destructive">{t("Erro ao carregar seus dados.")}</p>;

  if (!data?.profile) return <p className="py-20 text-center">{t("Perfil não encontrado.")}</p>;

  return <Dashboard data={data} />;
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
  const { lang } = useI18n();
  const { data: extras } = useExtras();
  const { data: titles } = useTitles();
  const [titlesOpen, setTitlesOpen] = useState(false);
  const profile = data.profile;
  if (!profile) throw new Error("Perfil não encontrado.");
  const level = levelFromXp(profile.xp);
  const shown = displayTitle(level.level, profile.xp, profile.id ?? null, titles?.equipped ?? null);
  const title = shown.progression;
  const dates = useMemo(() => data.workouts.map((w) => w.date), [data.workouts]);
  const streak = computeStreak(dates);
  const now = new Date();
  const cells = useMemo(() => monthGrid(now.getFullYear(), now.getMonth()), [now]);
  const today = todayISO();
  const doneSet = new Set(dates);
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
  const hasPersonalizedProgram = !!programData?.program?.active;

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
        letter: (lang === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["D", "S", "T", "Q", "Q", "S", "S"])[d.getDay()]!,
        done: doneSet.has(iso),
        isToday: iso === today,
      };
    });
  }, [doneSet, today, lang]);

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
              <Glyph value={todayProgramDay ? todayProgramDay.exercises[0]?.emoji : "mobility"} size={30} />
            </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {doneToday ? t("Treino de hoje concluído") : t("Treino de hoje")}
              {hasPersonalizedProgram ? t(" · programa IA") : ""}
            </p>
            <p className="truncate text-lg font-bold">
              {todayProgramDay ? todayProgramDay.title : hasPersonalizedProgram ? "Dia de descanso" : "Crie seu programa"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {todayProgramDay
                ? t("{focus} · {min} min · {n} exercícios", {
                    focus: todayProgramDay.focus,
                    min: todayProgramDay.minutes,
                    n: todayProgramDay.exercises.length,
                  })
                : hasPersonalizedProgram
                  ? "Seu programa personalizado não tem treino marcado para hoje."
: "Complete sua avaliação para montar seu programa."}
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
              ? t("Preparando…")
              : doneToday
                ? t("Treinar de novo")
                : t("Iniciar treino")}
          </button>
        ) : hasPersonalizedProgram ? (
          <Link
            to="/app/treinos"
            className="press flex items-center justify-center gap-2 bg-primary py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground"
          >
            Ver meu programa
          </Link>
        ) : (
          <Link
            to="/app/treinos"
            className="press flex items-center justify-center gap-2 bg-primary py-4 text-base font-extrabold uppercase tracking-wide text-primary-foreground"
          >
            <Play className="size-5 fill-current" />
            Criar meu programa
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          value={<CountUp value={weekVolume} />}
          label={t("volume semanal")}
          hint={t("kg levantados")}
          delay={0}
        />
        <StatCard
          icon={Timer}
          value={`${Math.round(totals.min / 60)}h`}
          label={t("tempo treinado")}
          hint={t("média {n} min", { n: totals.avg })}
          delay={60}
        />
        <StatCard
          icon={Zap}
          value={<CountUp value={totals.cal} />}
          label={t("kcal queimadas")}
          hint={t("{n} treinos na semana", { n: totals.week })}
          delay={120}
        />
        <StatCard
          icon={Flame}
          value={weightDelta === null ? "—" : `${weightDelta > 0 ? "+" : ""}${weightDelta}kg`}
          label={t("evolução peso")}
          hint={
            data.weights.length
              ? t("atual {n} kg", { n: data.weights[data.weights.length - 1]!.weight_kg })
              : t("sem registros")
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
              {t("Último treino")}
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
          {
            to: "/app/nutricao",
            icon: Apple,
            title: t("Nutrição"),
            d: t("Calorias, macros e água"),
          },
          {
            to: "/app/shape",
            icon: Camera,
            title: t("Shape Tracker"),
            d: t("Fotos analisadas pela IA"),
          },
          {
            to: "/app/conquistas",
            icon: Trophy,
            title: t("Conquistas"),
            d: t("{n} medalhas · missões", { n: medals }),
          },
          {
            to: "/app/coach",
            icon: Bot,
            title: t("Coach IA"),
            d: t("Treino sob medida agora"),
          },
        ].map((q, i) => (
          <Link
            key={q.to}
            to={q.to}
            className="press card stagger flex items-center gap-3 p-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <q.icon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{q.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{q.d}</p>
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

