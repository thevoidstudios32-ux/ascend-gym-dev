/**
 * ASCEND — endpoint autenticado do Coach IA.
 * Frontend → este endpoint → provedor de IA (chave só no backend).
 * O user_id vem SEMPRE do token verificado, nunca do corpo da requisição.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { aiChat, AiError, type AiMessage } from "@/lib/ai-provider.server";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return json({ error: "Backend indisponível." }, 503);

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token || token.split(".").length !== 3) {
          return json({ error: "Não autenticado." }, 401);
        }

        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const { data, error } = await supabase.auth.getClaims(token);
        const userId = data?.claims?.sub;
        if (error || !userId) return json({ error: "Sessão inválida." }, 401);

        let payload: { messages?: AiMessage[]; vision?: boolean; temperature?: number };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return json({ error: "Requisição inválida." }, 400);
        }

        const messages = Array.isArray(payload.messages) ? payload.messages.slice(-24) : [];
        if (!messages.length) return json({ error: "Requisição inválida: sem mensagens." }, 400);

        try {
          const result = (await aiChat({
            messages,
            ...(payload.vision ? { vision: true } : {}),
            ...(typeof payload.temperature === "number" ? { temperature: payload.temperature } : {}),
          })) as { choices?: { message?: { content?: string } }[] };
          return json({
            userId,
            content: result.choices?.[0]?.message?.content?.trim() ?? "",
          });
        } catch (err) {
          if (err instanceof AiError) return json({ error: err.message }, err.status);
          console.error("[ai/chat] erro interno", err);
          return json({ error: "Erro interno do Coach IA." }, 500);
        }
      },
    },
  },
});
