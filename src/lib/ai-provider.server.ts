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

/** Limites por tarefa evitam que uma tentativa travada segure a tela por minutos. */
const DEFAULT_TIMEOUT_MS = 90_000;

export type AiMessage = { role: "system" | "user" | "assistant"; content: unknown };

/** Identifica a chamada no painel de consumo (quem pediu e para quê). */
export type AiMeta = { userId?: string | null; feature?: string };

export type AiChatInput = {
  messages: AiMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  vision?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  meta?: AiMeta;
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
    textModel: process.env["AI_MODEL_TEXT"] ?? "gemini-3.6-flash",
    visionModel: process.env["AI_MODEL_VISION"] ?? process.env["AI_MODEL_TEXT"] ?? "gemini-3.6-flash",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Modelos alternativos usados quando o principal está sobrecarregado (503/429). */
function fallbackModels(primary: string) {
  const extra = (process.env["AI_MODEL_FALLBACKS"] ?? "gemini-flash-latest")
    .split(",")
    .map((m) => m.trim())
    .filter((model) => model && model !== "gemini-2.0-flash" && model !== "gemini-1.5-flash");
  return [primary, ...extra.filter((m) => m !== primary)].slice(0, 2);
}

/** Uma tentativa contra um modelo específico. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attempt(model: string, input: AiChatInput, key: string, base: string): Promise<any> {
  const body: Record<string, unknown> = { model, messages: input.messages };
  if (input.tools) body["tools"] = input.tools;
  if (input.tool_choice) body["tool_choice"] = input.tool_choice;
  if (input.response_format) body["response_format"] = input.response_format;
  if (typeof input.temperature === "number") body["temperature"] = input.temperature;
  if (typeof input.maxTokens === "number") body["max_tokens"] = input.maxTokens;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

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
  if (res.status === 402) throw new AiError("Limite de uso da IA atingido no provedor.", 402);
  if (res.status === 429 || res.status === 503 || res.status >= 500) {
    const detail = await res.text().catch(() => "");
    console.error("[ai] provedor ocupado", model, res.status, detail.slice(0, 300));
    throw new AiError(
      res.status === 429
        ? "Muitas solicitações seguidas. Tente de novo em instantes."
        : "A IA está sobrecarregada agora. Tente de novo em instantes.",
      res.status === 429 ? 429 : 503,
    );
  }
  if (res.status === 404) {
    const detail = await res.text().catch(() => "");
    console.error("[ai] modelo indisponível", model, detail.slice(0, 300));
    throw new AiError(`Modelo de IA indisponível (${model}).`, 404);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[ai] erro do provedor", res.status, detail.slice(0, 500));
    throw new AiError(`Coach IA falhou (${res.status}).`, 502);
  }

  return res.json();
}

/** Grava a métrica da chamada (tokens + tempo) para o painel de consumo. */
async function logUsage(row: {
  userId?: string | null;
  feature: string;
  model: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_usage_logs").insert({
      user_id: row.userId ?? null,
      feature: row.feature,
      model: row.model,
      prompt_tokens: Math.round(row.usage?.prompt_tokens ?? 0),
      completion_tokens: Math.round(row.usage?.completion_tokens ?? 0),
      total_tokens: Math.round(
        row.usage?.total_tokens ??
          (row.usage?.prompt_tokens ?? 0) + (row.usage?.completion_tokens ?? 0),
      ),
      duration_ms: Math.round(row.durationMs),
      ok: row.ok,
      error: row.error ?? null,
    });
  } catch (err) {
    console.error("[ai] falha ao registrar consumo", err);
  }
}

/** Chamada bruta ao provedor, com retentativa e fallback de modelo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aiChat(input: AiChatInput): Promise<any> {
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new AiError("Requisição inválida: sem mensagens.", 400);
  }

  const { key, base, textModel, visionModel } = config();
  const models = fallbackModels(input.vision ? visionModel : textModel);
  const feature = input.meta?.feature ?? "outros";
  const userId = input.meta?.userId ?? null;
  const started = Date.now();

  let last: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      const json = await attempt(models[i]!, input, key, base);
      await logUsage({
        userId,
        feature,
        model: models[i]!,
        durationMs: Date.now() - started,
        ok: true,
        usage: json?.usage,
      });
      return json;
    } catch (err) {
      last = err;
      const canUseFallback =
        i < models.length - 1 && err instanceof AiError && [404, 429, 503].includes(err.status);
      if (canUseFallback) {
        // Uma pausa curta evita rajadas, sem repetir o mesmo modelo lento.
        await sleep(err.status === 429 ? 1_500 : 250);
        continue;
      }
      await logUsage({
        userId,
        feature,
        model: models[i]!,
        durationMs: Date.now() - started,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
  const fail = last instanceof AiError
    ? last
    : new AiError("A IA está sobrecarregada agora. Tente de novo em instantes.", 503);

  if ([429, 503, 504].includes(fail.status)) {
    try {
      const { generateWithLovableAi } = await import("@/lib/program-ai-fallback.server");
      const json = await generateWithLovableAi(input.messages);
      await logUsage({
        userId,
        feature,
        model: "openai/gpt-6-astra",
        durationMs: Date.now() - started,
        ok: true,
      });
      return json;
    } catch (fallbackError) {
      const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      await logUsage({
        userId,
        feature,
        model: "openai/gpt-6-astra",
        durationMs: Date.now() - started,
        ok: false,
        error: message,
      });
      throw new AiError(message || fail.message, 503);
    }
  }
  await logUsage({
    userId,
    feature,
    model: models[0]!,
    durationMs: Date.now() - started,
    ok: false,
    error: fail.message,
  });
  throw fail;
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
