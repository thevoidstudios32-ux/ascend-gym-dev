import { TITLES, titleFromLevel } from "@/lib/ascend";
import { VOID_OWNER_IDS } from "@/lib/banners";

export type TitleRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "VOID";

export type TitleVisual = {
  /** Chave estável do título. */
  id: string;
  name: string;
  emoji: string;
  rarity: TitleRarity;
  /** Cor base usada em textos auxiliares. */
  color: string;
  /** Gradiente aplicado ao texto do título. */
  gradient: string;
  /** Cor do glow/partículas. */
  glow: string;
  /** Quantidade de partículas (0 = sem partículas). */
  particles: number;
};

const RARITY_BASE: Record<TitleRarity, { particles: number }> = {
  COMMON: { particles: 0 },
  RARE: { particles: 0 },
  EPIC: { particles: 3 },
  LEGENDARY: { particles: 5 },
  MYTHIC: { particles: 6 },
  VOID: { particles: 7 },
};

/** Visual de cada título de progressão (nomes iguais aos de `TITLES`). */
export const TITLE_VISUALS: Record<string, TitleVisual> = {
  "Gym Rookie": {
    id: "gym-rookie",
    name: "Gym Rookie",
    emoji: "🐣",
    rarity: "COMMON",
    color: "#a3a3a3",
    gradient: "linear-gradient(100deg,#d4d4d4,#8a8a8a,#d4d4d4)",
    glow: "rgba(212,212,212,0.35)",
    particles: RARITY_BASE.COMMON.particles,
  },
  "Iron Warrior": {
    id: "iron-warrior",
    name: "Iron Warrior",
    emoji: "⚡",
    rarity: "RARE",
    color: "#dc2626",
    gradient: "linear-gradient(100deg,#f5f5f5,#9ca3af,#ffffff,#8b8b8b)",
    glow: "rgba(220,38,38,0.35)",
    particles: RARITY_BASE.RARE.particles,
  },
  "Elite Lifter": {
    id: "elite-lifter",
    name: "Elite Lifter",
    emoji: "🔥",
    rarity: "EPIC",
    color: "#f59e0b",
    gradient: "linear-gradient(100deg,#fca5a5,#dc2626,#fbbf24)",
    glow: "rgba(220,38,38,0.45)",
    particles: RARITY_BASE.EPIC.particles,
  },
  Titan: {
    id: "titan",
    name: "Titan",
    emoji: "🗿",
    rarity: "LEGENDARY",
    color: "#38bdf8",
    gradient: "linear-gradient(100deg,#e0f2fe,#38bdf8,#0ea5e9)",
    glow: "rgba(56,189,248,0.4)",
    particles: RARITY_BASE.LEGENDARY.particles,
  },
  Legend: {
    id: "legend",
    name: "Legend",
    emoji: "👑",
    rarity: "MYTHIC",
    color: "#e9c46a",
    gradient: "linear-gradient(100deg,#fff3c4,#e9c46a,#f59e0b,#fff3c4)",
    glow: "rgba(233,196,106,0.5)",
    particles: RARITY_BASE.MYTHIC.particles,
  },
};

/** Títulos exclusivos: nunca desbloqueáveis pelo progresso normal. */
export type ExclusiveTitle = TitleVisual & { owners: string[]; description: string };

export const EXCLUSIVE_TITLES: ExclusiveTitle[] = [
  {
    id: "void-creator",
    name: "The Void Creator",
    emoji: "🌌",
    rarity: "VOID",
    color: "#a855f7",
    gradient: "linear-gradient(100deg,#e9d5ff,#a855f7,#6d28d9,#e9d5ff)",
    glow: "rgba(168,85,247,0.55)",
    particles: RARITY_BASE.VOID.particles,
    owners: VOID_OWNER_IDS,
    description: "Criador do ASCEND · The Void Studios",
  },
];

/** Título exclusivo do usuário (se houver). Tem prioridade sobre o de progressão. */
export function exclusiveTitleFor(userId: string | null | undefined): ExclusiveTitle | null {
  if (!userId) return null;
  return EXCLUSIVE_TITLES.find((t) => t.owners.includes(userId)) ?? null;
}

const FALLBACK: TitleVisual = TITLE_VISUALS["Gym Rookie"]!;

/** Visual do título de progressão pelo nome. */
export function titleVisual(name: string): TitleVisual {
  return TITLE_VISUALS[name] ?? FALLBACK;
}

/** Título a exibir: exclusivo quando existir, senão o de progressão. */
export function displayTitle(
  level: number,
  xp: number,
  userId: string | null | undefined,
): { visual: TitleVisual; exclusive: boolean; progression: ReturnType<typeof titleFromLevel> } {
  const progression = titleFromLevel(level, xp);
  const ex = exclusiveTitleFor(userId);
  return {
    visual: ex ?? titleVisual(progression.name),
    exclusive: !!ex,
    progression,
  };
}

export { TITLES };
