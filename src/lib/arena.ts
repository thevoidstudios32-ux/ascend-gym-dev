/* ASCEND ARENA — Shape Battle (lógica pura, client-safe).
 * Preparado para evoluções futuras: vídeos, IA avaliando vídeos, comentários,
 * curtidas, temporadas, ligas, recompensas exclusivas e selo "Verificado por Vídeo".
 * Esses recursos ainda NÃO estão ativos — apenas a arquitetura está pronta.
 */

export { ARENA_POSES, POSE_BY_ID, poseOf } from "@/lib/poses";
import { ARENA_POSES } from "@/lib/poses";

/** Categorias da Arena = poses de fisiculturismo. */
export const ARENA_CATEGORIES = ARENA_POSES.map((p) => ({
  id: p.id,
  label: p.label,
  emoji: p.emoji,
}));

export type ArenaCategory = string;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ARENA_CATEGORIES.map((c) => [c.id, c.label]),
);
export const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  ARENA_CATEGORIES.map((c) => [c.id, c.emoji]),
);

/** Mídias suportadas hoje. 'video' fica reservado para a Fase 2. */
export const MEDIA_TYPES = ["photo"] as const;

export const RANGES = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "all", label: "Geral" },
] as const;

export type ArenaRange = (typeof RANGES)[number]["id"];

export const XP_PER_WIN = 15;
export const XP_PER_VOTE = 2;

export const ARENA_RULES = [
  "Envie uma foto nítida. Evite filtros exagerados ou edições. O foco é mostrar sua evolução.",
  "Respeito sempre: a Arena é sobre progresso, não sobre julgamento.",
  "Nada de nudez, conteúdo ofensivo ou fotos de terceiros.",
  "Você pode ter uma participação ativa por categoria.",
  "Cada confronto só pode ser votado uma vez por pessoa.",
  "Vitórias valem XP e contam para o ranking e para as conquistas da Arena.",
];

export const ARENA_ACHIEVEMENTS = [
  { code: "arena_first_win", label: "Primeira Vitória", emoji: "🥊", desc: "Vença sua primeira batalha" },
  { code: "arena_top100", label: "Top 100", emoji: "🎖️", desc: "Entre no Top 100 de uma categoria" },
  { code: "arena_top10", label: "Top 10", emoji: "🏅", desc: "Entre no Top 10 de uma categoria" },
  { code: "arena_week_champ", label: "Campeão da Semana", emoji: "👑", desc: "Termine em 1º na semana" },
  { code: "arena_legend", label: "Lenda do Shape", emoji: "🐉", desc: "Alcance 100 vitórias" },
] as const;

export type ArenaEntry = {
  id: string;
  user_id: string;
  category: string;
  media_path: string;
  media_type: string;
  description: string | null;
  status: string;
  wins: number;
  losses: number;
  battles: number;
  best_rank: number | null;
  video_verified: boolean;
  created_at: string;
};

export type ArenaProfileMini = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
};

export type ArenaCard = {
  entry: ArenaEntry;
  profile: ArenaProfileMini | null;
  url: string | null;
};

export type RankedEntry = ArenaCard & {
  wins: number;
  losses: number;
  battles: number;
  rate: number;
  position: number;
};

export function winRate(wins: number, battles: number) {
  if (!battles) return 0;
  return Math.round((wins / battles) * 100);
}

export function sinceForRange(range: ArenaRange, now = new Date()) {
  const d = new Date(now);
  if (range === "today") d.setHours(0, 0, 0, 0);
  else if (range === "week") d.setDate(d.getDate() - 7);
  else if (range === "month") d.setDate(d.getDate() - 30);
  else return null;
  return d.toISOString();
}

/** Quanto menor, melhor o pareamento (nível parecido + nº de batalhas parecido). */
export function pairScore(
  a: { xp: number; battles: number },
  b: { xp: number; battles: number },
) {
  return Math.abs(a.xp - b.xp) / 250 + Math.abs(a.battles - b.battles) * 1.5;
}

export function medalFor(position: number) {
  return position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : null;
}
