import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getArena, getBattle, getRanking } from "@/lib/arena.functions";
import type { ArenaRange } from "@/lib/arena";

export function useArena() {
  const fetcher = useServerFn(getArena);
  return useQuery({ queryKey: ["arena"], queryFn: () => fetcher() });
}

export function useBattle(category: string) {
  const fetcher = useServerFn(getBattle);
  return useQuery({
    queryKey: ["arena-battle", category],
    queryFn: () => fetcher({ data: { category } }),
    staleTime: 0,
  });
}

export function useRanking(category: string, range: ArenaRange) {
  const fetcher = useServerFn(getRanking);
  return useQuery({
    queryKey: ["arena-ranking", category, range],
    queryFn: () => fetcher({ data: { category, range } }),
  });
}

/** Mutação da Arena que revalida batalhas, ranking e participações. */
export function useArenaAction<TInput, TOutput>(fn: (input: { data: TInput }) => Promise<TOutput>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arena"] });
      qc.invalidateQueries({ queryKey: ["arena-battle"] });
      qc.invalidateQueries({ queryKey: ["arena-ranking"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
