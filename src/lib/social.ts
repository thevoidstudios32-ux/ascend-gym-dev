/* Gym Bros — lógica pura da comunidade (client-safe). */

export type BroProfile = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  gym: string | null;
  goal: string;
  xp: number;
  weight_kg: number | null;
  height_cm: number | null;
  training_since: string | null;
};

export type FeedPost = {
  id: string;
  user_id: string;
  kind: string;
  content: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type PostReaction = { id: string; post_id: string; user_id: string; emoji: string };

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

export type ChallengeRow = {
  id: string;
  owner_id: string;
  title: string;
  metric: string;
  starts_on: string;
  ends_on: string;
};

export type ChallengeParticipant = { id: string; challenge_id: string; user_id: string; score: number };

export const REACTIONS = [
  { emoji: "fist", icon: "👊", label: "Fist Bump" },
  { emoji: "fire", icon: "🔥", label: "Monstro" },
  { emoji: "muscle", icon: "💪", label: "Forte" },
  { emoji: "clap", icon: "👏", label: "Respeito" },
] as const;

export const POST_KINDS: Record<string, { icon: string; label: string }> = {
  workout: { icon: "🏋️", label: "finalizou um treino" },
  pr: { icon: "📈", label: "bateu um novo PR" },
  streak: { icon: "🔥", label: "está numa sequência" },
  photo: { icon: "📸", label: "publicou foto de evolução" },
  badge: { icon: "🏅", label: "conquistou uma medalha" },
  goal: { icon: "🎯", label: "completou uma meta" },
  text: { icon: "💬", label: "publicou" },
};

export const CHALLENGE_METRICS = [
  { id: "workouts", label: "Quem treina mais dias na semana" },
  { id: "total", label: "Quem completa mais treinos" },
  { id: "prs", label: "Quem bate mais recordes" },
  { id: "custom", label: "Desafio personalizado" },
] as const;

export const BRO_RANKS = [
  { id: "bronze", name: "Bronze Bro", min: 0, color: "#CD7F32", icon: "🥉" },
  { id: "silver", name: "Silver Bro", min: 1500, color: "#C0C0C0", icon: "🥈" },
  { id: "gold", name: "Gold Bro", min: 4000, color: "#E9C46A", icon: "🥇" },
  { id: "diamond", name: "Diamond Bro", min: 9000, color: "#7DD3FC", icon: "💎" },
  { id: "ascended", name: "Ascended Bro", min: 18000, color: "#DC2626", icon: "👑" },
];

/** Pontuação social: XP + frequência + conquistas + desafios concluídos. */
export function broScore(input: {
  xp: number;
  workouts: number;
  achievements: number;
  challenges: number;
}) {
  return (
    Math.round(input.xp) + input.workouts * 40 + input.achievements * 150 + input.challenges * 250
  );
}

export function broRank(score: number) {
  const rank = [...BRO_RANKS].reverse().find((r) => score >= r.min) ?? BRO_RANKS[0]!;
  const idx = BRO_RANKS.findIndex((r) => r.id === rank.id);
  const next = BRO_RANKS[idx + 1] ?? null;
  const pct = next
    ? Math.min(100, Math.round(((score - rank.min) / (next.min - rank.min)) * 100))
    : 100;
  return { ...rank, next, pct, score };
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function handleOf(p: { username: string | null; name: string }) {
  const fallback = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "bro";
  return "@" + (p.username ?? fallback);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}sem`;
}

export function trainingTime(since: string | null) {
  if (!since) return "—";
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(since).getTime()) / (30.4 * 86400000)),
  );
  if (months < 1) return "menos de 1 mês";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const y = Math.floor(months / 12);
  const r = months % 12;
  return `${y} ano${y > 1 ? "s" : ""}${r ? ` e ${r} m` : ""}`;
}

export const GOAL_LABELS: Record<string, string> = {
  "ganhar massa": "Bulking",
  hipertrofia: "Bulking",
  emagrecer: "Cutting",
  condicionamento: "Manutenção",
};
