/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ASCEND AI PROGRAM — geração/ajuste do programa semanal pelo Coach IA.
 * Server-only. Usa JSON estruturado para receber uma proposta completa.
 */
import type { ProgramDay, ProgramExercise, ProgramProposal, TrainingPreferences } from "@/lib/program";
import { WEEKDAYS } from "@/lib/program";
import { computeStreak, todayISO } from "@/lib/ascend";
import { aiChat, type AiMessage } from "@/lib/ai-provider.server";
import { jsonrepair } from "jsonrepair";
import { coachExerciseReferences } from '@/lib/exercise-coach-context';

const exerciseSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    emoji: { type: "string" },
    muscle: { type: "string" },
    sets: { type: "integer" },
    reps: { type: "string" },
    rest: { type: "integer" },
    purpose: { type: "string", description: "Por que este exercício está no dia (1 frase)." },
  },
  required: ["name", "emoji", "muscle", "sets", "reps", "rest", "purpose"],
} as const;

const schema = {
  name: "propose_program",
  description: "Devolve o programa semanal completo proposto para o atleta.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string" },
      goal: { type: "string" },
      split_label: { type: "string", description: "Ex.: 'Push / Pull / Legs + Upper'." },
      days_per_week: { type: "integer" },
      priorities: { type: "array", items: { type: "string" } },
      week_focus: { type: "string" },
      notes: { type: "string" },
      summary: { type: "string", description: "1-2 frases explicando a proposta, em português." },
      changes: { type: "array", items: { type: "string" } },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string", description: "slug curto, ex.: 'push-a'" },
            weekday: { type: "string", enum: [...WEEKDAYS] },
            title: { type: "string" },
            focus: { type: "string" },
            muscles: { type: "array", items: { type: "string" } },
            intensity: { type: "string", enum: ["pesado", "moderado", "leve", "recovery"] },
            minutes: { type: "integer" },
            exercises: { type: "array", items: exerciseSchema },
          },
          required: ["key", "weekday", "title", "focus", "muscles", "intensity", "minutes", "exercises"],
        },
      },
    },
    required: ["name", "goal", "split_label", "days_per_week", "priorities", "summary", "changes", "days"],
  },
} as const;

async function callGateway(body: {
  messages: AiMessage[];
  userId?: string | null | undefined;
}) {
  const input: Parameters<typeof aiChat>[0] = {
    messages: body.messages,
    response_format: { type: "json_object" },
    maxTokens: 3_500,
    timeoutMs: 55_000,
    meta: { userId: body.userId ?? null, feature: "programa-ia" },
  };
  return await aiChat(input) as any;
}

function str(v: unknown, max: number, fallback = "") {
  const s = String(v ?? "").trim();
  return (s || fallback).slice(0, max);
}

function num(v: unknown, min: number, max: number, fallback: number) {
  const n = Number(v);
  return Math.min(max, Math.max(min, Number.isFinite(n) ? Math.round(n) : fallback));
}

function list(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

function parseCoachResponse(raw: unknown): any | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  const text = Array.isArray(raw)
    ? raw
        .map((part) => {
          if (typeof part === "string") return part;
          if (!part || typeof part !== "object") return "";
          const value = part as { text?: unknown; content?: unknown };
          return typeof value.text === "string"
            ? value.text
            : typeof value.content === "string"
              ? value.content
              : "";
        })
        .join("")
        .trim()
    : typeof raw === "string"
      ? raw.trim()
      : "";

  if (!text) return null;

  const candidates = [text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")];
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
    } catch {
      try {
        const repaired = JSON.parse(jsonrepair(candidate));
        if (repaired && typeof repaired === "object" && !Array.isArray(repaired)) {
          return repaired;
        }
      } catch {
        // Tenta o próximo formato; nunca repete a chamada paga de IA.
      }
    }
  }
  return null;
}

function sanitizeDay(raw: any, index: number, defaultRestSeconds = 90): ProgramDay {
  const exercises: ProgramExercise[] = list(raw?.exercises).slice(0, 12).map((e: any) => ({
    name: str(e?.name, 80, "Exercício"),
    emoji: str(e?.emoji, 4, "🏋️"),
    muscle: str(e?.muscle, 40),
    sets: num(e?.sets, 1, 10, 3),
    reps: str(e?.reps, 20, "8-12"),
    rest: num(e?.rest, 15, 600, defaultRestSeconds),
    purpose: str(e?.purpose, 200),
  }));

  const weekday = WEEKDAYS.includes(raw?.weekday) ? raw.weekday : (WEEKDAYS[index % 7] ?? "SEG");
  const intensity = ["pesado", "moderado", "leve", "recovery"].includes(raw?.intensity)
    ? raw.intensity
    : "moderado";

  return {
    key: str(raw?.key, 30, `dia-${index + 1}`).toLowerCase().replace(/\s+/g, "-"),
    weekday,
    title: str(raw?.title, 60, `Treino ${index + 1}`),
    focus: str(raw?.focus, 60, "Corpo inteiro"),
    muscles: list(raw?.muscles).slice(0, 8).map((m: unknown) => str(m, 30)).filter(Boolean),
    intensity,
    minutes: num(raw?.minutes, 10, 180, 60),
    exercises,
  };
}

export type ProposeInput = {
  request: string;
  preferences: TrainingPreferences;
  current: { name: string; split_label: string; days: ProgramDay[] } | null;
  athlete: string;
  userId?: string | null;
};

export async function proposeProgram(input: ProposeInput): Promise<ProgramProposal> {
  const compactCurrent = input.current
    ? {
        name: input.current.name,
        split_label: input.current.split_label,
        days: input.current.days.map((day) => ({
          key: day.key,
          weekday: day.weekday,
          title: day.title,
          focus: day.focus,
          intensity: day.intensity,
          minutes: day.minutes,
          exercises: day.exercises.map((exercise) => ({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest: exercise.rest,
          })),
        })),
      }
    : null;

  const json = await callGateway({
    userId: input.userId,
    messages: [
      {
        role: "system",
        content:
          "Você é o Coach IA do ASCEND. Monta e ajusta o PROGRAMA SEMANAL de treino do atleta. " +
          "Responda SEMPRE em português do Brasil e devolva somente JSON válido, sem markdown. " +
          "Use esta estrutura compacta: {name,goal,split_label,summary,changes,days}. " +
          "Cada item de days deve ter somente {weekday,title,focus,intensity,minutes,exercises}; " +
          "cada exercício deve ter somente {name,muscle,sets,reps,rest}. " +
          "Regras: escolha a divisão pelo objetivo e experiência, nunca atribua PPL fixo. Use apenas available_weekdays quando informados e exatamente days_per_week dias, exceto quando o pedido mudar explicitamente a frequência semanal. Para pedidos sobre hoje, altere somente a sessão correspondente e devolva os demais dias intactos. Respeite a duração por sessão; respeite equipamentos " +
           "use o descanso entre séries indicado nas preferências como padrão em todos os exercícios, " +
           "ajustando-o apenas quando a intensidade do exercício exigir; " +
          "disponíveis e restrições/lesões (nunca prescreva o que o atleta não pode fazer); distribua o volume " +
          "de forma equilibrada priorizando os músculos que o atleta escolheu; considere a RECUPERAÇÃO " +
          "(não coloque dois dias pesados seguidos para o mesmo grupo, inclua dias leves/recovery quando " +
          "a frequência for alta); evite exercícios que o atleta não gosta e favoreça os que ele gosta. " +
           "Dimensione 3 a 8 exercícios pelo tempo disponível, contando execução e descanso. Mantenha os textos curtos. No campo changes, detalhe Remover/Adicionar com nome, séries e repetições. " +
          "Se houver contexto do Shape Tracker, use apenas como preferência estética de prioridade muscular — " +
          "nunca faça diagnóstico, avaliação médica ou julgamento corporal. Nunca invente dados do atleta.\n\n" +
          "ATLETA:\n" + input.athlete + '\n\n' + coachExerciseReferences(input.current?.days.flatMap(d => d.exercises.map(e => e.name)) ?? [], input.request),
      },
      {
        role: "user",
        content:
          `PEDIDO: ${input.request}\n\nPREFERÊNCIAS (JSON):\n${JSON.stringify(input.preferences)}\n\n` +
          `PROGRAMA ATUAL RESUMIDO (JSON, null = criar do zero):\n${JSON.stringify(compactCurrent)}`,
      },
    ],
  });

  const raw =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) throw new Error("O coach não conseguiu montar o programa. Tente reformular o pedido.");

  const parsed = parseCoachResponse(raw);
  if (!parsed) {
    throw new Error("A resposta do Coach veio incompleta. Tente gerar novamente.");
  }
  const days = list(parsed.days)
    .slice(0, 7)
    .map((day, index) => sanitizeDay(day, index, input.preferences.default_rest_seconds));
  if (!days.length || days.some(d => !d.exercises.length)) throw new Error("A proposta veio incompleta. Tente novamente.");
  const requestedDays = input.request.match(/(?:treinar|treino|consigo treinar)\s+(\d)\s+dias/i);
  const expectedCount = requestedDays ? Number(requestedDays[1]) : input.preferences.days_per_week;
  if (days.length !== expectedCount) throw new Error("A proposta não respeitou a quantidade de dias disponível. Gere novamente.");
  const available = input.preferences.available_weekdays ?? [];
  if (!requestedDays && available.length && days.some(d => !available.includes(d.weekday))) throw new Error("A proposta não respeitou seus dias disponíveis. Gere novamente.");
  if (new Set(days.map(d => d.weekday)).size !== days.length) throw new Error("A proposta repetiu dias de treino. Gere novamente.");

  return {
    name: str(parsed.name, 60, "ASCEND AI Program"),
    goal: str(parsed.goal, 40, input.preferences.goal),
    split_label: str(parsed.split_label, 60, "Personalizado"),
    days_per_week: days.length,
    priorities: list(parsed.priorities ?? input.preferences.priority_muscles).slice(0, 5).map((p: unknown) => str(p, 30)).filter(Boolean),
    week_focus: parsed.week_focus ? str(parsed.week_focus, 200) : null,
    notes: parsed.notes ? str(parsed.notes, 600) : null,
    days,
    summary: str(parsed.summary, 400, "Proposta de programa."),
    changes: list(parsed.changes).slice(0, 12).map((c: unknown) => str(c, 140)).filter(Boolean),
  };
}

/* --------------------------- contexto do atleta --------------------------- */

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayISO(d);
}

/**
 * Contexto real do atleta (treinos, cargas, feedback e Shape Tracker).
 * Somente fatos registrados — nada é inventado.
 */
export async function buildProgramContext(supabase: any, userId: string) {
  const since30 = daysAgoISO(30);

  const [profileRes, workoutsRes, setsRes, feedbackRes, photosRes, preferencesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("name,gender,goal,experience,age,weight_kg,height_cm,days_per_week,equipment,injuries,xp")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("date,title,duration_min,kind")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(40),
    supabase
      .from("exercise_sets")
      .select("exercise,reps,weight_kg,date,rir")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(100),
    supabase
      .from("training_feedback")
      .select("day_key,rating,duration_min,comment,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("progress_photos")
      .select("date,pose,analysis")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(4),
    supabase.from("training_preferences").select("exercise_memory,disliked_exercises,restrictions").eq("user_id",userId).maybeSingle(),
  ]);

  const profile = profileRes.data ?? null;
  const workouts = (workoutsRes.data ?? []) as { date: string; title: string; duration_min: number }[];
  const sets = (setsRes.data ?? []) as { exercise: string; reps: number; weight_kg: number; rir: number | null; date: string }[];
  const feedback = (feedbackRes.data ?? []) as {
    day_key: string | null;
    rating: string;
    duration_min: number | null;
    comment: string | null;
  }[];
  const photos = (photosRes.data ?? []) as { date: string; pose: string; analysis: string | null }[];

  const byExercise = new Map<string, { volume: number; best: number; count: number }>();
  for (const s of sets) {
    const cur = byExercise.get(s.exercise) ?? { volume: 0, best: 0, count: 0 };
    cur.volume += Number(s.weight_kg) * s.reps;
    cur.best = Math.max(cur.best, Number(s.weight_kg));
    cur.count += 1;
    byExercise.set(s.exercise, cur);
  }
  const topExercises = [...byExercise.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 8)
    .map(([n, v]) => `${n}: ${v.count} séries, melhor carga ${v.best}kg`);

  const last30 = workouts.filter((w) => w.date >= since30);
  const streak = workouts.length ? computeStreak(workouts.map((w) => w.date)) : 0;
  const avgMinutes = last30.length
    ? Math.round(last30.reduce((a, w) => a + (w.duration_min ?? 0), 0) / last30.length)
    : null;

  const shape = photos
    .filter((p) => p.analysis)
    .slice(0, 1)
    .map((p) => `${p.date} (${p.pose}): ${String(p.analysis).slice(0, 240)}`);

  const summary = [
    `Nome: ${profile?.name ?? "Atleta"}`,
    `Sexo: ${profile?.gender ?? "não informado"}`,
    `Objetivo: ${profile?.goal ?? "-"} | Experiência: ${profile?.experience ?? "-"}`,
    `Peso: ${profile?.weight_kg ?? "?"} kg | Altura: ${profile?.height_cm ?? "?"} cm | Idade: ${profile?.age ?? "?"}`,
    `Meta de treinos por semana: ${profile?.days_per_week ?? "?"}`,
    profile?.equipment?.length ? `Equipamentos: ${profile.equipment.join(", ")}` : "",
    profile?.injuries ? `Lesões/limitações: ${profile.injuries}` : "",
    `Memória do atleta: ${JSON.stringify(preferencesRes.data ?? {})}. Exclua exercícios indesejados ou que causam desconforto. Dor não é preferência estética: não diagnostique, recomende avaliação profissional.`,
    `Performance recente: ${sets.slice(0,20).map(s=>`${s.date} ${s.exercise}: ${s.weight_kg}kg x${s.reps}, RIR ${s.rir ?? "não informado"}`).join("; ")}`,
    `Sequência atual: ${streak} dias | Treinos nos últimos 30 dias: ${last30.length}`,
    avgMinutes ? `Duração média das sessões: ${avgMinutes} min` : "",
    `Treinos recentes: ${workouts.slice(0, 6).map((w) => `${w.date} ${w.title}`).join("; ") || "nenhum"}`,
    `Cargas por exercício: ${topExercises.join(" || ") || "nenhuma registrada"}`,
    `Feedback recente das sessões: ${
      feedback.map((f) => `${f.day_key ?? "dia"}: ${f.rating}${f.comment ? ` (${f.comment})` : ""}`).join("; ") ||
      "nenhum"
    }`,
    shape.length
      ? `Contexto do Shape Tracker (use apenas para priorizar grupos musculares, sem diagnóstico): ${shape.join(" || ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { profile, summary, streak, last30: last30.length, avgMinutes, feedback };
}

/** Insights curtos e factuais para o card AI COACH INSIGHTS. */
export function programInsights(ctx: Awaited<ReturnType<typeof buildProgramContext>>, daysPerWeek: number) {
  const goalPerMonth = daysPerWeek * 4;
  const items: { label: string; value: string; hint: string }[] = [
    {
      label: "Sequência",
      value: `${ctx.streak} dias`,
      hint: ctx.streak >= 3 ? "Consistência em alta." : "Treine hoje para reativar a sequência.",
    },
    {
      label: "Últimos 30 dias",
      value: `${ctx.last30}/${goalPerMonth}`,
      hint: ctx.last30 >= goalPerMonth ? "Meta mensal batida." : "Ainda dá para alcançar a meta do mês.",
    },
  ];
  if (ctx.avgMinutes) {
    items.push({
      label: "Duração média",
      value: `${ctx.avgMinutes} min`,
      hint: "Base usada pela IA para calibrar o volume.",
    });
  }
  return items;
}
