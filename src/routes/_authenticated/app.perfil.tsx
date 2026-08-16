import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useHasStory } from "@/hooks/use-story-ring";

import { toast } from "sonner";
import { Camera, Shield, Sparkles } from "lucide-react";
import { CountUp, LoadingPage, ProgressBar, StatCard } from "@/components/ui-kit";
import { ProfileCustomizer } from "@/components/profile-customizer";
import { bannerById } from "@/lib/banners";
import { TitleBadge } from "@/components/title-badge";
import { displayTitle } from "@/lib/titles";
import { TitleSelector } from "@/components/title-selector";
import { useTitles } from "@/hooks/use-titles";
import { useBanners } from "@/hooks/use-banners";
import { useAdminStatus } from "@/hooks/use-admin";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { saveProfile } from "@/lib/ascend.functions";
import { bmi, computeStreak, EXPERIENCES, GOALS, levelFromXp } from "@/lib/ascend";

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
  const { data: adminStatus } = useAdminStatus();
  const isAdmin = adminStatus?.isAdmin === true;
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const save = useServerFn(saveProfile);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const p = data?.profile;
  const [customizing, setCustomizing] = useState(false);
  const [titlesOpen, setTitlesOpen] = useState(false);
  const { data: titles } = useTitles();
  const { data: bannersData } = useBanners();
  const hasStory = useHasStory(p?.id ?? null);




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
  const shown = displayTitle(level.level, p.xp, p.id ?? null, titles?.equipped ?? null);
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
  const banner =
    bannersData?.banners.find((b) => b.id === p.banner_id) ?? bannerById(p.banner_id);

  return (
    <div className="animate-rise space-y-5">
      <section className="card overflow-hidden">
        {/* Banner imersivo: cobre o cabeçalho e desce até a base do avatar. */}
        <div className="relative h-52 w-full sm:h-64 lg:h-72">
          <img
            src={banner.url}
            alt={`Banner ${banner.name}`}
            className="size-full object-cover"
            style={{ objectPosition: banner.position ?? "center 45%" }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />

          {/* Avatar sobreposto, ancorado na base do banner. */}
          <div className="absolute inset-x-0 bottom-0 translate-y-1/2 px-5">
            <button
              onClick={() => setCustomizing(true)}
              className="press relative grid size-24 place-items-center overflow-hidden rounded-full border-4 border-card bg-primary text-3xl font-extrabold text-primary-foreground shadow-glow"
              aria-label="Alterar foto de perfil"
            >
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className="size-full object-cover" />
              ) : (
                initials
              )}
              {hasStory && <i aria-hidden className="avatar-sweep" />}
              <span className="absolute bottom-0 inset-x-0 grid place-items-center bg-black/60 py-1">
                <Camera className="size-3.5 text-white" />
              </span>
            </button>
          </div>

          <button
            onClick={() => setCustomizing(true)}
            className="press absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white backdrop-blur-md"
          >
            <Sparkles className="size-3.5" /> Personalizar perfil
          </button>
        </div>

        <div className="px-5 pb-5 pt-16">
          <h1 className="mt-1 truncate text-display text-4xl">{p.name}</h1>
          <p className="text-sm text-muted-foreground">
            {p.goal} · {p.experience}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TitleBadge visual={titles?.equippedVisual ?? shown.visual} size="md" onClick={() => setTitlesOpen(true)} />
            <TitleSelector
              open={titlesOpen}
              onClose={() => setTitlesOpen(false)}
              userId={p.id ?? null}
              owned={(titles?.owned ?? []).map((t) => t.id)}
              equipped={titles?.equipped ?? null}
            />
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


      <ProfileCustomizer
        open={customizing}
        onClose={() => setCustomizing(false)}
        currentAvatar={p.avatar_url ?? null}
        currentBanner={p.banner_id ?? null}
        userId={p.id ?? null}

        stats={{
          level: level.level,
          workouts: data?.workouts.length ?? 0,
          medals: medals,
          xp: p.xp,
        }}
        onSaved={refresh}
      />

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

      {isAdmin ? (
        <Link
          to="/admin"
          className="press flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-bold uppercase tracking-wider text-primary"
        >
          <Shield className="size-4" /> Admin Panel
        </Link>
      ) : null}

      <button
        onClick={signOut}
        className="w-full rounded-full border border-border py-3 text-sm font-bold text-muted-foreground"
      >
        Sair da conta
      </button>
    </div>
  );
}
