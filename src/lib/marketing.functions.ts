import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clientNetworkFrom, trackEventSchema } from "@/lib/marketing-attribution";

function requestNetwork() {
  return clientNetworkFrom((name) => getRequestHeader(name as never), getRequestIP());
}

/**
 * Registra uma visita de campanha ou um clique em cadastro. Roda no servidor do site:
 * acrescenta a rede do visitante (IPv4 inteiro ou IPv6 /64; o banco guarda só um hash com
 * sal diário) e o estado do IP (ok/missing/invalid/untrusted), e chama o banco com a
 * permissão de servidor — o navegador não consegue chamar a função do banco direto.
 */
export const trackMarketingEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { network, status } = requestNetwork();
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
      p_ip_status: status,
    });
    if (error) throw new Error("tracking_unavailable");
    // Limite temporário (teto global ou da rede): o evento é real e não foi gravado —
    // o navegador mantém na fila e reenvia depois com o mesmo event_id.
    if (result === "retry") throw new Error("tracking_busy");
    return { saved: result === "saved" };
  });

/**
 * Diagnóstico (somente admin): o servidor está recebendo um IP confiável do visitante?
 * Mostra apenas o estado e a família (IPv4/IPv6) do próprio acesso do admin — nunca o IP.
 */
export const getTrackingIpDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { checkAdmin } = await import("@/lib/admin.functions");
    if (!(await checkAdmin(context))) throw new Error("ACCESS DENIED");
    const { status, family } = requestNetwork();
    return { status, family };
  });
