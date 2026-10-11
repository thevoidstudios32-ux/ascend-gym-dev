import { describe, expect, test } from "bun:test";
import { assessmentSchema, buildAssessmentProgram, type TrainingAssessment } from "../src/lib/training-assessment";
import { WEEKDAYS } from "../src/lib/program";

const base: TrainingAssessment = {
  planning_weeks: 8, default_rest_seconds: 90, liked_exercises: [], disliked_exercises: [], restricted_muscles: [], restrictions: "", notes: "", split_preference: "Adaptativa",
  gender: "nao_informado", height_cm: 175, weight_kg: 75, goal: "Hipertrofia",
  experience: "iniciante", days_per_week: 4, available_weekdays: ["SEG", "TER", "QUI", "SEX"],
  minutes_per_session: 45, equipment_mode: "Apenas peso corporal", equipment: ["Peso corporal"],
  priority_muscles: ["Ombros", "Glúteos"],
};
describe("Avaliação ASCEND", () => {
  test("valida contagem de dias e limite de prioridades", () => {
    expect(assessmentSchema.safeParse(base).success).toBe(true);
    expect(assessmentSchema.safeParse({ ...base, available_weekdays: ["SEG"] }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...base, available_weekdays: ["SEG", "SEG", "QUI", "SEX"] }).success).toBe(false);
    expect(assessmentSchema.safeParse({ ...base, priority_muscles: ["Peitoral", "Ombros", "Bíceps", "Tríceps", "Dorsais", "Glúteos"] }).success).toBe(false);
  });
  test("gera 1 a 7 dias apenas na disponibilidade escolhida", () => {
    for (let count = 1; count <= 7; count++) {
      const p = buildAssessmentProgram({ ...base, days_per_week: count, available_weekdays: WEEKDAYS.slice(0, count) });
      expect(p.days.length).toBe(count);
      expect(p.days.map(d => d.weekday)).toEqual(WEEKDAYS.slice(0, count));
      expect(p.days.every(d => d.exercises.length > 0 && d.minutes <= 45)).toBe(true);
      expect(p.split_label.includes("PPL")).toBe(false);
    }
  });
  test("não prescreve máquinas ou barras para peso corporal", () => {
    const p = buildAssessmentProgram(base);
    expect(p.days.flatMap(d => d.exercises).some(e => /supino|halter|máquina|cabo|barra fixa|paralelas/i.test(e.name))).toBe(false);
  });
  test("adapta objetivo, experiência, duração e prioridade", () => {
    const p = buildAssessmentProgram(base);
    const strength = buildAssessmentProgram({ ...base, goal: "Força", experience: "avançado", equipment_mode: "Academia completa", equipment: ["Barra", "Halteres", "Máquina", "Cabo", "Peso corporal"], minutes_per_session: 90 });
    expect(strength.days.flatMap(d => d.exercises).some(e => e.reps === "5-8")).toBe(true);
    expect(strength.days[0]?.exercises.length).toBeGreaterThanOrEqual(p.days[0]?.exercises.length ?? 0);
    expect(strength.days[0]?.exercises[0]?.sets).toBe(3);
    expect(p.days.flatMap(d => d.exercises).some(e => e.name === "Elevação em Y deitado")).toBe(true);
  });
});