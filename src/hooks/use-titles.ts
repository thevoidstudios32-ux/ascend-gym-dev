import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { equipTitle, getTitles, markTitleRewardShown } from "@/lib/titles.functions";

export function useTitles() {
  const fetcher = useServerFn(getTitles);
  return useQuery({ queryKey: ["titles"], queryFn: () => fetcher() });
}

export function useEquipTitle() {
  const qc = useQueryClient();
  const equip = useServerFn(equipTitle);
  return useMutation({
    mutationFn: (titleId: string) => equip({ data: { titleId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["titles"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkTitleShown() {
  const qc = useQueryClient();
  const mark = useServerFn(markTitleRewardShown);
  return useMutation({
    mutationFn: (titleId: string) => mark({ data: { titleId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["titles"] }),
  });
}
