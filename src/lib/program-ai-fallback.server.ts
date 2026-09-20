import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { AiMessage } from "@/lib/ai-provider.server";

/** Reserva do programa: usada somente quando o provedor principal está indisponível. */
export async function generateProgramWithLovableAi(messages: AiMessage[]) {
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

  const result = streamText({
    model: lovable.responses("openai/gpt-6-astra"),
    messages: messages.map((message) => ({
      role: message.role,
      content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
    })),
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