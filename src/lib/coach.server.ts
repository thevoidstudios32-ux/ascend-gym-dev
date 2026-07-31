const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type CoachTurn = { role: "user" | "assistant"; content: string };

export async function askCoach(history: CoachTurn[], contextSummary: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Coach IA indisponível: chave ausente.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "Você é o Coach IA do ASCEND, um app de academia. Responda SEMPRE em português do Brasil, " +
            "de forma direta, motivadora e prática (máx. 6 linhas). Dê séries, repetições, cargas e dicas " +
            "de execução quando fizer sentido. Use os dados reais do atleta abaixo e nunca invente números " +
            "que contradigam esses dados.\n\nDADOS DO ATLETA:\n" +
            contextSummary,
        },
        ...history.slice(-16),
      ],
    }),
  });

  if (res.status === 429) throw new Error("Muitas mensagens seguidas. Tente de novo em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
  if (!res.ok) throw new Error("Coach IA falhou (" + res.status + ").");

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora. Tente de novo.";
}
