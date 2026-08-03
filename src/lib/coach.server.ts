const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type CoachTurn = { role: "user" | "assistant"; content: string };

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Coach IA indisponível: chave ausente.");
  return key;
}

async function callGateway(body: unknown) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey() },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Muitas mensagens seguidas. Tente de novo em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
  if (!res.ok) throw new Error("Coach IA falhou (" + res.status + ").");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora. Tente de novo.";
}

export async function askCoach(history: CoachTurn[], contextSummary: string) {
  return callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content:
          "Você é o Coach IA do ASCEND, um app de academia. Responda SEMPRE em português do Brasil, " +
          "de forma direta, motivadora e prática (máx. 8 linhas). Monte treinos personalizados com séries, " +
          "repetições, cargas e descanso; adapte o treino conforme o desempenho recente; tire dúvidas de " +
          "execução; motive; e sugira progressão de carga quando notar evolução. Use os dados reais do atleta " +
          "abaixo e nunca invente números que contradigam esses dados.\n\nDADOS DO ATLETA:\n" +
          contextSummary,
      },
      ...history.slice(-16),
    ],
  });
}

/** Escolhe a melhor substituição de exercício entre candidatos. */
export async function pickSubstitution(
  exercise: string,
  muscle: string,
  candidates: string[],
  contextSummary: string,
) {
  const reply = await callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content:
          "Você é o Coach IA do ASCEND. Escolha a MELHOR substituição para um exercício, considerando grupo " +
          "muscular, objetivo, equipamentos disponíveis, histórico e lesões do atleta. Responda em português do " +
          "Brasil, no formato exato:\nESCOLHA: <nome exatamente igual a um dos candidatos>\nMOTIVO: <1 a 2 " +
          "frases curtas>\nNunca escolha algo fora da lista de candidatos.\n\nDADOS DO ATLETA:\n" +
          contextSummary,
      },
      {
        role: "user",
        content:
          `Exercício atual: ${exercise} (foco: ${muscle}).\nCandidatos: ${candidates.join(" | ")}`,
      },
    ],
  });

  const choiceLine = /ESCOLHA:\s*(.+)/i.exec(reply)?.[1]?.trim() ?? "";
  const reason = /MOTIVO:\s*([\s\S]+)/i.exec(reply)?.[1]?.trim() ?? reply.trim();
  const match =
    candidates.find((c) => c.toLowerCase() === choiceLine.toLowerCase()) ??
    candidates.find((c) => choiceLine.toLowerCase().includes(c.toLowerCase())) ??
    candidates[0]!;
  return { choice: match, reason };
}

/** Compara duas fotos de evolução e devolve uma análise curta em markdown. */
export async function analyzeShape(
  beforeUrl: string,
  afterUrl: string,
  contextSummary: string,
  weeks: number,
) {
  return callGateway({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content:
          "Você é o analista de composição corporal do ASCEND. Compare as duas fotos (a primeira é a MAIS " +
          "ANTIGA, a segunda a MAIS RECENTE) e escreva em português do Brasil, em markdown curto: " +
          "1) um resumo de 2 linhas; 2) uma lista das regiões que mais evoluíram com uma nota de 0 a 100 " +
          "no formato `Região: 72`; 3) 2 dicas de treino para as regiões atrasadas. Seja honesto, técnico e " +
          "motivador, sem diagnóstico médico. Contexto do atleta:\n" + contextSummary +
          `\nIntervalo entre as fotos: ~${weeks} semanas.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analise minha evolução entre estas duas fotos." },
          { type: "image_url", image_url: { url: beforeUrl } },
          { type: "image_url", image_url: { url: afterUrl } },
        ],
      },
    ],
  });
}
