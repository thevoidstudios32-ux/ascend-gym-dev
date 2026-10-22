/**
 * Envio dos eventos de marketing ao Supabase (visitas com UTM, cliques em cadastro,
 * origem do cadastro concluído). Nunca bloqueia a navegação nem lança erro: falhas
 * ficam na fila do navegador e são reenviadas na próxima página.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  addPending,
  currentTouch,
  loadPending,
  loadState,
  parseUtm,
  recordTouch,
  removePending,
  saveState,
  signupMetadata,
  utmSignature,
  type AttributionState,
  type PendingEvent,
} from "@/lib/marketing-attribution";

// As funções novas ainda não estão nos tipos gerados do Supabase (gerados após a migração).
// supabase.rpc devolve um "thenable" (não uma Promise com .catch): Promise.resolve normaliza.
type RpcResult = { data: unknown; error: { message: string } | null };
type RpcClient = { rpc: (f: string, a: Record<string, unknown>) => PromiseLike<RpcResult> };
function rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  try {
    return Promise.resolve((supabase as unknown as RpcClient).rpc(fn, args)).catch(
      (e: unknown) => ({
        data: null,
        error: { message: String(e) },
      }),
    );
  } catch (e) {
    return Promise.resolve({ data: null, error: { message: String(e) } });
  }
}

const isBrowser = () => typeof window !== "undefined";
const newId = () => crypto.randomUUID();

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function getState(): AttributionState {
  const local = storage("local");
  const state = loadState(local, newId);
  saveState(local, state);
  return state;
}

function utmArgs(touch: AttributionState["last"]) {
  if (!touch) return {};
  const { at: _at, ...utm } = touch;
  return utm;
}

let flushing: Promise<void> | null = null;

/** Envia os eventos pendentes. Sai da fila só quando o servidor respondeu (gravado ou ignorado). */
export function flushPendingEvents(): Promise<void> {
  if (!isBrowser()) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    const local = storage("local");
    for (const { queued_at: _q, ...args } of loadPending(local, new Date())) {
      const { error } = await rpc("track_marketing_event", args);
      if (error) break; // sem rede: tenta de novo na próxima página
      removePending(local, args.p_event_id, new Date());
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

function queue(event: Omit<PendingEvent, "queued_at">): void {
  addPending(storage("local"), { ...event, queued_at: new Date().toISOString() }, new Date());
}

/** Chamado a cada navegação: guarda a origem (UTM), conta a visita (1x por sessão) e reenvia pendências. */
export async function captureCampaignVisit(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const utm = parseUtm(window.location.search);
    if (utm) {
      const state = recordTouch(getState(), utm, new Date());
      saveState(storage("local"), state);
      const session = storage("session");
      const key = `ascend_visit_${utmSignature(utm)}`;
      if (!session?.getItem(key)) {
        session?.setItem(key, "1");
        queue({
          p_event_id: newId(),
          p_visitor_id: state.visitorId,
          p_event_type: "visit",
          p_cta: null,
          p_path: window.location.pathname,
          p_utm: utm,
        });
      }
    }
    await flushPendingEvents();
  } catch {
    /* rastreamento nunca atrapalha a navegação */
  }
}

/** Clique em um botão que leva ao cadastro. `cta` identifica o botão (ex.: landing_hero). Nunca lança erro. */
export function trackSignupCta(cta: string): void {
  if (!isBrowser()) return;
  try {
    const state = getState();
    queue({
      p_event_id: newId(),
      p_visitor_id: state.visitorId,
      p_event_type: "signup_cta_click",
      p_cta: cta,
      p_path: window.location.pathname,
      p_utm: utmArgs(currentTouch(state, new Date())),
    });
    void flushPendingEvents();
  } catch {
    /* nunca impede o clique */
  }
}

/** Dados de origem para enviar junto com o cadastro por e-mail (metadados do usuário). */
export function acquisitionForSignup() {
  if (!isBrowser()) return undefined;
  try {
    return signupMetadata(getState(), new Date());
  } catch {
    return undefined;
  }
}

/**
 * Depois do login: associa a origem ao usuário UMA vez. O banco só aceita contas criadas
 * há menos de 48 h com e-mail confirmado, então contas antigas nunca recebem origem.
 */
export async function claimSignupAttribution(): Promise<string | undefined> {
  if (!isBrowser()) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  const local = storage("local");
  const flag = `ascend_acq_claimed_${userId}`;
  if (local?.getItem(flag)) return "ja_verificado";
  const state = getState();
  const { data: result, error } = await rpc("claim_signup_attribution", {
    p_visitor_id: state.visitorId,
    p_first: state.first ?? null,
    p_last: currentTouch(state, new Date()) ?? null,
  });
  if (error) return;
  // "cadastro_nao_confirmado" pode mudar quando o e-mail for confirmado: tenta de novo depois.
  if (result !== "cadastro_nao_confirmado") local?.setItem(flag, "1");
  return typeof result === "string" ? result : undefined;
}
