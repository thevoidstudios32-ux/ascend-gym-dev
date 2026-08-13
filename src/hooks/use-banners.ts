import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBanners } from "@/lib/content.functions";

/** Catálogo efetivo de banners (código + Admin Panel) com estado de desbloqueio. */
export function useBanners() {
  const fetcher = useServerFn(getBanners);
  return useQuery({ queryKey: ["banners"], queryFn: () => fetcher(), staleTime: 60_000 });
}
