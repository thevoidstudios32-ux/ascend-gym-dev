import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBroNudges, getSocial } from "@/lib/social.functions";

export function useSocial() {
  const fetcher = useServerFn(getSocial);
  return useQuery({ queryKey: ["social"], queryFn: () => fetcher() });
}

export function useNudges(enabled = true) {
  const fetcher = useServerFn(getBroNudges);
  return useQuery({
    queryKey: ["social-nudges"],
    queryFn: () => fetcher(),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}

/** Mutação social genérica que revalida o feed depois de concluir. */
export function useSocialAction<TInput, TOutput>(fn: (input: { data: TInput }) => Promise<TOutput>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social"] });
      qc.invalidateQueries({ queryKey: ["thread"] });
    },
  });
}
