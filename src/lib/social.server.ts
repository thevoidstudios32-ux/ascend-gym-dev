import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { askCoach } from "@/lib/coach.server";
import { broRank, broScore } from "@/lib/social";

type DB = SupabaseClient<Database>;

const day = 86400000;

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildSocialSnapshot(supabase: DB, userId: string) {
  const [meRes, friendsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ]);

  const links = friendsRes.data ?? [];
  const accepted = links.filter((l) => l.status === "accepted");
  const broIds = accepted.map((l) => (l.requester_id === userId ? l.addressee_id : l.requester_id));
  const incoming = links.filter((l) => l.status === "pending" && l.addressee_id === userId);
  const outgoing = links.filter((l) => l.status === "pending" && l.requester_id === userId);
  const circle = [userId, ...broIds];
  const pendingIds = [...incoming, ...outgoing].map((l) =>
    l.requester_id === userId ? l.addressee_id : l.requester_id,
  );

  const [postsRes, profilesRes, myChallengesRes] = await Promise.all([
    supabase
      .from("posts")
      .select("*")
      .in("user_id", circle)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("profiles")
      .select("id,name,username,avatar_url,bio,gym,goal,xp,weight_kg,height_cm,training_since")
      .in("id", [...circle, ...pendingIds]),
    supabase.from("challenge_participants").select("challenge_id").eq("user_id", userId),
  ]);

  const posts = postsRes.data ?? [];
  const postIds = posts.map((p) => p.id);

  const challengeIds = (myChallengesRes.data ?? []).map((c) => c.challenge_id);
  const [reactionsRes, commentsRes, dmsRes, challengesRes, participantsRes, weekPostsRes] =
    await Promise.all([
      postIds.length
        ? supabase.from("post_reactions").select("*").in("post_id", postIds)
        : Promise.resolve({ data: [] as never[] }),
      postIds.length
        ? supabase.from("post_comments").select("*").in("post_id", postIds).order("created_at")
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("direct_messages")
        .select("id,sender_id,recipient_id,content,created_at,read_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200),
      challengeIds.length
        ? supabase.from("challenges").select("*").in("id", challengeIds)
        : Promise.resolve({ data: [] as never[] }),
      challengeIds.length
        ? supabase.from("challenge_participants").select("*").in("challenge_id", challengeIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("posts")
        .select("user_id,kind,created_at")
        .in("user_id", circle)
        .gte("created_at", new Date(Date.now() - 30 * day).toISOString()),
    ]);

  const profiles = profilesRes.data ?? [];
  const weekPosts = weekPostsRes.data ?? [];
  const since7 = Date.now() - 7 * day;
  const todayStr = iso(new Date());

  const ranking = circle
    .map((id) => {
      const mine = weekPosts.filter((p) => p.user_id === id);
      const workouts = mine.filter(
        (p) => p.kind === "workout" && new Date(p.created_at).getTime() > since7,
      ).length;
      const prs = mine.filter((p) => p.kind === "pr" && new Date(p.created_at).getTime() > since7).length;
      const profile = profiles.find((p) => p.id === id);
      const score = broScore({ xp: profile?.xp ?? 0, workouts, achievements: prs, challenges: 0 });
      return { userId: id, workouts, prs, score, rank: broRank(score) };
    })
    .sort((a, b) => b.workouts - a.workouts || b.score - a.score);

  const trainedToday = circle.filter((id) =>
    weekPosts.some(
      (p) => p.user_id === id && p.kind === "workout" && p.created_at.slice(0, 10) === todayStr,
    ),
  );

  const challenges = (challengesRes.data ?? []).map((c) => {
    const parts = (participantsRes.data ?? []).filter((p) => p.challenge_id === c.id);
    const board = parts
      .map((p) => {
        const count = weekPosts.filter(
          (w) =>
            w.user_id === p.user_id &&
            (c.metric === "prs" ? w.kind === "pr" : w.kind === "workout") &&
            w.created_at.slice(0, 10) >= c.starts_on &&
            w.created_at.slice(0, 10) <= c.ends_on,
        ).length;
        return { userId: p.user_id, score: count };
      })
      .sort((a, b) => b.score - a.score);
    return { ...c, board };
  });

  const dms = dmsRes.data ?? [];
  const threads = broIds.map((id) => {
    const msgs = dms.filter((m) => m.sender_id === id || m.recipient_id === id);
    const last = msgs[0] ?? null;
    const unread = msgs.filter((m) => m.recipient_id === userId && !m.read_at).length;
    return { broId: id, last, unread };
  });

  return {
    me: meRes.data,
    profiles,
    bros: broIds,
    incoming,
    outgoing,
    posts,
    reactions: reactionsRes.data ?? [],
    comments: commentsRes.data ?? [],
    ranking,
    trainedToday,
    challenges,
    threads,
  };
}

export async function generateNudges(supabase: DB, userId: string) {
  const snap = await buildSocialSnapshot(supabase, userId);
  const names = new Map(snap.profiles.map((p) => [p.id, p.name] as const));
  const summary = [
    `Usuário: ${snap.me?.name ?? "Atleta"} (${snap.me?.xp ?? 0} XP)`,
    `Gym Bros: ${snap.bros.map((b) => names.get(b) ?? "bro").join(", ") || "nenhum ainda"}`,
    `Treinaram hoje: ${snap.trainedToday.map((b) => names.get(b) ?? "bro").join(", ") || "ninguém"}`,
    `Ranking semanal: ${snap.ranking
      .map((r) => `${names.get(r.userId) ?? "bro"} ${r.workouts} treinos`)
      .join(" | ")}`,
    `Pedidos de amizade pendentes: ${snap.incoming.length}`,
  ].join("\n");

  const reply = await askCoach(
    [
      {
        role: "user",
        content:
          "Gere no máximo 3 notificações curtas (máx 90 caracteres cada) para a aba social Gym Bros. " +
          "Use tom motivador e provocativo entre amigos, em português. " +
          "Responda apenas com as 3 linhas, uma por linha, sem numeração e sem markdown.",
      },
    ],
    summary,
  );

  return reply
    .split("\n")
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 3);
}
