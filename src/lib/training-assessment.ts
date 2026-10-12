import { z } from "zod";
import { EXERCISE_CATALOG, type CatalogExercise } from "@/lib/exercises";
import { WEEKDAYS, buildPlanningWeeks, type ProgramProposal } from "@/lib/program";

export const ASSESSMENT_MUSCLES = ["Peitoral", "Ombros", "Bíceps", "Tríceps", "Antebraços", "Dorsais", "Trapézio", "Lombar", "Abdômen", "Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilhas"] as const;
export const ASSESSMENT_GOALS = ["Hipertrofia", "Força", "Emagrecimento", "Recomposição corporal", "Performance/condicionamento", "Calistenia"] as const;
export const ASSESSMENT_EQUIPMENT = ["Academia completa", "Academia básica", "Casa", "Apenas peso corporal", "Personalizado"] as const;
export const assessmentSchema = z.object({
  planning_weeks: z.number().int().min(1).max(12),
  default_rest_seconds: z.number().int().min(15).max(600).default(90),
  liked_exercises: z.array(z.string().max(80)).max(20).default([]),
  disliked_exercises: z.array(z.string().max(80)).max(20).default([]),
  restricted_muscles: z.array(z.enum(ASSESSMENT_MUSCLES)).max(13).default([]),
  restrictions: z.string().max(400).default(""),
  notes: z.string().max(400).default(""),
  split_preference: z.enum(["Adaptativa", "Corpo inteiro", "Superiores / Inferiores"]).default("Adaptativa"),
  gender: z.enum(["masculino", "feminino", "nao_informado"]),
  height_cm: z.number().min(100).max(250),
  weight_kg: z.number().min(30).max(300),
  goal: z.enum(ASSESSMENT_GOALS),
  experience: z.enum(["iniciante", "intermediário", "avançado"]),
  days_per_week: z.number().int().min(1).max(7),
  available_weekdays: z.array(z.enum(WEEKDAYS)).min(1).max(7),
  minutes_per_session: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(75), z.literal(90)]),
  equipment_mode: z.enum(ASSESSMENT_EQUIPMENT),
  equipment: z.array(z.enum(["Máquina", "Barra", "Halteres", "Cabo", "Peso corporal", "Barra fixa", "Paralelas"])).min(1).max(7),
  priority_muscles: z.array(z.enum(ASSESSMENT_MUSCLES)).max(5),
}).superRefine((data, ctx) => {
  if (new Set(data.available_weekdays).size !== data.days_per_week || data.available_weekdays.length !== data.days_per_week)
    ctx.addIssue({ code: "custom", path: ["available_weekdays"], message: "Selecione exatamente a quantidade de dias informada." });
  if (new Set(data.priority_muscles).size !== data.priority_muscles.length)
    ctx.addIssue({ code: "custom", path: ["priority_muscles"], message: "Não repita prioridades musculares." });
  if (data.priority_muscles.some(m => data.restricted_muscles.includes(m))) ctx.addIssue({ code: "custom", path: ["priority_muscles"], message: "Um músculo não pode ser prioridade e exclusão ao mesmo tempo." });
  if (data.liked_exercises.some(e => data.disliked_exercises.includes(e))) ctx.addIssue({ code: "custom", path: ["liked_exercises"], message: "Um exercício não pode ser preferido e excluído ao mesmo tempo." });
});
export type TrainingAssessment = z.infer<typeof assessmentSchema>;

const aliases: Record<string, string[]> = {
  Peitoral: ["Peito", "Peitoral"], Ombros: ["Ombro", "Deltoide"], Dorsais: ["Costas", "Dorsal"],
  Quadríceps: ["Quadríceps"], "Posterior de coxa": ["Posterior"], Panturrilhas: ["Panturrilha"],
  Antebraços: ["Antebraço", "Braquiorradial"],
  Glúteos: ["Glúteo"],
};
function targets(ex: CatalogExercise, muscle: string) {
  const text = `${ex.group} ${ex.muscles.join(" ")}`.toLocaleLowerCase("pt-BR");
  return (aliases[muscle] ?? [muscle]).some(m => text.includes(m.toLocaleLowerCase("pt-BR")));
}

/** Initial program uses the existing catalog; AI remains an opt-in proposal workflow. */
export function buildAssessmentProgram(a: TrainingAssessment, rest = a.default_rest_seconds): ProgramProposal {
  if (a.restrictions.trim()) throw new Error("Restrições clínicas precisam de orientação profissional antes de gerar o plano. Marque os músculos e exercícios a evitar, ou revise esta informação com seu profissional.");
  const strength = a.goal === "Força";
  const conditioning = a.goal === "Emagrecimento" || a.goal === "Performance/condicionamento";
  const sessionRest = Math.min(rest, conditioning ? 60 : strength ? 180 : 120);
  const catalog = compatibleAssessmentExercises(a);
  const level = a.experience === "iniciante" ? 0 : a.experience === "intermediário" ? 1 : 2;
  const full = a.split_preference === "Corpo inteiro" || (a.split_preference !== "Superiores / Inferiores" && a.days_per_week <= 3);
  const weekdays = WEEKDAYS.filter(w => a.available_weekdays.includes(w));
  const sets = level === 0 ? 2 : 3;
  const count = Math.max(1, Math.min(8, Math.floor(a.minutes_per_session * 60 / (sets * (45 + sessionRest) + 60))));
  const days = weekdays.map((weekday, i) => {
    const upper = i % 2 === 0;
    const groups: CatalogExercise["group"][] = full
      ? ["Peito", "Costas", "Pernas", "Ombro", "Abdômen"]
      : upper ? ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps"] : ["Pernas", "Glúteos", "Abdômen"];
    const pool = catalog.filter(e => groups.includes(e.group)).sort((x, y) => Number(a.liked_exercises.includes(y.name)) - Number(a.liked_exercises.includes(x.name)));
    const chosen: CatalogExercise[] = [];
    const add = (candidates: CatalogExercise[]) => {
      const options = candidates.filter(e => !chosen.includes(e));
      const e = options[i % Math.max(1, options.length)];
      if (e && chosen.length < count) chosen.push(e);
    };
    // Maintain balanced coverage before filling slots with selected priorities.
    for (const group of groups.slice(0, full ? 3 : 2)) add(pool.filter(e => e.group === group));
    for (const muscle of a.priority_muscles) add(pool.filter(e => targets(e, muscle)));
    for (const group of groups) add(pool.filter(e => e.group === group));
    for (const e of pool) if (chosen.length < count && !chosen.includes(e)) chosen.push(e);
    if (!chosen.length) throw new Error("Não há exercícios compatíveis para este dia. Revise equipamentos, divisão e exclusões.");
    return {
      key: `avaliacao-${weekday.toLowerCase()}`, weekday,
      title: full ? `Corpo inteiro ${i + 1}` : `${upper ? "Superiores" : "Inferiores"} ${Math.floor(i / 2) + 1}`,
      focus: full ? "Corpo inteiro" : upper ? "Superiores" : "Inferiores e core",
      muscles: [...new Set(chosen.map(e => e.group))],
      intensity: (level === 0 || (i > 0 && WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(weekdays[i - 1] ?? "SEG") === 1 && full) ? "leve" : "moderado") as "leve" | "moderado",
      minutes: Math.min(a.minutes_per_session, Math.max(10, Math.ceil(chosen.length * (sets * (45 + sessionRest) + 60) / 60))),
      exercises: chosen.map(e => ({ name: e.name, emoji: e.emoji, muscle: e.muscles[0] ?? e.group, sets,
        reps: e.name.includes("Prancha") ? "20-40s" : strength && e.equipment !== "Peso corporal" ? "5-8" : conditioning ? "12-20" : "10-15",
        rest: sessionRest, purpose: e.tip })),
    };
  });
  return { planning_model: 2, planning_weeks: a.planning_weeks, weeks: buildPlanningWeeks(days, a.planning_weeks), name: "Seu programa ASCEND", goal: a.goal, split_label: full ? "Corpo inteiro adaptativo" : "Superiores / Inferiores adaptativo",
    days_per_week: days.length, priorities: a.priority_muscles, week_focus: a.priority_muscles.join(" · ") || "Evolução equilibrada",
    notes: "Programa inicial montado a partir da avaliação. Progrida gradualmente e interrompa exercícios que causem dor.",
    days, summary: `Planejamento de ${a.planning_weeks} semanas para ${days.length} dias, com sessões de até ${a.minutes_per_session} minutos e equipamentos disponíveis.`,
    changes: ["Atualizar o programa com os dados da avaliação inicial."] };
}
/** Convert only known compatible legacy values; leave missing answers blank. */
export function assessmentInitial(profile: Record<string, unknown> | null | undefined, prefs?: Record<string, unknown> | null): Record<string, unknown> {
  const saved = profile?.["training_assessment"];
  const source = { ...(profile ?? {}), ...(prefs ?? {}), ...(saved && typeof saved === "object" ? saved : {}) } as Record<string, unknown>;
  // Nullable legacy optional answers are blanks, not invalid enum/array values.
  for (const key of ["restrictions", "notes"]) if (source[key] == null) source[key] = "";
  const equipmentMap: Record<string, string[]> = { "Academia completa": ["Máquina","Barra","Halteres","Cabo","Peso corporal","Barra fixa","Paralelas"], "Máquinas": ["Máquina"], "Barra e anilhas": ["Barra"], "Peso do corpo": ["Peso corporal"] };
  const oldEquipment = Array.isArray(source["equipment"]) ? source["equipment"] as string[] : [];
  const equipment = [...new Set(oldEquipment.flatMap(e => equipmentMap[e] ?? (["Máquina","Barra","Halteres","Cabo","Peso corporal","Barra fixa","Paralelas"].includes(e) ? [e] : [])))];
  const muscleMap: Record<string,string> = { Peito: "Peitoral", Costas: "Dorsais", Ombro: "Ombros", Core: "Abdômen" };
  const priorities = Array.isArray(source["priority_muscles"]) ? (source["priority_muscles"] as string[]).map(m => muscleMap[m] ?? m).filter(m => (ASSESSMENT_MUSCLES as readonly string[]).includes(m)).slice(0,5) : [];
  const result: Record<string, unknown> = { available_weekdays: [], ...source, equipment, priority_muscles: priorities };
  const goal = ASSESSMENT_GOALS.find(g => g.toLowerCase() === String(source["goal"]).toLowerCase());
  if (goal) result["goal"] = goal; else delete result["goal"];
  if (!ASSESSMENT_EQUIPMENT.includes(source["equipment_mode"] as typeof ASSESSMENT_EQUIPMENT[number]) && equipment.length) result["equipment_mode"] = "Personalizado";
  if (![30,45,60,75,90].includes(Number(result["minutes_per_session"]))) delete result["minutes_per_session"];
  if (!["Adaptativa","Corpo inteiro","Superiores / Inferiores"].includes(String(result["split_preference"]))) delete result["split_preference"];
  if (!["masculino","feminino","nao_informado"].includes(String(result["gender"]))) delete result["gender"];
  return result;
}

export function compatibleAssessmentExercises(a: TrainingAssessment): CatalogExercise[] {
  const rank = { Iniciante: 0, Intermediário: 1, Avançado: 2 };
  const level = a.experience === "iniciante" ? 0 : a.experience === "intermediário" ? 1 : 2;
  return EXERCISE_CATALOG.filter(e => {
    if (a.disliked_exercises.includes(e.name) || a.restricted_muscles.some(m => targets(e, m))) return false;
    if (rank[e.difficulty] > level) return false;
    if (e.name === "Barra fixa") return a.equipment.includes("Barra fixa");
    if (e.name === "Paralelas") return a.equipment.includes("Paralelas");
    if (e.name === "Mergulho no banco") return ["Academia completa", "Academia básica"].includes(a.equipment_mode);
    return (a.equipment.includes(e.equipment) || e.equipment === "Peso corporal") && (a.goal !== "Calistenia" || e.equipment === "Peso corporal");
  });
}
