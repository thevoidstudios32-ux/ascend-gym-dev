import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { clientNetworkFrom, trackEventSchema } from "@/lib/marketing-attribution";

/**
 * Registra uma visita de campanha ou um clique em cadastro. Roda no servidor do site:
 * acrescenta o bloco de rede do visitante (IPv4 inteiro ou IPv6 /64; o banco guarda só um
 * hash com sal diário) e chama o banco com a permissão de servidor — o navegador não
 * consegue chamar a função do banco direto, então não dá para burlar o limite por rede.
 */
export const trackMarketingEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackEventSchema.parse(data))
  .handler(async ({ data }) => {
    const network = clientNetworkFrom((name) => getRequestHeader(name as never), getRequestIP());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A função ainda não está nos tipos gerados do Supabase (são gerados após a migração).
    const admin = supabaseAdmin as unknown as {
      rpc: (
        f: string,
        a: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
    const { data: result, error } = await admin.rpc("track_marketing_event", {
      ...data,
      p_client_network: network,
    });
    if (error) throw new Error("tracking_unavailable");
    // Teto global atingido: o evento é real e não foi gravado — o navegador mantém na fila.
    if (result === "retry") throw new Error("tracking_busy");
    return { saved: result === "saved" };
  });
