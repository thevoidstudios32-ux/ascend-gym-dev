/** Sistema de Selos (Badges) — tipos e estilos compartilhados (client-safe). */

export const BADGE_CATEGORIES = ["Official", "Community", "Exclusive"] as const;
export const BADGE_RARITIES = ["Rare", "Epic", "Legendary", "Mythic", "Exclusive"] as const;

export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];
export type BadgeRarity = (typeof BADGE_RARITIES)[number];

/** Slug do selo de autoridade máxima — concede a role `super_admin`. */
export const VOID_BADGE_SLUG = "the-void";

export type BadgeDef = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  emoji: string | null;
  category: string;
  rarity: string;
  color: string | null;
  is_active: boolean;
  admin_only: boolean;
  featurable: boolean;
  sort_order: number;
};

export type OwnedBadge = {
  badge: BadgeDef;
  granted_at: string;
  granted_by: string | null;
  is_featured: boolean;
  seen: boolean;
};

const RARITY: Record<string, { ring: string; text: string; glow: string }> = {
  Rare: { ring: "border-white/12", text: "text-muted-foreground", glow: "" },
  Epic: { ring: "border-primary/35", text: "text-primary", glow: "shadow-[0_0_18px_-6px_rgb(220_38_38/0.55)]" },
  Legendary: {
    ring: "border-primary/55",
    text: "text-primary",
    glow: "shadow-[0_0_26px_-6px_rgb(220_38_38/0.75)]",
  },
  Mythic: {
    ring: "border-amber-400/45",
    text: "text-amber-300",
    glow: "shadow-[0_0_26px_-6px_rgb(245_197_66/0.6)]",
  },
  Exclusive: {
    ring: "border-white/25",
    text: "text-foreground",
    glow: "shadow-[0_0_30px_-6px_rgb(255_255_255/0.35)]",
  },
};

export function rarityStyle(rarity: string) {
  return RARITY[rarity] ?? RARITY["Rare"]!;
}
