/* Coach IA aplicado a treinos: gera propostas de alteração (nunca salva sozinho). */

import type { CustomExercise, Proposal } from "@/lib/custom";

import { aiChat } from "@/lib/ai-provider.server";

const schema = {
  name: "propose_workout",
  description: "Devolve a versão proposta do treino do atleta.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      focus: { type: "string" },
      emoji: { type: "string" },
      difficulty: { type: "string", enum: ["iniciante", "intermediário", "avançado"] },
      notes: { type: "string" },
      summary: { type: "string", description: "1-2 frases explicando a proposta, em português." },
      changes: {
        type: "array",
        description: "Lista curta de alterações, ex.: 'Supino → Flexão', '4 séries → 3 séries'.",
        items: { type: "string" },
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            emoji: { type: "string" },
            muscle: { type: "string" },
            sets: { type: "integer" },
            reps: { type: "string" },
            rest: { type: "integer" },
            hold: { type: ["integer", "null"] },
            tip: { type: "string" },
          },
          required: ["name", "emoji", "muscle", "sets", "reps", "rest", "tip"],
        },
      },
    },
    required: ["name", "focus", "emoji", "difficulty", "summary", "changes", "exercises"],
  },
} as const;

export async function proposeWorkout(input: {
  request: string;
  workout: { name: string; focus: string; emoji: string; difficulty: string; notes: string | null; exercises: CustomExercise[] };
  athlete: string;
  userId?: string | null;
}): Promise<Proposal> {
  const json = (await aiChat({
    meta: { userId: input.userId ?? null, feature: "treino-personalizado" },
    maxTokens: 3_000,
    timeoutMs: 75_000,
    messages: [
      {
        role: "system",
        content:
          "Você é o Coach IA do ASCEND. Receberá o treino atual do atleta e um pedido de ajuste. " +
          "Devolva SEMPRE a versão completa do treino proposto pela função propose_workout, em português do Brasil. " +
          "Respeite o pedido, mantenha coerência de volume, descanso e progressão, e use 'hold' (segundos) " +
          "apenas em exercícios isométricos. Nunca invente equipamentos que o atleta disse não ter.\n\nATLETA:\n" +
          input.athlete,
      },
      {
        role: "user",
        content: `PEDIDO: ${input.request}\n\nTREINO ATUAL (JSON):\n` + JSON.stringify(input.workout),
      },
    ],
    tools: [{ type: "function", function: schema }],
    tool_choice: { type: "function", function: { name: "propose_workout" } },
  })) as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] };
  const raw = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) throw new Error("O coach não conseguiu montar a proposta. Tente reformular o pedido.");

  const parsed = JSON.parse(raw) as Partial<Proposal>;
  const exercises = (parsed.exercises ?? []).slice(0, 20).map((e) => ({
    name: String(e.name ?? "").slice(0, 80) || "Exercício",
    emoji: String(e.emoji ?? "🤸").slice(0, 4),
    muscle: String(e.muscle ?? "").slice(0, 40),
    sets: Math.min(10, Math.max(1, Number(e.sets) || 3)),
    reps: String(e.reps ?? "10").slice(0, 20),
    rest: Math.min(600, Math.max(10, Number(e.rest) || 60)),
    hold: e.hold == null ? null : Math.min(600, Math.max(1, Number(e.hold))),
    tip: String(e.tip ?? "").slice(0, 200),
  }));
  if (!exercises.length) throw new Error("A proposta veio vazia. Tente reformular o pedido.");

  return {
    name: String(parsed.name ?? input.workout.name).slice(0, 60),
    focus: String(parsed.focus ?? input.workout.focus).slice(0, 60),
    emoji: String(parsed.emoji ?? input.workout.emoji ?? "🤸").slice(0, 4),
    difficulty: ["iniciante", "intermediário", "avançado"].includes(String(parsed.difficulty))
      ? String(parsed.difficulty)
      : input.workout.difficulty,
    notes: parsed.notes ? String(parsed.notes).slice(0, 500) : input.workout.notes,
    exercises,
    summary: String(parsed.summary ?? "Proposta de ajuste do treino.").slice(0, 400),
    changes: (parsed.changes ?? []).slice(0, 12).map((c) => String(c).slice(0, 120)),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Guarda uma cópia da versão atual do treino antes de sobrescrevê-la. */
export async function snapshotWorkout(
  supabase: any,
  userId: string,
  workoutId: string,
  reason: string,
) {
  const { data: current } = await supabase
    .from("custom_workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!current) return;
  await supabase.from("custom_workout_versions").insert({
    workout_id: workoutId,
    user_id: userId,
    name: current.name,
    focus: current.focus,
    notes: current.notes,
    exercises: current.exercises,
    reason,
  });
}
