import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, UserPlus } from "lucide-react";
import { BroAvatar, RankBadge } from "@/components/bro";
import { useSocial, useSocialAction } from "@/hooks/use-social";
import {
  GOAL_LABELS,
  POST_KINDS,
  broRank,
  handleOf,
  timeAgo,
  trainingTime,
} from "@/lib/social";
import { requestBro, updateSocialProfile } from "@/lib/social.functions";
import { Glyph } from "@/components/ascend-icon";

export const Route = createFileRoute("/_authenticated/app/bros/$id")({
  head: () => ({
    meta: [
      { title: "Perfil de Gym Bro · ASCEND" },
      { name: "description", content: "Perfil social do atleta: nível, streak, academia e evolução." },
      { property: "og:title", content: "Perfil de Gym Bro · ASCEND" },
      { property: "og:description", content: "Perfil social do atleta no ASCEND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BroProfilePage,
});

function BroProfilePage() {
  const { id } = Route.useParams();
  const { data } = useSocial();
  const profile = data?.profiles.find((p) => p.id === id);
  const isMe = data?.me?.id === id;
  const isBro = data?.bros.includes(id) ?? false;
  const ask = useSocialAction(useServerFn(requestBro));

  const posts = (data?.posts ?? []).filter((p) => p.user_id === id);
  const workouts = posts.filter((p) => p.kind === "workout").length;
  const prs = posts.filter((p) => p.kind === "pr").length;
  const rank = broRank(profile?.xp ?? 0);

  return (
    <div className="animate-rise space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/app/bros" className="press rounded-xl bg-surface p-2" aria-label="Voltar">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-display text-3xl">PERFIL</h1>
      </div>

      <section className="glass space-y-4 p-5">
        <div className="flex items-center gap-4">
          <BroAvatar profile={profile} size="lg" ring />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{profile?.name ?? "Gym Bro"}</h2>
            <p className="text-sm text-muted-foreground">
              {handleOf({ username: profile?.username ?? null, name: profile?.name ?? "bro" })}
            </p>
            <div className="mt-2">
              <RankBadge xp={profile?.xp ?? 0} />
            </div>
          </div>
        </div>

        {profile?.bio ? <p className="text-sm text-muted-foreground">{profile.bio}</p> : null}

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Academia" value={profile?.gym ?? "—"} />
          <Stat label="Objetivo" value={GOAL_LABELS[profile?.goal ?? ""] ?? profile?.goal ?? "—"} />
          <Stat label="Treinando há" value={trainingTime(profile?.training_since ?? null)} />
          <Stat label="XP" value={String(profile?.xp ?? 0)} />
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{rank.name}</span>
            <span>{rank.next ? `${rank.pct}% para ${rank.next.name}` : "rank máximo"}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-elevated">
            <div className="h-full rounded-full bg-primary" style={{ width: `${rank.pct}%` }} />
          </div>
        </div>

        {!isMe ? (
          <div className="flex gap-2">
            {isBro ? (
              <Link
                to="/app/bros/chat/$id"
                params={{ id }}
                className="press flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                <MessageCircle className="size-4" /> Conversar
              </Link>
            ) : (
              <button
                onClick={() => ask.mutate({ userId: id }, { onSuccess: () => toast.success("Convite enviado!") })}
                className="press flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                <UserPlus className="size-4" /> Adicionar Gym Bro
              </button>
            )}
          </div>
        ) : null}
      </section>

      {isMe ? <EditSocialProfile profile={profile} /> : null}

      <section className="panel p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Atividade · {workouts} treinos · {prs} PRs
        </p>
        <div className="mt-3 space-y-2">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
          ) : null}
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-elevated p-3 text-sm">
              <span className="mr-1"><Glyph value={(POST_KINDS[p.kind] ?? POST_KINDS['text']!).icon} size={14} fallback="spark" /></span>
              {p.content}
              <span className="ml-2 text-xs text-muted-foreground">{timeAgo(p.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-elevated p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-bold">{value}</p>
    </div>
  );
}

type MeProfile = NonNullable<ReturnType<typeof useSocial>["data"]>["profiles"][number] | undefined;

function EditSocialProfile({ profile }: { profile: MeProfile }) {
  const save = useSocialAction(useServerFn(updateSocialProfile));
  const [form, setForm] = useState({
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    gym: profile?.gym ?? "",
    avatar_url: profile?.avatar_url ?? "",
    training_since: profile?.training_since ?? "",
  });

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
    className: "w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none",
  });

  return (
    <section className="panel space-y-3 p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        Editar perfil social
      </p>
      <input placeholder="@username (minúsculas)" {...field("username")} />
      <textarea rows={2} placeholder="Bio" {...field("bio")} />
      <input placeholder="Academia" {...field("gym")} />
      <input placeholder="URL da foto de perfil" {...field("avatar_url")} />
      <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">
        Treina desde
        <input type="date" {...field("training_since")} />
      </label>
      <button
        disabled={save.isPending}
        onClick={() =>
          save.mutate(
            {
              username: form.username.trim().toLowerCase() || null,
              bio: form.bio.trim() || null,
              gym: form.gym.trim() || null,
              avatar_url: form.avatar_url.trim() || null,
              training_since: form.training_since || null,
              is_public: true,
            },
            {
              onSuccess: () => toast.success("Perfil atualizado!"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
            },
          )
        }
        className="press w-full rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
      >
        Salvar perfil social
      </button>
    </section>
  );
}
