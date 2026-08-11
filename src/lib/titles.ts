import { TITLES, titleFromLevel } from "@/lib/ascend";
import { VOID_OWNER_IDS } from "@/lib/banners";

export type TitleRarity =
  | "COMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC"
  | "EXCLUSIVE"
  | "VOID";

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
  EXCLUSIVE: { particles: 7 },
  VOID: { particles: 7 },
};

export const TITLE_RARITY_STYLE: Record<TitleRarity, { label: string; color: string }> = {
  COMMON: { label: "Common", color: "#9CA3AF" },
  RARE: { label: "Rare", color: "#60A5FA" },
  EPIC: { label: "Epic", color: "#A78BFA" },
  LEGENDARY: { label: "Legendary", color: "#F59E0B" },
  MYTHIC: { label: "Mythic", color: "#F472B6" },
  EXCLUSIVE: { label: "Exclusive", color: "#A855F7" },
  VOID: { label: "Void", color: "#A855F7" },
};

/** Estatísticas usadas pelos requisitos (calculadas no servidor). */
export type TitleStats = {
  level: number;
  xp: number;
  workouts: number;
  achievements: number;
  streak: number;
  onboarded: boolean;
};

/** Definição completa de um título — pronta para novos tipos (evento, pago, secreto…). */
export type TitleDef = TitleVisual & {
  /** XP concedido apenas no primeiro desbloqueio. */
  xpReward: number;
  /** Descrição do requisito (mostrada quando bloqueado). */
  requirement: { label: string; check: (s: TitleStats) => boolean } | null;
  /** Quando definido, só estas contas podem possuir o título. */
  exclusiveTo?: string[];
  /** Títulos secretos exibem apenas uma dica no seletor. */
  secret?: boolean;
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

/** Catálogo oficial de títulos equipáveis do ASCEND. */
export const TITLE_CATALOG: TitleDef[] = [
  {
    id: "the-awakened",
    name: "The Awakened",
    emoji: "🌅",
    rarity: "COMMON",
    color: "#d4d4d4",
    gradient: "linear-gradient(100deg,#f5f5f5,#a3a3a3,#f5f5f5)",
    glow: "rgba(212,212,212,0.35)",
    particles: RARITY_BASE.COMMON.particles,
    xpReward: 100,
    requirement: { label: "Concluir o onboarding", check: (s) => s.onboarded },
  },
  {
    id: "born-from-grit",
    name: "Born From Grit",
    emoji: "🩸",
    rarity: "RARE",
    color: "#dc2626",
    gradient: "linear-gradient(100deg,#fecaca,#dc2626,#fee2e2)",
    glow: "rgba(220,38,38,0.4)",
    particles: RARITY_BASE.RARE.particles,
    xpReward: 250,
    requirement: { label: "10 treinos registrados", check: (s) => s.workouts >= 10 },
  },
  {
    id: "warforged",
    name: "Warforged",
    emoji: "⚔️",
    rarity: "EPIC",
    color: "#f59e0b",
    gradient: "linear-gradient(100deg,#fde68a,#f97316,#fbbf24)",
    glow: "rgba(249,115,22,0.45)",
    particles: RARITY_BASE.EPIC.particles,
    xpReward: 500,
    requirement: { label: "50 treinos registrados", check: (s) => s.workouts >= 50 },
  },
  {
    id: "apex",
    name: "Apex",
    emoji: "🗻",
    rarity: "LEGENDARY",
    color: "#38bdf8",
    gradient: "linear-gradient(100deg,#e0f2fe,#38bdf8,#0ea5e9)",
    glow: "rgba(56,189,248,0.45)",
    particles: RARITY_BASE.LEGENDARY.particles,
    xpReward: 1500,
    requirement: { label: "Alcançar o nível 25", check: (s) => s.level >= 25 },
  },
  {
    id: "the-conqueror",
    name: "The Conqueror",
    emoji: "🏆",
    rarity: "LEGENDARY",
    color: "#e9c46a",
    gradient: "linear-gradient(100deg,#fff3c4,#e9c46a,#f59e0b,#fff3c4)",
    glow: "rgba(233,196,106,0.5)",
    particles: RARITY_BASE.LEGENDARY.particles,
    xpReward: 1500,
    requirement: { label: "100 treinos registrados", check: (s) => s.workouts >= 100 },
  },
  {
    id: "sovereign",
    name: "Sovereign",
    emoji: "👑",
    rarity: "MYTHIC",
    color: "#f472b6",
    gradient: "linear-gradient(100deg,#fbcfe8,#f472b6,#fda4af,#fbcfe8)",
    glow: "rgba(244,114,182,0.5)",
    particles: RARITY_BASE.MYTHIC.particles,
    xpReward: 2500,
    requirement: {
      label: "Nível 50 + 5 conquistas",
      check: (s) => s.level >= 50 && s.achievements >= 5,
    },
  },
  {
    id: "voidborn",
    name: "Voidborn",
    emoji: "🌑",
    rarity: "MYTHIC",
    color: "#a855f7",
    gradient: "linear-gradient(100deg,#ddd6fe,#a855f7,#4c1d95,#ddd6fe)",
    glow: "rgba(168,85,247,0.5)",
    particles: RARITY_BASE.MYTHIC.particles,
    xpReward: 5000,
    requirement: {
      label: "Nível 75 · 250 treinos · 10 conquistas · 30 dias de sequência",
      check: (s) => s.level >= 75 && s.workouts >= 250 && s.achievements >= 10 && s.streak >= 30,
    },
  },
  {
    id: "child-of-the-void",
    name: "Child of the Void",
    emoji: "🌌",
    rarity: "EXCLUSIVE",
    color: "#a855f7",
    gradient: "linear-gradient(100deg,#f3e8ff,#a855f7,#2e1065,#c084fc,#f3e8ff)",
    glow: "rgba(168,85,247,0.6)",
    particles: RARITY_BASE.EXCLUSIVE.particles,
    xpReward: 10000,
    secret: true,
    requirement: {
      label: "Nível 100 · 500 treinos · 20 conquistas · 90 dias de sequência",
      check: (s) => s.level >= 100 && s.workouts >= 500 && s.achievements >= 20 && s.streak >= 90,
    },
  },
  {
    id: "void-creator",
    name: "The Void Creator",
    emoji: "🟣",
    rarity: "EXCLUSIVE",
    color: "#a855f7",
    gradient: "linear-gradient(100deg,#e9d5ff,#a855f7,#6d28d9,#e9d5ff)",
    glow: "rgba(168,85,247,0.55)",
    particles: RARITY_BASE.VOID.particles,
    xpReward: 0,
    secret: true,
    exclusiveTo: VOID_OWNER_IDS,
    requirement: { label: "Criador do ASCEND · The Void Studios", check: () => true },
  },
];

export const TITLE_BY_ID: Record<string, TitleDef> = Object.fromEntries(
  TITLE_CATALOG.map((t) => [t.id, t]),
);

/** Títulos que o usuário pode ver no seletor (exclusivos alheios ficam ocultos). */
export function visibleTitlesFor(userId: string | null | undefined, owned: string[]): TitleDef[] {
  return TITLE_CATALOG.filter(
    (t) => !t.exclusiveTo || (userId && t.exclusiveTo.includes(userId)) || owned.includes(t.id),
  );
}

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

/**
 * Título a exibir. Prioridade: título equipado > exclusivo do criador > progressão.
 */
export function displayTitle(
  level: number,
  xp: number,
  userId: string | null | undefined,
  equippedId?: string | null,
): { visual: TitleVisual; exclusive: boolean; progression: ReturnType<typeof titleFromLevel> } {
  const progression = titleFromLevel(level, xp);
  const equipped = equippedId ? TITLE_BY_ID[equippedId] : undefined;
  const ex = exclusiveTitleFor(userId);
  return {
    visual: equipped ?? ex ?? titleVisual(progression.name),
    exclusive: !!equipped?.exclusiveTo || (!equipped && !!ex),
    progression,
  };
}

export { TITLES };
