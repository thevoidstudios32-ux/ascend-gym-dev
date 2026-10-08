/**
 * Coach IA — coleta de dados reais + construção de contexto para análises.
 * Tudo aqui roda no servidor. Nenhum dado é inventado: métricas sem dados
 * simplesmente não são retornadas (null) e a UI as oculta.
 *
 * Organizado por "tier" para que, no futuro, análises avançadas possam ser
 * separadas sem alterar a experiência atual (hoje TUDO é gratuito).
 */
import { computeStreak, levelFromXp, nutritionTargets, todayISO } from "@/lib/ascend";

export type AnalysisMode = "progress" | "improve" | "weekly" | "prs";

type Sb = {
  from: (t: string) => any;
};

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayISO(d);
}

export type CoachInsights = {
  streak: number | null;
  workoutsThisWeek: number | null;
  workoutsGoal: number | null;
  newPrs: number | null;
  xpRecent: number | null;
  xpTotal: number | null;
  consistency: number | null;
  hasEnoughData: boolean;
};

export async function collectCoachData(supabase: Sb, userId: string) {
  const since30 = daysAgoISO(30);
  const since7 = daysAgoISO(6);
  const since14 = daysAgoISO(13);

  const [profileRes, workoutsRes, recordsRes, setsRes, preferencesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("workouts")
      .select("date,title,duration_min,xp,kind")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(90),
    supabase
      .from("records")
      .select("exercise,weight_kg,reps,achieved_on")
      .eq("user_id", userId)
      .order("achieved_on", { ascending: false })
      .limit(40),
    supabase
      .from("exercise_sets")
      .select("exercise,reps,weight_kg,date,rir")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(400),
    supabase.from("training_preferences").select("exercise_memory,disliked_exercises,restrictions").eq("user_id",userId).maybeSingle(),
  ]);

  const profile = profileRes.data ?? null;
  const workouts = (workoutsRes.data ?? []) as {
    date: string;
    title: string;
    duration_min: number;
    xp: number;
  }[];
  const records = (recordsRes.data ?? []) as {
    exercise: string;
    weight_kg: number;
    reps: number;
    achieved_on: string;
  }[];
  const sets = (setsRes.data ?? []) as {
    exercise: string;
    reps: number;
    weight_kg: number;
    date: string;
    rir: number | null;
  }[];

  const last7 = workouts.filter((w) => w.date >= since7);
  const prev7 = workouts.filter((w) => w.date >= since14 && w.date < since7);
  const last30 = workouts.filter((w) => w.date >= since30);
  const prs7 = records.filter((r) => r.achieved_on >= since7);

  const goal = profile?.days_per_week ?? null;
  const streak = workouts.length ? computeStreak(workouts.map((w) => w.date)) : null;
  const consistency =
    goal && goal > 0 && workouts.length
      ? Math.min(100, Math.round((last7.length / goal) * 100))
      : null;

  const insights: CoachInsights = {
    streak,
    workoutsThisWeek: workouts.length ? last7.length : null,
    workoutsGoal: goal,
    newPrs: records.length ? prs7.length : null,
    xpRecent: last7.length ? last7.reduce((a, w) => a + (w.xp ?? 0), 0) : null,
    xpTotal: profile?.xp ?? null,
    consistency,
    hasEnoughData: workouts.length >= 3 || records.length >= 2,
  };

  return { profile, preferences: preferencesRes.data ?? {}, workouts, records, sets, last7, prev7, last30, prs7, insights };
}

export function buildContextSummary(data: Awaited<ReturnType<typeof collectCoachData>>) {
  const { profile, workouts, records, sets, last7, prev7, last30, insights } = data;
  const level = levelFromXp(profile?.xp ?? 0);
  const targets = profile
    ? nutritionTargets({
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        age: profile.age,
        goal: profile.goal,
      })
    : null;

  // Volume por exercício (últimos registros) — mostra distribuição real.
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
    .slice(0, 10)
    .map(([name, v]) => `${name}: ${v.count} séries, volume ${Math.round(v.volume)}kg, melhor carga ${v.best}kg`);

  const prsByExercise = new Map<string, { weight_kg: number; reps: number; achieved_on: string }[]>();
  for (const r of records) {
    const arr = prsByExercise.get(r.exercise) ?? [];
    arr.push(r);
    prsByExercise.set(r.exercise, arr);
  }
  const prLines = [...prsByExercise.entries()]
    .slice(0, 8)
    .map(([ex, arr]) => `${ex}: ${arr.map((r) => `${r.weight_kg}kg x${r.reps} (${r.achieved_on})`).join(" ← ")}`);

  return [
    `Nome: ${profile?.name ?? "Atleta"}`,
    `Sexo: ${profile?.gender ?? "não informado"}`,
    `Objetivo: ${profile?.goal ?? "-"} | Experiência: ${profile?.experience ?? "-"}`,
    `Peso: ${profile?.weight_kg ?? "?"} kg | Altura: ${profile?.height_cm ?? "?"} cm | Idade: ${profile?.age ?? "?"}`,
    `Meta de treinos por semana: ${profile?.days_per_week ?? "?"}`,
    profile?.equipment?.length ? `Equipamentos disponíveis: ${profile.equipment.join(", ")}` : "",
    profile?.injuries ? `Lesões/limitações: ${profile.injuries}` : "",
    `Memória e restrições: ${JSON.stringify(data.preferences)}. Não recomende exercícios indesejados ou dolorosos. Não diagnostique; recomende avaliação profissional em caso de dor persistente.`,
    `Séries recentes: ${sets.slice(0,20).map(s=>`${s.date} ${s.exercise} ${s.weight_kg}kg x${s.reps} RIR ${s.rir ?? "não informado"}`).join("; ")}`,
    `Nível ${level.level} (${level.name}), ${profile?.xp ?? 0} XP total`,
    `Sequência atual: ${insights.streak ?? 0} dias`,
    `Treinos nos últimos 7 dias: ${last7.length} | nos 7 anteriores: ${prev7.length} | nos últimos 30 dias: ${last30.length}`,
    insights.consistency !== null ? `Consistência semanal: ${insights.consistency}%` : "",
    insights.xpRecent !== null ? `XP ganho nos últimos 7 dias: ${insights.xpRecent}` : "",
    `Treinos registrados (mais recentes): ${
      workouts.slice(0, 20).map((w) => `${w.date} ${w.title} (${w.duration_min}min)`).join("; ") || "nenhum"
    }`,
    `Recordes por exercício: ${prLines.join(" || ") || "nenhum"}`,
    `Séries registradas por exercício: ${topExercises.join(" || ") || "nenhuma"}`,
    targets
      ? `Meta nutricional estimada: ${targets.kcal} kcal, ${targets.protein}g proteína, ${targets.carbs}g carbo, ${targets.fat}g gordura`
      : "",
    `AVISO DE DADOS: ${
      insights.hasEnoughData
        ? "há histórico suficiente para uma análise básica."
        : "há POUCOS dados registrados — diga isso ao atleta e evite conclusões fortes."
    }`,
  ]
    .filter(Boolean)
    .join("\n");
}

const BASE_RULES =
  "Você é o Coach IA do ASCEND. Responda SEMPRE em português do Brasil, em markdown curto, " +
  "direto, técnico e motivador. Use APENAS os dados reais fornecidos: nunca invente números, " +
  "treinos, PRs ou evolução. Se os dados forem insuficientes, diga claramente: 'Ainda tenho " +
  "poucos dados seus. Conforme você registrar mais treinos, minhas análises ficarão mais precisas.' " +
  "Nunca faça diagnóstico médico.";

export const MODE_PROMPTS: Record<AnalysisMode, { user: string; system: string }> = {
  progress: {
    user: "Analisar meu progresso",
    system:
      BASE_RULES +
      "\nEstruture a resposta em 3 blocos com estes títulos exatos: **O QUE ESTÁ EVOLUINDO**, " +
      "**O QUE MERECE ATENÇÃO**, **PRÓXIMO PASSO**. Máx. 3 linhas por bloco.",
  },
  improve: {
    user: "O que devo melhorar?",
    system:
      BASE_RULES +
      "\nIdentifique de 2 a 4 pontos de melhoria reais, considerando: consistência, frequência, " +
      "progressão de carga, distribuição entre grupos musculares, registro dos treinos e cumprimento " +
      "das metas. Use uma lista curta, cada item com o motivo baseado nos dados e uma ação prática.",
  },
  weekly: {
    user: "Relatório da semana",
    system:
      BASE_RULES +
      "\nGere um **WEEKLY COACH REPORT**. Comece listando apenas as métricas que existem nos dados " +
      "(TREINOS x/meta, PRs, STREAK, XP, CONSISTÊNCIA) em linhas curtas. Depois os blocos " +
      "**DESTAQUE DA SEMANA**, **EVOLUÇÃO** (compare com os 7 dias anteriores só se houver dados) e " +
      "**PRÓXIMO PASSO**. Máx. 2 linhas por bloco.",
  },
  prs: {
    user: "Analisar meus PRs",
    system:
      BASE_RULES +
      "\nAnalise a evolução dos recordes pessoais por exercício. Quando houver dois ou mais registros " +
      "do mesmo exercício, calcule a evolução percentual real de carga. Se houver apenas um registro, " +
      "diga que ainda não há base de comparação. Termine com uma sugestão de progressão segura.",
  },
};
