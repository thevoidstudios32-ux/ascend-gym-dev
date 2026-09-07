import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, ScrollText, Swords, Trophy, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArenaBattle } from "@/components/arena-battle";
import { ArenaRanking } from "@/components/arena-ranking";
import { StatCard } from "@/components/ui-kit";
import { useArena, useArenaAction } from "@/hooks/use-arena";
import {
  ARENA_CATEGORIES,
  ARENA_RULES,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  XP_PER_WIN,
} from "@/lib/arena";
import { joinBattle, leaveBattle } from "@/lib/arena.functions";
import { CameraCapture } from "@/components/camera-capture";
import { poseOf } from "@/lib/poses";
import { Glyph } from "@/components/ascend-icon";

export const Route = createFileRoute("/_authenticated/app/arena")({
  head: () => ({
    meta: [
      { title: "ASCEND Arena · Shape Battle" },
      {
        name: "description",
        content: "Batalhas de shape 1x1 votadas pela comunidade, com ranking semanal e XP por vitória.",
      },
      { property: "og:title", content: "ASCEND Arena · Shape Battle" },
      { property: "og:description", content: "Vote, participe e suba no ranking de shape do ASCEND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ArenaPage,
});

const TABS = [
  { id: "votar", label: "Votar", icon: Swords },
  { id: "participar", label: "Participar", icon: Camera },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "regras", label: "Regras", icon: ScrollText },
] as const;

function ArenaPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("votar");
  const [category, setCategory] = useState<string>("front_double");
  const poseCategory = category === "all" ? "front_double" : category;
  const { data } = useArena();


  return (
    <div className="animate-rise space-y-4">
      <header>
        <h1 className="text-display text-4xl">ASCEND ARENA</h1>
        <p className="text-sm text-muted-foreground">
          Shape Battle: dois atletas, um confronto. A comunidade decide quem está evoluindo mais.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Vitórias" value={String(data?.stats.wins ?? 0)} />
        <StatCard label="Batalhas" value={String(data?.stats.battles ?? 0)} />
        <StatCard label="Aproveitamento" value={`${data?.stats.rate ?? 0}%`} />
        <StatCard label="Melhor posição" value={data?.stats.bestRank ? `#${data.stats.bestRank}` : "—"} />
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`press flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-elevated text-muted-foreground"
            }`}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </nav>

      {tab !== "regras" ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(tab === "votar" ? [{ id: "all", label: "Todas as poses", emoji: "🏟️" }, ...ARENA_CATEGORIES] : ARENA_CATEGORIES).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`press shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                category === c.id
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              <Glyph value={c.emoji} size={14} className="mr-1" fallback="arena" />{c.label}
              {data?.counts[c.id] ? (
                <span className="ml-1 text-[10px] text-muted-foreground">· {data.counts[c.id]}</span>
              ) : c.id === "all" && data?.totalEntries ? (
                <span className="ml-1 text-[10px] text-muted-foreground">· {data.totalEntries}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "votar" ? <ArenaBattle key={category} category={category} /> : null}
      {tab === "participar" ? <JoinPanel category={poseCategory} /> : null}
      {tab === "ranking" ? <ArenaRanking category={poseCategory} myId={data?.me?.id} /> : null}
      {tab === "regras" ? <RulesPanel /> : null}

    </div>
  );
}

function JoinPanel({ category }: { category: string }) {
  const { data } = useArena();
  const join = useArenaAction(useServerFn(joinBattle));
  const leave = useArenaAction(useServerFn(leaveBattle));
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);

  const pose = poseOf(category);
  const active = (data?.entries ?? []).filter((e) => e.status === "active");
  const current = active.find((e) => e.category === category);

  async function upload(file: File) {
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const path = `${auth.user.id}/${category}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("battle-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (error) throw new Error(error.message);
      await join.mutateAsync({ category, path, description: description.trim() || null });
      setDescription("");
      setCamera(false);
      toast.success("Você entrou na Arena!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {camera ? (
        <CameraCapture
          title={pose.label}
          hint={pose.how}
          silhouette={pose.silhouette}
          busy={uploading}
          onClose={() => setCamera(false)}
          onUse={(f) => upload(f)}
        />
      ) : null}

      <section className="panel space-y-3 p-5">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 100 150" className="h-24 shrink-0 text-primary" aria-hidden>
            <path d={pose.silhouette} fill="currentColor" opacity={0.25} />
            <path d={pose.silhouette} fill="none" stroke="currentColor" strokeWidth={1.4} />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              Como fazer a pose
            </p>
            <p className="mt-1 text-sm font-bold">
              <Glyph value={pose.emoji} size={14} className="mr-1" fallback="arena" />{pose.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{pose.how}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pose.criteria.map((c) => (
                <span key={c} className="rounded-full bg-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass space-y-3 p-5">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="Legenda (opcional): 6 meses de bulking…"
          className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none"
        />
        <button
          onClick={() => setCamera(true)}
          disabled={uploading}
          className="press flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          <Camera className="size-4" />
          {uploading ? "Enviando…" : current ? "Refazer minha foto" : "Abrir câmera e posar"}
        </button>
        <label className="press flex cursor-pointer items-center justify-center gap-2 rounded-full bg-elevated py-3 text-xs font-bold text-muted-foreground">
          <Upload className="size-3.5" /> Enviar da galeria
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-center text-[11px] text-muted-foreground">
          Cada vitória vale {XP_PER_WIN} XP. Você pode sair da Arena quando quiser.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {active.map((e) => (
          <div key={e.id} className="card overflow-hidden">
            {data?.urls[e.media_path] ? (
              <img
                src={data.urls[e.media_path]}
                alt={`Minha participação em ${CATEGORY_LABEL[e.category] ?? e.category}`}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-elevated" />
            )}
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  <Glyph value={CATEGORY_EMOJI[e.category]} size={14} className="mr-1" fallback="arena" />{CATEGORY_LABEL[e.category] ?? e.category}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {e.wins}V · {e.losses}D
                </p>
              </div>
              <button
                onClick={() => leave.mutate({ id: e.id })}
                aria-label="Sair da Arena nesta categoria"
                className="press rounded-lg bg-elevated p-1.5 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {active.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            Você ainda não tem participações ativas.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function RulesPanel() {
  return (
    <section className="panel space-y-4 p-5">
      <div>
        <h2 className="font-bold">Como funciona</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos duas fotos da mesma categoria, com atletas de nível e histórico parecidos. A
          comunidade vota e o vencedor ganha XP e sobe no ranking.
        </p>
      </div>
      <ul className="space-y-2">
        {ARENA_RULES.map((r) => (
          <li key={r} className="flex gap-2 rounded-xl bg-elevated p-3 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            {r}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Em breve: batalhas em vídeo com selo de verificação, avaliação por IA, comentários e
        temporadas com recompensas exclusivas.
      </p>
    </section>
  );
}
