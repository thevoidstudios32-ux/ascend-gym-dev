/* ASCEND AI PROGRAM — hooks React Query. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  applyProgram,
  getProgram,
  proposeProgramChange,
  respondRecommendation,
  saveTrainingPreferences,
  sendTrainingFeedback,
  startProgramDay,
} from "@/lib/program.functions";
import type { Program, TrainingPreferences } from "@/lib/program";

export const PROGRAM_KEY = ["ai-program"] as const;

export function useProgram() {
  const fetcher = useServerFn(getProgram);
  return useQuery({ queryKey: PROGRAM_KEY, queryFn: () => fetcher() });
}

function useProgramInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: PROGRAM_KEY });
  };
}

export function useSavePreferences() {
  const fn = useServerFn(saveTrainingPreferences);
  const invalidate = useProgramInvalidate();
  return useMutation({
    mutationFn: (data: TrainingPreferences) => fn({ data }),
    onSuccess: invalidate,
  });
}

/** Gera uma proposta da IA (nunca salva sozinha). */
export function useProposeProgram() {
  const fn = useServerFn(proposeProgramChange);
  return useMutation({
    mutationFn: (request: string) => fn({ data: { request } }),
  });
}

export function useApplyProgram() {
  const fn = useServerFn(applyProgram);
  const invalidate = useProgramInvalidate();
  return useMutation({
    mutationFn: (input: { reason: string; program: Omit<Program, "id" | "version" | "active" | "updated_at"> }) =>
      fn({ data: input }),
    onSuccess: invalidate,
  });
}

export function useRespondRecommendation() {
  const fn = useServerFn(respondRecommendation);
  const invalidate = useProgramInvalidate();
  return useMutation({
    mutationFn: (input: { id: string; status: "accepted" | "dismissed" }) => fn({ data: input }),
    onSuccess: invalidate,
  });
}

export function useTrainingFeedback() {
  const fn = useServerFn(sendTrainingFeedback);
  const invalidate = useProgramInvalidate();
  return useMutation({
    mutationFn: (input: {
      dayKey: string | null;
      rating: "leve" | "ideal" | "pesado" | "dolorido";
      durationMin: number | null;
      comment: string | null;
    }) => fn({ data: input }),
    onSuccess: invalidate,
  });
}

/** Materializa um dia do programa como treino personalizado e devolve o id. */
export function useStartProgramDay() {
  const fn = useServerFn(startProgramDay);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dayKey: string) => fn({ data: { dayKey } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-workouts"] });
    },
  });
}
