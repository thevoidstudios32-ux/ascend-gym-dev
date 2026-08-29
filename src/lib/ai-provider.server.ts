/**
 * ASCEND — Backend próprio de IA (server-only).
 *
 * Único ponto do app que fala com o provedor de IA. O adaptador é compatível
 * com a API OpenAI (`/chat/completions`), então trocar de provedor no futuro
 * é apenas trocar os secrets — nenhum código do Coach precisa mudar:
 *
 *   AI_API_KEY       chave do provedor (NUNCA no frontend)
 *   AI_BASE_URL      endpoint base (default: https://api.openai.com/v1)
 *   AI_MODEL_TEXT    modelo de texto
 *   AI_MODEL_VISION  modelo com visão (fotos: Shape Tracker / nutrição)
 */

const TIMEOUT_MS = 60_000;

export type AiMessage = { role: "system" | "user" | "assistant"; content: unknown };

export type AiChatInput = {
  messages: AiMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  vision?: boolean;
  temperature?: number;
};

/** Erro de IA com status HTTP, para o endpoint devolver o código certo. */
export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

function config() {
  const key = process.env["AI_API_KEY"];
  if (!key) throw new AiError("IA indisponível: chave do provedor não configurada.", 503);
  return {
    key,
    base: (process.env["AI_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
    textModel: process.env["AI_MODEL_TEXT"] ?? "gpt-4o-mini",
    visionModel: process.env["AI_MODEL_VISION"] ?? process.env["AI_MODEL_TEXT"] ?? "gpt-4o-mini",
  };
}

/** Chamada bruta ao provedor. Devolve o JSON no formato OpenAI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aiChat(input: AiChatInput): Promise<any> {
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new AiError("Requisição inválida: sem mensagens.", 400);
  }

  const { key, base, textModel, visionModel } = config();

  const body: Record<string, unknown> = {
    model: input.vision ? visionModel : textModel,
    messages: input.messages,
  };
  if (input.tools) body["tools"] = input.tools;
  if (input.tool_choice) body["tool_choice"] = input.tool_choice;
  if (typeof input.temperature === "number") body["temperature"] = input.temperature;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiError("A IA demorou demais para responder. Tente de novo.", 504);
    }
    console.error("[ai] provedor inacessível", err);
    throw new AiError("Serviço de IA indisponível no momento.", 503);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    console.error("[ai] credencial do provedor rejeitada", res.status);
    throw new AiError("IA indisponível: credencial do provedor inválida.", 502);
  }
  if (res.status === 429) throw new AiError("Muitas solicitações seguidas. Tente de novo em instantes.", 429);
  if (res.status === 402) throw new AiError("Limite de uso da IA atingido no provedor.", 402);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[ai] erro do provedor", res.status, detail.slice(0, 500));
    throw new AiError(`Coach IA falhou (${res.status}).`, 502);
  }

  return res.json();
}

/** Atalho para respostas de texto simples. */
export async function aiText(input: AiChatInput): Promise<string> {
  const json = (await aiChat(input)) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora. Tente de novo.";
}

/** Atalho para tool-calling: devolve os argumentos JSON crus da função. */
export async function aiToolArguments(input: AiChatInput): Promise<string | undefined> {
  const json = (await aiChat(input)) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  return json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
}
