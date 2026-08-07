import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomWorkouts } from "@/lib/custom.functions";

export function useCustomWorkouts() {
  const fetcher = useServerFn(listCustomWorkouts);
  return useQuery({ queryKey: ["custom-workouts"], queryFn: () => fetcher() });
}

/** Mutação de treinos personalizados que revalida a lista e o dashboard. */
export function useCustomAction<TInput, TOutput>(fn: (input: { data: TInput }) => Promise<TOutput>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-workouts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
