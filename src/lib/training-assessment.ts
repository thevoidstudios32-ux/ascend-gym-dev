import { z } from "zod";
import { EXERCISE_CATALOG, type CatalogExercise } from "@/lib/exercises";
import { WEEKDAYS, type ProgramProposal } from "@/lib/program";

export const ASSESSMENT_MUSCLES = ["Peitoral", "Ombros", "Bíceps", "Tríceps", "Antebraços", "Dorsais", "Trapézio", "Lombar", "Abdômen", "Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilhas"] as const;
export const ASSESSMENT_GOALS = ["Hipertrofia", "Força", "Emagrecimento", "Recomposição corporal", "Performance/condicionamento", "Calistenia"] as const;
export const ASSESSMENT_EQUIPMENT = ["Academia completa", "Academia básica", "Casa", "Apenas peso corporal", "Personalizado"] as const;
export const assessmentSchema = z.object({
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
});
export type TrainingAssessment = z.infer<typeof assessmentSchema>;

const extra: CatalogExercise[] = [
  { name: "Remada auto-resistida", emoji: "", group: "Costas", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Dorsais", "Bíceps"], tip: "Uma mão resiste à puxada do braço oposto, sem prender a respiração." },
  { name: "Elevação em Y deitado", emoji: "", group: "Ombro", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Ombros", "Trapézio"], tip: "Deitado de bruços, eleve os braços em Y sem arquear a coluna." },
  { name: "Extensão de quadril em quatro apoios", emoji: "", group: "Glúteos", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Glúteos", "Posterior de coxa"], tip: "Mantenha a coluna neutra e eleve a perna sem girar o quadril." },
  { name: "Panturrilha sem carga", emoji: "", group: "Pernas", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Panturrilhas"], tip: "Use apoio estável, suba e desça os calcanhares com controle." },
  { name: "Bird dog", emoji: "", group: "Abdômen", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Lombar", "Abdômen"], tip: "Em quatro apoios, estenda braço e perna opostos sem rodar o tronco." },
  { name: "Flexão de punhos auto-resistida", emoji: "", group: "Bíceps", equipment: "Peso corporal", difficulty: "Iniciante", muscles: ["Antebraços"], tip: "A mão oposta oferece resistência leve à flexão do punho." },
];
const aliases: Record<string, string[]> = {
  Peitoral: ["Peito", "Peitoral"], Ombros: ["Ombro", "Deltoide"], Dorsais: ["Costas", "Dorsal"],
  Quadríceps: ["Quadríceps"], "Posterior de coxa": ["Posterior"], Panturrilhas: ["Panturrilha"],
  Antebraços: ["Antebraço", "Braquiorradial"],
};
function targets(ex: CatalogExercise, muscle: string) {
  const text = `${ex.group} ${ex.muscles.join(" ")}`.toLocaleLowerCase("pt-BR");
  return (aliases[muscle] ?? [muscle]).some(m => text.includes(m.toLocaleLowerCase("pt-BR")));
}

/** Initial program uses the existing catalog; AI remains an opt-in proposal workflow. */
export function buildAssessmentProgram(a: TrainingAssessment, rest = 90): ProgramProposal {
  const strength = a.goal === "Força";
  const rank = { Iniciante: 0, Intermediário: 1, Avançado: 2 };
  const level = a.experience === "iniciante" ? 0 : a.experience === "intermediário" ? 1 : 2;
  const catalog = [...EXERCISE_CATALOG, ...extra].filter(e => {
    if (rank[e.difficulty] > level) return false;
    if (e.name === "Barra fixa") return a.equipment.includes("Barra fixa");
    if (e.name === "Paralelas") return a.equipment.includes("Paralelas");
    if (e.name === "Mergulho no banco") return a.equipment_mode !== "Apenas peso corporal";
    return a.equipment.includes(e.equipment) && (a.goal !== "Calistenia" || e.equipment === "Peso corporal");
  });
  const full = a.days_per_week <= 3;
  const weekdays = WEEKDAYS.filter(w => a.available_weekdays.includes(w));
  const sets = level === 0 ? 2 : 3;
  const count = Math.max(3, Math.min(8, Math.floor(a.minutes_per_session * 60 / (sets * (45 + rest) + 60))));
  const days = weekdays.map((weekday, i) => {
    const upper = i % 2 === 0;
    const groups: CatalogExercise["group"][] = full
      ? ["Peito", "Costas", "Pernas", "Ombro", "Abdômen"]
      : upper ? ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps"] : ["Pernas", "Glúteos", "Abdômen"];
    const pool = catalog.filter(e => groups.includes(e.group));
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
    return {
      key: `avaliacao-${weekday.toLowerCase()}`, weekday,
      title: full ? `Corpo inteiro ${i + 1}` : `${upper ? "Superiores" : "Inferiores"} ${Math.floor(i / 2) + 1}`,
      focus: full ? "Corpo inteiro" : upper ? "Superiores" : "Inferiores e core",
      muscles: [...new Set(chosen.map(e => e.group))],
      intensity: (level === 0 || (i > 0 && WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(weekdays[i - 1] ?? "SEG") === 1 && full) ? "leve" : "moderado") as "leve" | "moderado",
      minutes: Math.min(a.minutes_per_session, Math.max(10, Math.ceil(chosen.length * (sets * (45 + rest) + 60) / 60))),
      exercises: chosen.map(e => ({ name: e.name, emoji: e.emoji, muscle: e.muscles[0] ?? e.group, sets,
        reps: e.name.includes("Prancha") ? "20-40s" : strength && e.equipment !== "Peso corporal" ? "5-8" : "10-15",
        rest, purpose: e.tip })),
    };
  });
  return { name: "Seu programa ASCEND", goal: a.goal, split_label: full ? "Corpo inteiro adaptativo" : "Superiores / Inferiores adaptativo",
    days_per_week: days.length, priorities: a.priority_muscles, week_focus: a.priority_muscles.join(" · ") || "Evolução equilibrada",
    notes: "Programa inicial montado a partir da avaliação. Progrida gradualmente e interrompa exercícios que causem dor.",
    days, summary: `Programa para ${days.length} dias, com sessões de até ${a.minutes_per_session} minutos e equipamentos disponíveis.`,
    changes: ["Atualizar o programa com os dados da avaliação inicial."] };
}