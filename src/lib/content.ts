import { BANNERS, DEFAULT_BANNER_ID, isVoidOwner, type Banner } from "@/lib/banners";
import { TITLE_CATALOG, type TitleDef, type TitleRarity, type TitleStats } from "@/lib/titles";

/** Raridades aceitas pelo gerenciador de conteúdo (superset das existentes). */
export const CONTENT_RARITIES = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
  "EXCLUSIVE",
  "ASCENDED",
  "VOID",
] as const;
export type ContentRarity = (typeof CONTENT_RARITIES)[number];

export const UNLOCK_TYPES = [
  "achievement",
  "level",
  "xp",
  "workouts",
  "streak",
  "manual",
  "admin_only",
] as const;
export type UnlockType = (typeof UNLOCK_TYPES)[number];

export const UNLOCK_LABEL: Record<UnlockType, string> = {
  achievement: "Achievement",
  level: "Level",
  xp: "XP",
  workouts: "Treinos",
  streak: "Sequência",
  manual: "Manual",
  admin_only: "Admin Only",
};

/** Linha crua da tabela content_items. */
export type ContentRow = {
  id: string;
  kind: "title" | "banner";
  slug: string;
  name: string;
  description: string | null;
  rarity: string;
  unlock_type: string;
  unlock_value: number | null;
  unlock_label: string | null;
  xp_reward: number;
  image_url: string | null;
  image_position: string | null;
  category: string | null;
  emoji: string | null;
  color: string | null;
  gradient: string | null;
  glow: string | null;
  active: boolean;
  admin_only: boolean;
  builtin: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Título efetivo enviado ao cliente (serializável — sem funções). */
export type EffectiveTitle = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  rarity: TitleRarity;
  color: string;
  gradient: string;
  glow: string;
  particles: number;
  xpReward: number;
  requirementLabel: string | null;
  unlockType: UnlockType;
  unlockValue: number | null;
  adminOnly: boolean;
  secret: boolean;
  builtin: boolean;
};

export type EffectiveBanner = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  position: string | null;
  rarity: string;
  category: string;
  requirementLabel: string | null;
  unlockType: UnlockType;
  unlockValue: number | null;
  adminOnly: boolean;
  builtin: boolean;
};

const RARITY_PARTICLES: Record<string, number> = {
  COMMON: 0,
  UNCOMMON: 0,
  RARE: 0,
  EPIC: 3,
  LEGENDARY: 5,
  MYTHIC: 6,
  EXCLUSIVE: 7,
  ASCENDED: 7,
  VOID: 7,
};

const RARITY_FALLBACK_COLOR: Record<string, string> = {
  COMMON: "#9CA3AF",
  UNCOMMON: "#34D399",
  RARE: "#60A5FA",
  EPIC: "#A78BFA",
  LEGENDARY: "#F59E0B",
  MYTHIC: "#F472B6",
  EXCLUSIVE: "#A855F7",
  ASCENDED: "#DC2626",
  VOID: "#A855F7",
};

/** Raridade válida para o visual dos títulos (mapeia extras para as existentes). */
function titleRarity(r: string): TitleRarity {
  if (r === "UNCOMMON") return "RARE";
  if (r === "ASCENDED") return "EXCLUSIVE";
  return (["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "EXCLUSIVE", "VOID"].includes(r)
    ? r
    : "COMMON") as TitleRarity;
}

function unlockType(v: string): UnlockType {
  return (UNLOCK_TYPES as readonly string[]).includes(v) ? (v as UnlockType) : "manual";
}

function autoLabel(type: UnlockType, value: number | null) {
  switch (type) {
    case "level":
      return `Alcançar o nível ${value ?? 0}`;
    case "xp":
      return `Acumular ${value ?? 0} XP`;
    case "workouts":
      return `${value ?? 0} treinos registrados`;
    case "streak":
      return `${value ?? 0} dias de sequência`;
    case "achievement":
      return `${value ?? 0} conquistas`;
    case "admin_only":
      return "Exclusivo da administração";
    default:
      return null;
  }
}

/** Avalia um requisito configurável do Admin Panel. */
export function checkUnlock(type: UnlockType, value: number | null, s: TitleStats): boolean {
  const v = value ?? 0;
  switch (type) {
    case "level":
      return s.level >= v;
    case "xp":
      return s.xp >= v;
    case "workouts":
      return s.workouts >= v;
    case "streak":
      return s.streak >= v;
    case "achievement":
      return s.achievements >= v;
    default:
      return false;
  }
}

/** Aplica overrides do banco sobre o catálogo de títulos em código + títulos novos. */
export function mergeTitles(rows: ContentRow[], opts: { includeInactive?: boolean } = {}) {
  const byslug = new Map(rows.filter((r) => r.kind === "title").map((r) => [r.slug, r]));
  const out: { effective: EffectiveTitle; row: ContentRow | null; base: TitleDef | null }[] = [];

  for (const base of TITLE_CATALOG) {
    const row = byslug.get(base.id) ?? null;
    byslug.delete(base.id);
    if (row && (!row.active || row.deleted_at) && !opts.includeInactive) continue;
    out.push({ base, row, effective: fromBase(base, row) });
  }

  for (const row of byslug.values()) {
    if (row.deleted_at && !opts.includeInactive) continue;
    if (!row.active && !opts.includeInactive) continue;
    out.push({ base: null, row, effective: fromRow(row) });
  }

  out.sort((a, b) => (a.row?.sort_order ?? 100) - (b.row?.sort_order ?? 100));
  return out;
}

function fromBase(base: TitleDef, row: ContentRow | null): EffectiveTitle {
  const rarity = row ? titleRarity(row.rarity) : base.rarity;
  return {
    id: base.id,
    name: row?.name ?? base.name,
    description: row?.description ?? base.requirement?.label ?? null,
    emoji: row?.emoji || base.emoji,
    rarity,
    color: row?.color || base.color,
    gradient: row?.gradient || base.gradient,
    glow: row?.glow || base.glow,
    particles: base.particles,
    xpReward: row?.xp_reward ?? base.xpReward,
    requirementLabel: row?.unlock_label ?? base.requirement?.label ?? null,
    unlockType: row ? unlockType(row.unlock_type) : base.exclusiveTo ? "admin_only" : "manual",
    unlockValue: row?.unlock_value ?? null,
    adminOnly: row?.admin_only ?? !!base.exclusiveTo,
    secret: !!base.secret,
    builtin: true,
  };
}

function fromRow(row: ContentRow): EffectiveTitle {
  const rarity = titleRarity(row.rarity);
  const color = row.color || RARITY_FALLBACK_COLOR[row.rarity] || "#9CA3AF";
  const type = unlockType(row.unlock_type);
  return {
    id: row.slug,
    name: row.name,
    description: row.description,
    emoji: row.emoji || "🏅",
    rarity,
    color,
    gradient: row.gradient || `linear-gradient(100deg,#ffffff,${color},#ffffff)`,
    glow: row.glow || `${color}66`,
    particles: RARITY_PARTICLES[row.rarity] ?? 0,
    xpReward: row.xp_reward,
    requirementLabel: row.unlock_label ?? autoLabel(type, row.unlock_value),
    unlockType: type,
    unlockValue: row.unlock_value,
    adminOnly: row.admin_only,
    secret: type === "admin_only",
    builtin: false,
  };
}

/**
 * Decide se o título deve ser desbloqueado agora.
 * Itens nativos mantêm a regra em código quando o admin não configurou outra.
 */
export function shouldUnlockTitle(
  t: EffectiveTitle,
  base: TitleDef | null,
  stats: TitleStats,
  isAdminUser: boolean,
  userId: string,
): boolean {
  if (t.adminOnly || t.unlockType === "admin_only") {
    if (base?.exclusiveTo) return base.exclusiveTo.includes(userId);
    return isAdminUser;
  }
  if (t.unlockType === "manual") {
    return base?.requirement ? base.requirement.check(stats) : false;
  }
  return checkUnlock(t.unlockType, t.unlockValue, stats);
}

/** Aplica overrides do banco sobre os banners em código + banners novos. */
export function mergeBanners(rows: ContentRow[], opts: { includeInactive?: boolean } = {}) {
  const byslug = new Map(rows.filter((r) => r.kind === "banner").map((r) => [r.slug, r]));
  const out: { effective: EffectiveBanner; row: ContentRow | null; base: Banner | null }[] = [];

  for (const base of BANNERS) {
    const row = byslug.get(base.id) ?? null;
    byslug.delete(base.id);
    if (row && (!row.active || row.deleted_at) && !opts.includeInactive) continue;
    out.push({
      base,
      row,
      effective: {
        id: base.id,
        name: row?.name ?? base.name,
        description: row?.description ?? null,
        url: row?.image_url || base.url,
        position: row?.image_position ?? base.position ?? null,
        rarity: row?.rarity ?? base.rarity,
        category: row?.category ?? base.category,
        requirementLabel: row?.unlock_label ?? base.requirement?.label ?? null,
        unlockType: row ? unlockType(row.unlock_type) : base.category === "VOID" ? "admin_only" : "manual",
        unlockValue: row?.unlock_value ?? null,
        adminOnly: row?.admin_only ?? base.category === "VOID",
        builtin: true,
      },
    });
  }

  for (const row of byslug.values()) {
    if ((row.deleted_at || !row.active) && !opts.includeInactive) continue;
    const type = unlockType(row.unlock_type);
    out.push({
      base: null,
      row,
      effective: {
        id: row.slug,
        name: row.name,
        description: row.description,
        url: row.image_url ?? "",
        position: row.image_position,
        rarity: row.rarity,
        category: row.category ?? "FORGED",
        requirementLabel: row.unlock_label ?? autoLabel(type, row.unlock_value),
        unlockType: type,
        unlockValue: row.unlock_value,
        adminOnly: row.admin_only,
        builtin: false,
      },
    });
  }

  out.sort((a, b) => (a.row?.sort_order ?? 100) - (b.row?.sort_order ?? 100));
  return out;
}

/** Regra de desbloqueio de banner (nativo mantém a checagem em código). */
export function isBannerUnlockedFor(
  b: EffectiveBanner,
  base: Banner | null,
  stats: TitleStats & { medals: number },
  isAdminUser: boolean,
  userId: string | null,
): boolean {
  if (b.adminOnly || b.unlockType === "admin_only") {
    if (base?.category === "VOID") return isVoidOwner(userId) || isAdminUser;
    return isAdminUser;
  }
  if (b.unlockType === "manual") {
    if (!base) return true;
    return (
      base.requirement === null ||
      base.requirement.check({
        level: stats.level,
        workouts: stats.workouts,
        medals: stats.medals,
        xp: stats.xp,
      })
    );
  }
  return checkUnlock(b.unlockType, b.unlockValue, stats);
}

export { DEFAULT_BANNER_ID };

/** Payload aceito pelo formulário do Admin Panel. */
export type ContentPayload = {
  id?: string | null;
  kind: "title" | "banner";
  slug: string;
  name: string;
  description?: string | null;
  rarity: ContentRarity;
  unlock_type: UnlockType;
  unlock_value?: number | null;
  unlock_label?: string | null;
  xp_reward: number;
  image_url?: string | null;
  image_position?: string | null;
  category?: "CORE" | "FORGED" | "LEGACY" | "VOID" | null;
  emoji?: string | null;
  color?: string | null;
  active: boolean;
  admin_only: boolean;
  sort_order: number;
};
