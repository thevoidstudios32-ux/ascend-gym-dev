import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStories } from "@/lib/stories.functions";

/**
 * Conjunto de usuários com Story ativo (24h). Compartilha a mesma query
 * ["stories"] usada pela barra de stories, então não há fetch extra.
 */
export function useActiveStoryUsers(): Set<string> {
  const fetcher = useServerFn(getStories);
  const { data } = useQuery({
    queryKey: ["stories"],
    queryFn: () => fetcher(),
    staleTime: 60_000,
    retry: false,
  });
  return useMemo(
    () => new Set(((data?.stories ?? []) as { user_id: string }[]).map((s) => s.user_id)),
    [data],
  );
}

/** True quando o usuário informado tem Story ativo — dispara o light sweep. */
export function useHasStory(userId?: string | null) {
  const active = useActiveStoryUsers();
  return !!userId && active.has(userId);
}
