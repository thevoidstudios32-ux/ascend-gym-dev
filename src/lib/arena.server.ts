import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  pairScore,
  sinceForRange,
  winRate,
  type ArenaCard,
  type ArenaEntry,
  type ArenaProfileMini,
  type ArenaRange,
  type RankedEntry,
} from "@/lib/arena";

type DB = SupabaseClient<Database>;

const BUCKET = "battle-photos";

export async function signPaths(supabase: DB, paths: string[]) {
  const out: Record<string, string> = {};
  const unique = [...new Set(paths)];
  if (unique.length === 0) return out;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

async function profilesByIds(supabase: DB, ids: string[]) {
  const map = new Map<string, ArenaProfileMini>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id,name,username,avatar_url,xp")
    .in("id", unique);
  for (const p of data ?? []) map.set(p.id, p as ArenaProfileMini);
  return map;
}

function toCards(
  entries: ArenaEntry[],
  profiles: Map<string, ArenaProfileMini>,
  urls: Record<string, string>,
): ArenaCard[] {
  return entries.map((entry) => ({
    entry,
    profile: profiles.get(entry.user_id) ?? null,
    url: urls[entry.media_path] ?? null,
  }));
}

/** Estado geral da Arena para o usuário atual. */
export async function buildArena(supabase: DB, userId: string) {
  const [meRes, mineRes, allRes, myVotesRes] = await Promise.all([
    supabase.from("profiles").select("id,name,username,avatar_url,xp").eq("id", userId).maybeSingle(),
    supabase.from("battle_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("battle_entries").select("*").eq("status", "active").limit(2000),
    supabase.from("battle_votes").select("id,created_at").eq("voter_id", userId),
  ]);

  const mine = (mineRes.data ?? []) as ArenaEntry[];
  const all = (allRes.data ?? []) as ArenaEntry[];
  const urls = await signPaths(supabase, mine.map((e) => e.media_path));

  const wins = mine.reduce((s, e) => s + e.wins, 0);
  const losses = mine.reduce((s, e) => s + e.losses, 0);
  const battles = mine.reduce((s, e) => s + e.battles, 0);
  const bestRank = mine.reduce<number | null>(
    (best, e) => (e.best_rank == null ? best : best == null ? e.best_rank : Math.min(best, e.best_rank)),
    null,
  );

  const counts: Record<string, number> = {};
  for (const e of all) counts[e.category] = (counts[e.category] ?? 0) + 1;

  return {
    me: meRes.data as ArenaProfileMini | null,
    entries: mine,
    urls,
    counts,
    totalEntries: all.length,
    votesCast: myVotesRes.data?.length ?? 0,
    stats: { wins, losses, battles, rate: winRate(wins, battles), bestRank },
  };
}

/** Ranking por categoria/período. Agrega os votos (anônimos) do período. */
export async function buildRanking(
  supabase: DB,
  admin: DB,
  category: string,
  range: ArenaRange,
): Promise<RankedEntry[]> {
  const { data: entriesData } = await supabase
    .from("battle_entries")
    .select("*")
    .eq("status", "active")
    .eq("category", category)
    .limit(1000);
  const entries = (entriesData ?? []) as ArenaEntry[];
  if (entries.length === 0) return [];

  const tally = new Map<string, { wins: number; losses: number }>();
  const since = sinceForRange(range);
  if (since) {
    let query = admin
      .from("battle_votes")
      .select("winner_entry_id,loser_entry_id")
      .eq("category", category)
      .gte("created_at", since)
      .limit(20000);
    const { data: votes } = await query;
    for (const v of votes ?? []) {
      const w = tally.get(v.winner_entry_id) ?? { wins: 0, losses: 0 };
      w.wins += 1;
      tally.set(v.winner_entry_id, w);
      const l = tally.get(v.loser_entry_id) ?? { wins: 0, losses: 0 };
      l.losses += 1;
      tally.set(v.loser_entry_id, l);
    }
  }

  const profiles = await profilesByIds(supabase, entries.map((e) => e.user_id));
  const urls = await signPaths(supabase, entries.map((e) => e.media_path));

  const rows = entries.map((entry) => {
    const agg = since ? (tally.get(entry.id) ?? { wins: 0, losses: 0 }) : { wins: entry.wins, losses: entry.losses };
    const battles = agg.wins + agg.losses;
    return {
      entry,
      profile: profiles.get(entry.user_id) ?? null,
      url: urls[entry.media_path] ?? null,
      wins: agg.wins,
      losses: agg.losses,
      battles,
      rate: winRate(agg.wins, battles),
      position: 0,
    };
  });

  rows.sort((a, b) => b.wins - a.wins || b.rate - a.rate || a.losses - b.losses);
  return rows.slice(0, 100).map((r, i) => ({ ...r, position: i + 1 }));
}

/** Pareamento: mesma categoria, nível parecido, nº de batalhas parecido, sem repetir confrontos.
 *  `category === "all"` procura confrontos em qualquer pose (sempre entre a mesma pose). */
export async function pickBattle(supabase: DB, userId: string, category: string) {
  let query = supabase
    .from("battle_entries")
    .select("*")
    .eq("status", "active")
    .limit(800);
  if (category !== "all") query = query.eq("category", category);
  const { data: entriesData } = await query;

  const all = (entriesData ?? []) as ArenaEntry[];
  const participants = all.length;
  const others = all.filter((e) => e.user_id !== userId);

  const empty = (reason: "few" | "voted") => ({
    battle: null,
    participants,
    others: others.length,
    reason,
  });

  // Basta haver 2 participações de atletas diferentes (mesmo que uma seja sua).
  const distinctUsers = new Set(all.map((e) => e.user_id));
  if (all.length < 2 || distinctUsers.size < 2) return empty("few");

  const { data: votes } = await supabase
    .from("battle_votes")
    .select("winner_entry_id,loser_entry_id")
    .eq("voter_id", userId)
    .limit(5000);
  const seen = new Set<string>();
  for (const v of votes ?? []) {
    seen.add([v.winner_entry_id, v.loser_entry_id].sort().join("|"));
  }

  const profiles = await profilesByIds(supabase, all.map((e) => e.user_id));
  const withXp = all.map((e) => ({
    entry: e,
    xp: profiles.get(e.user_id)?.xp ?? 0,
    battles: e.battles,
  }));

  const candidates: { a: ArenaEntry; b: ArenaEntry; score: number }[] = [];
  for (let i = 0; i < withXp.length; i++) {
    for (let j = i + 1; j < withXp.length; j++) {
      const a = withXp[i]!;
      const b = withXp[j]!;
      if (a.entry.user_id === b.entry.user_id) continue;
      if (a.entry.category !== b.entry.category) continue;
      if (seen.has([a.entry.id, b.entry.id].sort().join("|"))) continue;
      // Nunca exibimos confrontos com participação própria: votar em si mesmo é proibido.
      if (a.entry.user_id === userId || b.entry.user_id === userId) continue;
      candidates.push({ a: a.entry, b: b.entry, score: pairScore(a, b) });
    }
  }
  if (candidates.length === 0) return empty("voted");

  candidates.sort((x, y) => x.score - y.score);
  const pool = candidates.slice(0, Math.min(12, candidates.length));
  const chosen = pool[Math.floor(Math.random() * pool.length)]!;

  const urls = await signPaths(supabase, [chosen.a.media_path, chosen.b.media_path]);
  const [left, right] = toCards([chosen.a, chosen.b], profiles, urls);
  return {
    battle: { left: left!, right: right!, category: chosen.a.category },
    participants,
    others: others.length,
    remaining: candidates.length,
    reason: null as null,
  };
}



/** Recompensas por vitória: XP no perfil + conquistas da Arena. */
export async function applyWinRewards(admin: DB, entryId: string, xpPerWin: number) {
  const { data: entry } = await admin
    .from("battle_entries")
    .select("user_id,wins")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("xp")
    .eq("id", entry.user_id)
    .maybeSingle();
  if (profile) {
    await admin
      .from("profiles")
      .update({ xp: (profile.xp ?? 0) + xpPerWin })
      .eq("id", entry.user_id);
  }

  const codes: string[] = [];
  if (entry.wins >= 1) codes.push("arena_first_win");
  if (entry.wins >= 100) codes.push("arena_legend");
  for (const code of codes) {
    const { data: existing } = await admin
      .from("achievements")
      .select("id")
      .eq("user_id", entry.user_id)
      .eq("code", code)
      .maybeSingle();
    if (!existing) {
      await admin.from("achievements").insert({ user_id: entry.user_id, code });
    }
  }
}

/** Atualiza a melhor posição já alcançada por uma participação. */
export async function refreshBestRank(supabase: DB, admin: DB, entryId: string) {
  const { data: entry } = await supabase
    .from("battle_entries")
    .select("id,user_id,category,best_rank")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry) return;
  const ranking = await buildRanking(supabase, admin, entry.category, "all");
  const found = ranking.find((r) => r.entry.id === entry.id);
  if (!found) return;
  if (entry.best_rank == null || found.position < entry.best_rank) {
    await admin.from("battle_entries").update({ best_rank: found.position }).eq("id", entry.id);
  }
  const codes: string[] = [];
  if (found.position <= 100) codes.push("arena_top100");
  if (found.position <= 10) codes.push("arena_top10");
  for (const code of codes) {
    const { data: existing } = await admin
      .from("achievements")
      .select("id")
      .eq("user_id", entry.user_id)
      .eq("code", code)
      .maybeSingle();
    if (!existing) await admin.from("achievements").insert({ user_id: entry.user_id, code });
  }
}
