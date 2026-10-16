import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import type { AiMessage } from "@/lib/ai-provider.server";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image"; image: string };

function normalizeContent(content: unknown): string | Array<TextPart | ImagePart> {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return JSON.stringify(content);

  return content.flatMap((part): Array<TextPart | ImagePart> => {
    if (!part || typeof part !== "object") return [];
    const item = part as { type?: unknown; text?: unknown; image_url?: { url?: unknown } };
    if (item.type === "text" && typeof item.text === "string") {
      return [{ type: "text", text: item.text }];
    }
    if (item.type === "image_url" && typeof item.image_url?.url === "string") {
      return [{ type: "image", image: item.image_url.url }];
    }
    return [];
  });
}

function normalizeMessages(messages: AiMessage[]): ModelMessage[] {
  return messages.map((message): ModelMessage => {
    if (message.role === "user") {
      return { role: "user", content: normalizeContent(message.content) };
    }
    const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
    return message.role === "system"
      ? { role: "system", content }
      : { role: "assistant", content };
  });
}

/** Reserva comum: acionada somente após indisponibilidade temporária do provedor principal. */
export async function generateWithLovableAi(messages: AiMessage[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Serviço de IA de reserva não configurado.");

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n\n");
  const result = streamText({
    model: lovable.responses("openai/gpt-6-astra"),
    ...(system ? { system } : {}),
    messages: normalizeMessages(messages.filter((m) => m.role !== "system")),
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = (await result.text).trim();
  if (!text) throw new Error("A IA de reserva não retornou uma proposta.");
  return { choices: [{ message: { content: text } }] };
}