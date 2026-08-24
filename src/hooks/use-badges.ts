import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminBadgeLogs,
  adminGrantBadge,
  adminListBadges,
  adminListGrants,
  adminRevokeBadge,
  adminSaveBadge,
  adminSearchBadgeUsers,
  adminToggleBadge,
  getMyBadges,
  getUserBadges,
  markBadgesSeen,
  setFeaturedBadge,
} from "@/lib/badges.functions";
import type { BadgeCategory, BadgeRarity } from "@/lib/badges";

/** Chaves de cache centralizadas — mutations invalidam sempre pelo mesmo prefixo. */
export const badgeKeys = {
  mine: ["badges", "mine"] as const,
  user: (id: string | null) => ["badges", "user", id] as const,
  catalog: ["badges", "catalog"] as const,
  grants: (filters: unknown) => ["badges", "grants", filters] as const,
  logs: ["badges", "logs"] as const,
  search: (q: string) => ["badges", "search", q] as const,
};

/* --------------------------------- usuário --------------------------------- */

export function useMyBadges() {
  const fn = useServerFn(getMyBadges);
  return useQuery({ queryKey: badgeKeys.mine, queryFn: () => fn(), retry: false });
}

export function useUserBadges(userId: string | null) {
  const fn = useServerFn(getUserBadges);
  return useQuery({
    queryKey: badgeKeys.user(userId),
    queryFn: () => fn({ data: { userId: userId! } }),
    enabled: !!userId,
    retry: false,
  });
}

export function useSetFeaturedBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(setFeaturedBadge);
  return useMutation({
    mutationFn: (badgeId: string | null) => fn({ data: { badgeId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Marca a animação "BADGE UNLOCKED" como vista (somente leitura de estado). */
export function useMarkBadgesSeen() {
  const qc = useQueryClient();
  const fn = useServerFn(markBadgesSeen);
  return useMutation({
    mutationFn: (badgeIds: string[]) => fn({ data: { badgeIds } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgeKeys.mine }),
  });
}

/* ---------------------------------- admin ---------------------------------- */

export function useAdminBadges() {
  const fn = useServerFn(adminListBadges);
  return useQuery({ queryKey: badgeKeys.catalog, queryFn: () => fn(), retry: false });
}

export type BadgeFormPayload = {
  id?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  emoji?: string | null;
  category: BadgeCategory;
  rarity: BadgeRarity;
  color?: string | null;
  is_active: boolean;
  admin_only: boolean;
  featurable: boolean;
  sort_order: number;
};

export function useSaveBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(adminSaveBadge);
  return useMutation({
    mutationFn: (payload: BadgeFormPayload) => fn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["badges"] }),
  });
}


export function useToggleBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(adminToggleBadge);
  return useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => fn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["badges"] }),
  });
}

export function useBadgeUserSearch(q: string) {
  const fn = useServerFn(adminSearchBadgeUsers);
  return useQuery({
    queryKey: badgeKeys.search(q),
    queryFn: () => fn({ data: { q } }),
    enabled: q.trim().length >= 2,
    retry: false,
  });
}

export function useGrantBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(adminGrantBadge);
  return useMutation({
    mutationFn: (v: { userId: string; badgeId: string; reason?: string }) => fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useRevokeBadge() {
  const qc = useQueryClient();
  const fn = useServerFn(adminRevokeBadge);
  return useMutation({
    mutationFn: (v: { userId: string; badgeId: string; reason?: string }) => fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badges"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export type GrantFilters = {
  search: string;
  badgeId: string | null;
  rarity: string;
  status: "all" | "active" | "revoked";
};

export function useBadgeGrants(filters: GrantFilters) {
  const fn = useServerFn(adminListGrants);
  return useQuery({
    queryKey: badgeKeys.grants(filters),
    queryFn: () => fn({ data: filters }),
    retry: false,
  });
}

export function useBadgeLogs() {
  const fn = useServerFn(adminBadgeLogs);
  return useQuery({ queryKey: badgeKeys.logs, queryFn: () => fn(), retry: false });
}
