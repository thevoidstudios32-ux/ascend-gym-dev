import throneAsset from "@/assets/banners/throne.jpg.asset.json";
import guardianAsset from "@/assets/banners/guardian.jpg.asset.json";
import apexAsset from "@/assets/banners/apex.jpg.asset.json";
import forgeAsset from "@/assets/banners/forge.jpg.asset.json";
import infiniteAsset from "@/assets/banners/infinite.jpg.asset.json";
import voidAsset from "@/assets/banners/void.jpg.asset.json";
import ascensionAsset from "@/assets/banners/ascension.jpg.asset.json";
import eclipseAsset from "@/assets/banners/eclipse.jpg.asset.json";

export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "ASCENDED";

export type BannerStats = { level: number; workouts: number; medals: number; xp: number };

export type Banner = {
  id: string;
  name: string;
  url: string;
  rarity: Rarity;
  /** null = liberado desde o início */
  requirement: null | { label: string; check: (s: BannerStats) => boolean };
  premium?: boolean;
};

export const RARITY_STYLE: Record<Rarity, { color: string; ring: string; label: string }> = {
  COMMON: { color: "#9CA3AF", ring: "ring-white/15", label: "Common" },
  RARE: { color: "#60A5FA", ring: "ring-sky-400/40", label: "Rare" },
  EPIC: { color: "#A78BFA", ring: "ring-violet-400/40", label: "Epic" },
  LEGENDARY: { color: "#F59E0B", ring: "ring-amber-400/50", label: "Legendary" },
  ASCENDED: { color: "#DC2626", ring: "ring-primary/60", label: "Ascended" },
};

export const BANNERS: Banner[] = [
  {
    id: "void",
    name: "The Void",
    url: voidAsset.url,
    rarity: "COMMON",
    requirement: null,
  },
  {
    id: "forge",
    name: "The Forge",
    url: forgeAsset.url,
    rarity: "COMMON",
    requirement: null,
  },
  {
    id: "throne",
    name: "The Throne",
    url: throneAsset.url,
    rarity: "RARE",
    requirement: { label: "Complete 10 treinos", check: (s) => s.workouts >= 10 },
  },
  {
    id: "guardian",
    name: "The Guardian",
    url: guardianAsset.url,
    rarity: "RARE",
    requirement: { label: "Alcance o nível 5", check: (s) => s.level >= 5 },
  },
  {
    id: "infinite",
    name: "Infinite Gym",
    url: infiniteAsset.url,
    rarity: "EPIC",
    requirement: { label: "Conquiste 5 medalhas", check: (s) => s.medals >= 5 },
  },
  {
    id: "apex",
    name: "Apex",
    url: apexAsset.url,
    rarity: "EPIC",
    requirement: { label: "Complete 30 treinos", check: (s) => s.workouts >= 30 },
  },
  {
    id: "ascension",
    name: "Ascension",
    url: ascensionAsset.url,
    rarity: "LEGENDARY",
    requirement: { label: "Alcance o nível 15", check: (s) => s.level >= 15 },
  },
  {
    id: "eclipse",
    name: "Red Eclipse",
    url: eclipseAsset.url,
    rarity: "ASCENDED",
    requirement: { label: "Acumule 10.000 XP", check: (s) => s.xp >= 10000 },
    premium: true,
  },
];

export const DEFAULT_BANNER_ID = "void";

export function bannerById(id: string | null | undefined): Banner {
  return BANNERS.find((b) => b.id === id) ?? BANNERS[0]!;
}

export function isBannerUnlocked(banner: Banner, stats: BannerStats) {
  return banner.requirement === null || banner.requirement.check(stats);
}
