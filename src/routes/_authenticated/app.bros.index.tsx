import { AscendIcon, Glyph } from "@/components/ascend-icon";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { BroAvatar, BroIdentity, RankBadge } from "@/components/bro";
import { StoriesRow } from "@/components/stories";
import { useNudges, useSocial, useSocialAction } from "@/hooks/use-social";
import {
  addComment,
  createChallenge,
  createPost,
  deletePost,
  removeBro,
  requestBro,
  respondBro,
  searchBros,
  toggleReaction,
} from "@/lib/social.functions";
import { CHALLENGE_METRICS, POST_KINDS, REACTIONS, timeAgo } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/app/bros/")({
  head: () => ({
    meta: [
      { title: "Gym Bros · ASCEND" },
      {
        name: "description",
        content: "Sua comunidade fitness: feed de treinos, fist bumps, desafios e ranking semanal.",
      },
      { property: "og:title", content: "Gym Bros · ASCEND" },
      { property: "og:description", content: "Comunidade fitness dentro do ASCEND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrosPage,
});

type Tab = "feed" | "bros" | "ranking" | "desafios";

const TABS: { id: Tab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "bros", label: "Bros" },
  { id: "ranking", label: "Ranking" },
  { id: "desafios", label: "Desafios" },
];

function BrosPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const { data, isLoading } = useSocial();
  const { data: nudges } = useNudges(Boolean(data));

  const profileOf = useMemo(() => {
    const map = new Map((data?.profiles ?? []).map((p) => [p.id, p] as const));
    return (id: string) => map.get(id);
  }, [data]);

  return (
    <div className="animate-rise space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-display text-4xl">GYM BROS</h1>
          <p className="text-sm text-muted-foreground">
            {data?.bros.length ?? 0} bros · {data?.trainedToday.length ?? 0} treinaram hoje
          </p>
        </div>
        {data?.me ? <RankBadge xp={data.me.xp} /> : null}
      </header>

      {nudges?.length ? (
        <section className="glass space-y-2 p-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" /> Coach IA da comunidade
          </p>
          {nudges.map((n) => (
            <p key={n} className="text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </section>
      ) : null}

      <div className="flex gap-1 rounded-2xl bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`press flex-1 rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando comunidade…</p> : null}

      {tab === "feed" && data ? <FeedTab data={data} profileOf={profileOf} /> : null}
      {tab === "bros" && data ? <BrosTab data={data} profileOf={profileOf} /> : null}
      {tab === "ranking" && data ? <RankingTab data={data} profileOf={profileOf} /> : null}
      {tab === "desafios" && data ? <ChallengesTab data={data} profileOf={profileOf} /> : null}
    </div>
  );
}

type Social = NonNullable<ReturnType<typeof useSocial>["data"]>;
type Lookup = (id: string) => Social["profiles"][number] | undefined;

/* ------------------------------- FEED ------------------------------- */

function FeedTab({ data, profileOf }: { data: Social; profileOf: Lookup }) {
  const [text, setText] = useState("");
  const post = useSocialAction(useServerFn(createPost));
  const remove = useSocialAction(useServerFn(deletePost));

  return (
    <div className="space-y-4">
      <StoriesRow />
      <section className="panel p-4">
        <div className="flex gap-3">
          <BroAvatar profile={data.me ?? undefined} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Compartilhe o treino, uma meta ou provoque a galera…"
            className="min-h-[52px] flex-1 resize-none rounded-xl bg-elevated p-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            disabled={!text.trim() || post.isPending}
            onClick={() =>
              post.mutate(
                { kind: "text", content: text.trim() },
                { onSuccess: () => setText("") },
              )
            }
            className="press flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-40"
          >
            <Send className="size-4" /> Publicar
          </button>
        </div>
      </section>

      {data.trainedToday.length ? (
        <section className="panel p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Treinaram hoje
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {data.trainedToday.map((id) => (
              <Link
                key={id}
                to="/app/bros/$id"
                params={{ id }}
                className="press flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <BroAvatar profile={profileOf(id)} ring />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {profileOf(id)?.name ?? "Bro"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {data.posts.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted-foreground">
          Feed vazio. Adicione bros na aba “Bros” e o mural ganha vida.
        </p>
      ) : null}

      {data.posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          data={data}
          profileOf={profileOf}
          onDelete={p.user_id === data.me?.id ? () => remove.mutate({ id: p.id }) : undefined}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  data,
  profileOf,
  onDelete,
}: {
  post: Social["posts"][number];
  data: Social;
  profileOf: Lookup;
  onDelete?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const react = useSocialAction(useServerFn(toggleReaction));
  const send = useSocialAction(useServerFn(addComment));
  const kind = POST_KINDS[post.kind] ?? POST_KINDS['text']!;
  const comments = data.comments.filter((c) => c.post_id === post.id);
  const reactions = data.reactions.filter((r) => r.post_id === post.id);

  return (
    <article className="panel space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <BroIdentity profile={profileOf(post.user_id)} subtitle={`${kind.label} · ${timeAgo(post.created_at)}`} />
        {onDelete ? (
          <button onClick={onDelete} className="press text-muted-foreground" aria-label="Excluir publicação">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <p className="text-sm leading-relaxed">
        <Glyph value={kind.icon} size={14} className="mr-1.5" fallback="spark" />
        {post.content}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {REACTIONS.map((r) => {
          const list = reactions.filter((x) => x.emoji === r.emoji);
          const mine = list.some((x) => x.user_id === data.me?.id);
          return (
            <button
              key={r.emoji}
              title={r.label}
              onClick={() => react.mutate({ postId: post.id, emoji: r.emoji })}
              className={`press rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                mine ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
              }`}
            >
              <Glyph value={r.icon} size={15} className="mr-1" fallback="pr" />{list.length || ""}
            </button>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className="press ml-auto flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
        >
          <MessageCircle className="size-4" /> {comments.length}
        </button>
      </div>

      {open ? (
        <div className="space-y-2 border-t border-border pt-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <BroAvatar profile={profileOf(c.user_id)} size="sm" />
              <p className="flex-1 rounded-xl bg-elevated p-2.5 text-sm">
                <span className="font-bold">{profileOf(c.user_id)?.name ?? "Bro"} </span>
                {c.content}
              </p>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comente algo…"
              className="flex-1 rounded-xl bg-elevated px-3 py-2 text-sm outline-none"
            />
            <button
              disabled={!comment.trim()}
              onClick={() =>
                send.mutate(
                  { postId: post.id, content: comment.trim() },
                  { onSuccess: () => setComment("") },
                )
              }
              className="press rounded-xl bg-primary px-3 text-primary-foreground disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* ------------------------------- BROS ------------------------------- */

function BrosTab({ data, profileOf }: { data: Social; profileOf: Lookup }) {
  const [q, setQ] = useState("");
  const search = useServerFn(searchBros);
  const find = useMutation({ mutationFn: (query: string) => search({ data: { q: query } }) });
  const ask = useSocialAction(useServerFn(requestBro));
  const respond = useSocialAction(useServerFn(respondBro));
  const drop = useSocialAction(useServerFn(removeBro));

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-elevated px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && find.mutate(q)}
              placeholder="Buscar por @username ou nome"
              className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => find.mutate(q)}
            className="press rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground"
          >
            Buscar
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {find.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atleta encontrado.</p>
          ) : null}
          {(find.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
              <BroIdentity profile={p} />
              <button
                onClick={() =>
                  ask.mutate({ userId: p.id }, { onSuccess: () => toast.success("Convite enviado!") })
                }
                className="press ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                <UserPlus className="size-3.5" /> Add
              </button>
            </div>
          ))}
        </div>
      </section>

      {data.incoming.length ? (
        <section className="panel p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Pedidos recebidos</p>
          <div className="mt-3 space-y-2">
            {data.incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
                <BroIdentity profile={profileOf(f.requester_id)} />
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => respond.mutate({ id: f.id, accept: true })}
                    className="press rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => respond.mutate({ id: f.id, accept: false })}
                    className="press rounded-xl bg-surface px-3 py-2 text-xs font-bold text-muted-foreground"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          Meus Gym Bros
        </p>
        {data.bros.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Você ainda não tem bros. Busque pelo @username e mande o convite.
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {data.bros.map((id) => {
            const thread = data.threads.find((t) => t.broId === id);
            const link = [...data.incoming, ...data.outgoing];
            void link;
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
                <BroIdentity profile={profileOf(id)} />
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    to="/app/bros/chat/$id"
                    params={{ id }}
                    className="press relative rounded-xl bg-surface p-2 text-muted-foreground"
                    aria-label="Abrir conversa"
                  >
                    <MessageCircle className="size-4" />
                    {thread?.unread ? (
                      <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-extrabold text-primary-foreground">
                        {thread.unread}
                      </span>
                    ) : null}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {data.outgoing.length ? (
        <section className="panel p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Convites enviados
          </p>
          <div className="mt-3 space-y-2">
            {data.outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
                <BroIdentity profile={profileOf(f.addressee_id)} subtitle="aguardando resposta" />
                <button
                  onClick={() => drop.mutate({ id: f.id })}
                  className="press ml-auto text-xs font-bold text-muted-foreground"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------ RANKING ------------------------------ */

function RankingTab({ data, profileOf }: { data: Social; profileOf: Lookup }) {
  const medals = [1, 2, 3];
  return (
    <section className="panel p-4">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        <Trophy className="size-3.5 text-primary" /> Ranking da semana
      </p>
      <div className="mt-3 space-y-2">
        {data.ranking.map((r, i) => (
          <div
            key={r.userId}
            className={`flex items-center gap-3 rounded-xl p-3 ${
              r.userId === data.me?.id ? "ember-border bg-primary/10" : "bg-elevated"
            }`}
          >
            <span className="flex w-6 justify-center text-center text-sm font-black">{medals[i] ? <AscendIcon name="medal" size={18} /> : i + 1}</span>
            <BroIdentity
              profile={profileOf(r.userId)}
              subtitle={`${r.workouts} treinos · ${r.prs} PRs`}
            />
            <span className="ml-auto text-right">
              <span className="block text-sm font-extrabold text-primary">{r.score}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{r.rank.name}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- DESAFIOS ----------------------------- */

function ChallengesTab({ data, profileOf }: { data: Social; profileOf: Lookup }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Quem treina mais essa semana");
  const [metric, setMetric] = useState<string>("workouts");
  const [days, setDays] = useState(7);
  const [invitees, setInvitees] = useState<string[]>([]);
  const create = useSocialAction(useServerFn(createChallenge));

  return (
    <div className="space-y-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
      >
        <Plus className="size-4" /> Criar desafio
      </button>

      {open ? (
        <section className="panel space-y-3 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none"
            placeholder="Nome do desafio"
          />
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none"
          >
            {CHALLENGE_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Duração: {days} dias
            <input
              type="range"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {data.bros.map((id) => {
              const on = invitees.includes(id);
              return (
                <button
                  key={id}
                  onClick={() =>
                    setInvitees((v) => (on ? v.filter((x) => x !== id) : [...v, id]))
                  }
                  className={`press rounded-full px-3 py-1.5 text-xs font-bold ${
                    on ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
                  }`}
                >
                  {profileOf(id)?.name ?? "Bro"}
                </button>
              );
            })}
          </div>
          <button
            disabled={create.isPending || !title.trim()}
            onClick={() =>
              create.mutate(
                { title: title.trim(), metric, days, invitees },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setInvitees([]);
                    toast.success("Desafio criado!");
                  },
                },
              )
            }
            className="press w-full rounded-xl bg-primary py-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
          >
            Lançar desafio
          </button>
        </section>
      ) : null}

      {data.challenges.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted-foreground">
          Nenhum desafio ativo. Crie um e chame os bros.
        </p>
      ) : null}

      {data.challenges.map((c) => (
        <section key={c.id} className="panel p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold">{c.title}</h3>
              <p className="text-xs text-muted-foreground">
                até {new Date(c.ends_on).toLocaleDateString("pt-BR")} ·{" "}
                {CHALLENGE_METRICS.find((m) => m.id === c.metric)?.label ?? c.metric}
              </p>
            </div>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            {c.board.map((b, i) => (
              <div key={b.userId} className="flex items-center gap-3 rounded-xl bg-elevated p-2.5">
                <span className="w-5 text-center text-sm font-extrabold text-muted-foreground">{i + 1}</span>
                <BroAvatar profile={profileOf(b.userId)} size="sm" />
                <span className="truncate text-sm font-bold">{profileOf(b.userId)?.name ?? "Bro"}</span>
                <span className="ml-auto text-sm font-extrabold text-primary">{b.score}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
