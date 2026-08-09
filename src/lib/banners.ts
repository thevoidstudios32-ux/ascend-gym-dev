import throneHallAsset from "@/assets/banners2/throne-hall.jpg.asset.json";
import neonGridAsset from "@/assets/banners2/neon-grid.jpg.asset.json";
import forgeAsset from "@/assets/banners2/forge.jpg.asset.json";
import titanTempleAsset from "@/assets/banners2/titan-temple.jpg.asset.json";
import skylineAsset from "@/assets/banners2/skyline.jpg.asset.json";
import voidStudiosAsset from "@/assets/banners2/void-studios.jpg.asset.json";

export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "ASCENDED";

/** CORE = liberado para todos. FORGED = desbloqueável. VOID = exclusivo/secreto. */
export type BannerCategory = "CORE" | "FORGED" | "VOID";

export type BannerStats = { level: number; workouts: number; medals: number; xp: number };

export type Banner = {
  id: string;
  name: string;
  url: string;
  rarity: Rarity;
  category: BannerCategory;
  /** null = liberado desde o início */
  requirement: null | { label: string; check: (s: BannerStats) => boolean };
};

export const RARITY_STYLE: Record<Rarity, { color: string; ring: string; label: string }> = {
  COMMON: { color: "#9CA3AF", ring: "ring-white/15", label: "Common" },
  RARE: { color: "#60A5FA", ring: "ring-sky-400/40", label: "Rare" },
  EPIC: { color: "#A78BFA", ring: "ring-violet-400/40", label: "Epic" },
  LEGENDARY: { color: "#F59E0B", ring: "ring-amber-400/50", label: "Legendary" },
  ASCENDED: { color: "#DC2626", ring: "ring-primary/60", label: "Ascended" },
};

export const CATEGORY_LABEL: Record<BannerCategory, string> = {
  CORE: "Core",
  FORGED: "Forged",
  VOID: "Void",
};

/** Contas autorizadas a ver e equipar o banner secreto THE VOID STUDIOS. */
export const VOID_OWNER_IDS = ["dfa353f8-442b-4c07-a8a1-26b3d0a536ff"];

export const BANNERS: Banner[] = [
  {
    id: "throne-hall",
    name: "Throne Hall",
    url: throneHallAsset.url,
    rarity: "COMMON",
    category: "CORE",
    requirement: null,
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    url: neonGridAsset.url,
    rarity: "COMMON",
    category: "CORE",
    requirement: null,
  },
  {
    id: "forge",
    name: "The Forge",
    url: forgeAsset.url,
    rarity: "RARE",
    category: "FORGED",
    requirement: { label: "Complete 10 treinos", check: (s) => s.workouts >= 10 },
  },
  {
    id: "titan-temple",
    name: "Titan Temple",
    url: titanTempleAsset.url,
    rarity: "EPIC",
    category: "FORGED",
    requirement: { label: "Alcance o nível 5 e 3 medalhas", check: (s) => s.level >= 5 && s.medals >= 3 },
  },
  {
    id: "skyline",
    name: "Skyline Ascension",
    url: skylineAsset.url,
    rarity: "LEGENDARY",
    category: "FORGED",
    requirement: { label: "Alcance o nível 15 e 30 treinos", check: (s) => s.level >= 15 && s.workouts >= 30 },
  },
  {
    id: "void-studios",
    name: "The Void Studios",
    url: voidStudiosAsset.url,
    rarity: "ASCENDED",
    category: "VOID",
    requirement: null,
  },
];

export const DEFAULT_BANNER_ID = "throne-hall";

export function isVoidOwner(userId: string | null | undefined) {
  return !!userId && VOID_OWNER_IDS.includes(userId);
}

/** Lista visível: o banner VOID só aparece para contas autorizadas. */
export function visibleBanners(userId: string | null | undefined) {
  return BANNERS.filter((b) => b.category !== "VOID" || isVoidOwner(userId));
}

/** Fallback seguro: ids antigos/desconhecidos caem no CORE padrão. */
export function bannerById(id: string | null | undefined): Banner {
  const found = BANNERS.find((b) => b.id === id);
  if (!found) return BANNERS.find((b) => b.id === DEFAULT_BANNER_ID)!;
  return found;
}

export function isBannerUnlocked(banner: Banner, stats: BannerStats, userId?: string | null) {
  if (banner.category === "VOID") return isVoidOwner(userId);
  return banner.requirement === null || banner.requirement.check(stats);
}
