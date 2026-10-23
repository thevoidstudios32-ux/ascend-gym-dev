import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTrackingIpDiagnostics } from "@/lib/marketing.functions";

/** Linha agregada retornada por public.get_marketing_campaign_metrics (somente admin). */
export type CampaignMetric = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  visits: number;
  unique_visitors: number;
  distinct_networks: number;
  events_without_ip: number;
  signup_cta_clicks: number;
  signups_first_touch: number;
  signups_last_touch: number;
};

type RpcResult = { data: CampaignMetric[] | null; error: { message: string } | null };
type Health = {
  global_cap_hits: number;
  network_limit_hits: number;
  ip_missing: number;
  ip_invalid: number;
  ip_untrusted: number;
};
type HealthResult = { data: Health[] | null; error: { message: string } | null };

/** Sinais de saúde do rastreamento (somente admin): limites atingidos e eventos sem IP confiável. */
async function fetchHealth(days: number): Promise<Health> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const client = supabase as unknown as {
    rpc: (f: string, a: Record<string, unknown>) => Promise<HealthResult>;
  };
  const { data, error } = await client.rpc("get_marketing_health", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return {
    global_cap_hits: Number(row?.global_cap_hits ?? 0),
    network_limit_hits: Number(row?.network_limit_hits ?? 0),
    ip_missing: Number(row?.ip_missing ?? 0),
    ip_invalid: Number(row?.ip_invalid ?? 0),
    ip_untrusted: Number(row?.ip_untrusted ?? 0),
  };
}

async function fetchMetrics(days: number): Promise<CampaignMetric[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const client = supabase as unknown as {
    rpc: (f: string, a: Record<string, unknown>) => Promise<RpcResult>;
  };
  const { data, error } = await client.rpc("get_marketing_campaign_metrics", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    visits: Number(r.visits),
    unique_visitors: Number(r.unique_visitors),
    distinct_networks: Number(r.distinct_networks),
    events_without_ip: Number(r.events_without_ip),
    signup_cta_clicks: Number(r.signup_cta_clicks),
    signups_first_touch: Number(r.signups_first_touch),
    signups_last_touch: Number(r.signups_last_touch),
  }));
}

export function MarketingMetrics() {
  const [days, setDays] = useState(30);
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-marketing", days],
    queryFn: () => fetchMetrics(days),
    retry: false,
  });
  const health = useQuery({
    queryKey: ["admin-marketing-health", days],
    queryFn: () => fetchHealth(days),
    retry: false,
  });
  const diagnose = useServerFn(getTrackingIpDiagnostics);
  const [diag, setDiag] = useState<string | null>(null);
  async function runDiagnostic() {
    setDiag("Verificando…");
    try {
      const r = await diagnose();
      const fam = r.family === "ipv6" ? "IPv6" : r.family === "ipv4" ? "IPv4" : "";
      setDiag(
        {
          ok: `OK: o servidor recebeu um IP confiável (${fam}). O limite por rede está ativo.`,
          missing: "Problema: o servidor NÃO recebeu o IP do visitante (cabeçalho ausente).",
          invalid: "Problema: o servidor recebeu um valor de IP inválido.",
          untrusted: `Problema: o IP recebido é de infraestrutura (${fam}), não do visitante — provável repasse interno da hospedagem.`,
        }[r.status],
      );
    } catch (e) {
      setDiag(`Não foi possível verificar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const total = (k: keyof CampaignMetric) => (data ?? []).reduce((s, r) => s + (r[k] as number), 0);

  return (
    <section className="panel space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-display text-xl">MARKETING POR CAMPANHA</h2>
        <div className="ml-auto flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1 text-xs font-bold ${days === d ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"}`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        Dados reais a partir da publicação do rastreamento; não há histórico anterior. Visitas =
        chegadas com UTM (recarregar em 30 min não conta de novo). Cadastros = contas novas
        confirmadas. "Primeira origem" é a primeira campanha que trouxe a pessoa; "campanha atual" é
        a mais recente (até 30 dias). Visitas e cliques são estimativas (limitadas por rede, mas não
        impossíveis de inflar); cadastros só contam contas reais e confirmadas, uma vez cada.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button onClick={runDiagnostic} className="rounded-lg bg-elevated px-3 py-1 font-bold">
          Verificar IP agora
        </button>
        {diag ? <span className="text-muted-foreground">{diag}</span> : null}
      </div>
      {health.data && health.data.global_cap_hits > 0 ? (
        <p className="text-xs text-destructive">
          Atenção: o teto de 5.000 eventos por hora foi atingido {health.data.global_cap_hits}{" "}
          vez(es) neste período. Os eventos reais não foram perdidos (ficaram na fila do navegador
          para nova tentativa), mas isso indica tráfego anormal ou abuso.
        </p>
      ) : null}
      {health.data && health.data.network_limit_hits > 0 ? (
        <p className="text-xs text-muted-foreground">
          Uma mesma rede atingiu o limite de 60 eventos por hora {health.data.network_limit_hits}{" "}
          vez(es). Os eventos ficaram na fila para nova tentativa (comum em redes móveis com CGNAT).
        </p>
      ) : null}
      {health.data &&
      health.data.ip_missing + health.data.ip_invalid + health.data.ip_untrusted > 0 ? (
        <p className="text-xs text-destructive">
          Atenção: eventos sem IP confiável neste período — sem cabeçalho: {health.data.ip_missing};
          inválido: {health.data.ip_invalid}; de infraestrutura: {health.data.ip_untrusted}. Para
          esses eventos o limite por rede não se aplica; use "Verificar IP agora" e confira a
          configuração da hospedagem.
        </p>
      ) : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {error ? (
        <p className="text-sm text-destructive">Não foi possível carregar: {error.message}</p>
      ) : null}
      {data && data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há dados neste período.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2">Origem</th>
                <th className="p-2">Meio</th>
                <th className="p-2">Campanha</th>
                <th className="p-2">Conteúdo (vídeo)</th>
                <th className="p-2 text-right">Visitas</th>
                <th className="p-2 text-right">Visitantes únicos</th>
                <th className="p-2 text-right">Redes distintas</th>
                <th className="p-2 text-right">Cliques em cadastro</th>
                <th className="p-2 text-right">Cadastros (1ª origem)</th>
                <th className="p-2 text-right">Cadastros (campanha atual)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr
                  key={`${r.utm_source}|${r.utm_medium}|${r.utm_campaign}|${r.utm_content}`}
                  className="border-t border-border"
                >
                  <td className="p-2 font-semibold">{r.utm_source}</td>
                  <td className="p-2">{r.utm_medium || "—"}</td>
                  <td className="p-2">{r.utm_campaign || "—"}</td>
                  <td className="p-2">{r.utm_content || "—"}</td>
                  <td className="p-2 text-right">{r.visits}</td>
                  <td className="p-2 text-right">{r.unique_visitors}</td>
                  <td className="p-2 text-right">{r.distinct_networks}</td>
                  <td className="p-2 text-right">{r.signup_cta_clicks}</td>
                  <td className="p-2 text-right">{r.signups_first_touch}</td>
                  <td className="p-2 text-right">{r.signups_last_touch}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-bold">
                <td className="p-2" colSpan={4}>
                  Total
                </td>
                <td className="p-2 text-right">{total("visits")}</td>
                <td className="p-2 text-right">—</td>
                <td className="p-2 text-right">—</td>
                <td className="p-2 text-right">{total("signup_cta_clicks")}</td>
                <td className="p-2 text-right">{total("signups_first_touch")}</td>
                <td className="p-2 text-right">{total("signups_last_touch")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
