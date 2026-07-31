import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/ascend.functions";
import { getExtras } from "@/lib/extras.functions";

export function useDashboard() {
  const fetcher = useServerFn(getDashboard);
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetcher(),
  });
}

export function useExtras() {
  const fetcher = useServerFn(getExtras);
  return useQuery({
    queryKey: ["extras"],
    queryFn: () => fetcher(),
  });
}

export function useRefreshDashboard() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["extras"] });
  };
}
