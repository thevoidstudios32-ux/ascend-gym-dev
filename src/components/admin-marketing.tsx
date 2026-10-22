import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
type Health = { cap_hits: number; events_without_ip: number };
type HealthResult = { data: Health[] | null; error: { message: string } | null };

/** Sinais de saúde do rastreamento (somente admin): teto global atingido e eventos sem IP. */
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
    cap_hits: Number(row?.cap_hits ?? 0),
    events_without_ip: Number(row?.events_without_ip ?? 0),
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
      {health.data && health.data.cap_hits > 0 ? (
        <p className="text-xs text-destructive">
          Atenção: o teto de 5.000 eventos por hora foi atingido {health.data.cap_hits} vez(es)
          neste período. Os eventos reais não foram perdidos (ficaram na fila do navegador para nova
          tentativa), mas isso indica tráfego anormal ou abuso.
        </p>
      ) : null}
      {total("events_without_ip") > 0 ? (
        <p className="text-xs text-destructive">
          Atenção: {total("events_without_ip")} evento(s) chegaram sem o IP do visitante. O limite
          por rede não está funcionando como esperado; verifique a configuração do servidor.
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
