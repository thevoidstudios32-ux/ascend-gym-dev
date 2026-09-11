import { AscendIcon, Glyph, RankCrest } from "@/components/ascend-icon";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Confetti, PageHeader, ProgressBar } from "@/components/ui-kit";
import { useDashboard, useExtras } from "@/hooks/use-dashboard";
import {
  ACHIEVEMENTS,
  computeStreak,
  levelFromXp,
  titleFromLevel,
  TITLES,
  todayISO,
  waterTarget,
  WEEKLY_CHALLENGES,
} from "@/lib/ascend";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/app/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas · ASCEND" },
      { name: "description", content: "Medalhas, missões diárias e desafios semanais do seu treino." },
      { property: "og:title", content: "Conquistas · ASCEND" },
      { property: "og:description", content: "Medalhas, missões e desafios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConquistasPage,
});

function ConquistasPage() {
  const { data } = useDashboard();
  const tr = useT();
  const { data: extras } = useExtras();
  const owned = new Set(extras?.achievements ?? []);
  const today = todayISO();
  const level = levelFromXp(data?.profile?.xp ?? 0);
  const streak = computeStreak((data?.workouts ?? []).map((w) => w.date));

  const missions = useMemo(() => {
    const water = extras?.water.find((w) => w.date === today)?.ml ?? 0;
    const target = waterTarget(data?.profile?.weight_kg ? Number(data.profile.weight_kg) : null);
    return [
      { id: "m1", label: tr("Concluir o treino de hoje"), xp: 120, done: (data?.workouts ?? []).some((w) => w.date === today) },
      { id: "m2", label: tr("Bater a meta de água"), xp: 60, done: water >= target },
      { id: "m3", label: tr("Registrar uma refeição"), xp: 40, done: (extras?.meals.length ?? 0) > 0 },
      { id: "m4", label: tr("Manter a sequência viva"), xp: 80, done: streak > 0 },
    ];
  }, [data, extras, streak, today, tr]);

  const weekWorkouts = (data?.workouts ?? []).filter(
    (w) => new Date(w.date).getTime() > Date.now() - 7 * 86400000,
  ).length;
  const weekWater = (extras?.water ?? []).filter((w) => w.ml >= 1500).length;
  const weekPr = (data?.records ?? []).filter(
    (r) => new Date(r.achieved_on).getTime() > Date.now() - 7 * 86400000,
  ).length;
  const progressOf = (id: string) => (id === "w4" ? weekWorkouts : id === "w_water" ? weekWater : weekPr);

  const title = titleFromLevel(level.level, data?.profile?.xp ?? 0);
  const [celebrate, setCelebrate] = useState(false);
  const prevMedals = useRef<number | null>(null);
  useEffect(() => {
    if (prevMedals.current === null || owned.size <= prevMedals.current) {
      prevMedals.current = owned.size;
      return undefined;
    }
    prevMedals.current = owned.size;
    setCelebrate(true);
    const t = setTimeout(() => setCelebrate(false), 2800);
    return () => clearTimeout(t);
  }, [owned.size]);


  return (
    <div className="animate-rise space-y-4">
      <Confetti fire={celebrate} />
      <PageHeader
        title="CONQUISTAS"
        subtitle={`Nível ${level.level} · ${owned.size}/${ACHIEVEMENTS.length} medalhas`}
      />

      <section className="glass animate-pop p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Título atual
            </p>
            <p className="text-display text-3xl" style={{ color: title.color }}>
              <Glyph value={title.emoji} size={24} className="mr-2" fallback="crown" />{title.name}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-elevated px-3 py-1 text-xs font-bold">
            {streak} <AscendIcon name="streak" size={13} className="ml-1" />
          </span>
        </div>
        <ProgressBar value={title.pct} className="mt-4" tone="gold" />
        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>
            {title.next
              ? `Faltam ${title.xpToNext} XP (${title.levelsToNext} ${title.levelsToNext === 1 ? "nível" : "níveis"}) para ${title.next.name}`
              : "Título máximo alcançado — você é Lenda"}
          </span>
          <span className="shrink-0 text-foreground">{title.pct}%</span>
        </div>
        <div className="mt-3 flex justify-between gap-1 text-center">
          {TITLES.map((t, i) => (
            <div key={t.name} className={`flex-1 ${i <= title.index ? "" : "opacity-35"}`}>
              <p className="flex justify-center"><RankCrest index={i} size={20} /></p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                {t.name}
              </p>
              <p className="text-[9px] text-muted-foreground">Nv {t.min}</p>
            </div>
          ))}
        </div>

      </section>


      <section className="panel p-5">
        <h2 className="font-bold">Missões de hoje</h2>
        <div className="mt-3 space-y-2">
          {missions.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  m.done ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
                }`}
              >
                {m.done ? "✓" : ""}
              </span>
              <p className={`flex-1 text-sm ${m.done ? "text-muted-foreground line-through" : ""}`}>{m.label}</p>
              <span className="text-xs font-extrabold text-primary">+{m.xp} XP</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Desafios da semana</h2>
        <div className="mt-3 space-y-3">
          {WEEKLY_CHALLENGES.map((c) => {
            const p = Math.min(100, (progressOf(c.id) / c.target) * 100);
            return (
              <div key={c.id}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{c.label}</span>
                  <span className="text-muted-foreground">
                    {progressOf(c.id)}/{c.target} · +{c.xp} XP
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const has = owned.has(a.code);
          return (
            <div
              key={a.code}
              className={`panel p-4 text-center ${has ? "" : "opacity-40 grayscale"}`}
              title={a.desc}
            >
              <p className="flex justify-center"><Glyph value={a.emoji} size={30} fallback="medal" /></p>
              <p className="mt-1 text-xs font-bold">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
