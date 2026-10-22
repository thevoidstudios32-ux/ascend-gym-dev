/**
 * Atribuição de marketing no navegador (sem dados pessoais).
 *
 * - "Primeira origem" (first): a primeira campanha com UTM que trouxe este navegador.
 * - "Campanha atual" (last): a campanha com UTM mais recente, válida por 30 dias.
 * - visitorId: UUID aleatório, só identifica o navegador para contar visitantes únicos.
 *
 * Módulo puro e client-safe: recebe Storage/relógio por parâmetro para poder ser testado.
 */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>> & { utm_source: string };
export type Touch = Utm & { at: string };
export type AttributionState = { visitorId: string; first?: Touch; last?: Touch };

export const STORAGE_KEY = "ascend_acq_v1";
export const LAST_TOUCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Mesma normalização da função SQL app_private.clean_utm. */
export function cleanUtm(value: string | null | undefined): string | undefined {
  const v = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .slice(0, 100);
  return v || undefined;
}

/** Lê UTMs de uma querystring. Exige utm_source; senão não é uma visita de campanha. */
export function parseUtm(search: string): Utm | null {
  const params = new URLSearchParams(search);
  const source = cleanUtm(params.get("utm_source"));
  if (!source) return null;
  const utm: Utm = { utm_source: source };
  for (const key of UTM_KEYS) {
    const v = cleanUtm(params.get(key));
    if (v) utm[key] = v;
  }
  return utm;
}

export function utmSignature(utm: Partial<Record<UtmKey, string>>): string {
  return UTM_KEYS.map((k) => utm[k] ?? "").join("|");
}

function isTouch(x: unknown): x is Touch {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as Touch).utm_source === "string" &&
    typeof (x as Touch).at === "string"
  );
}

export function loadState(storage: Storage | null, newId: () => string): AttributionState {
  let parsed: Partial<AttributionState> = {};
  try {
    parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "{}") ?? {};
  } catch {
    parsed = {};
  }
  const visitorId =
    typeof parsed.visitorId === "string" && /^[0-9a-f-]{36}$/i.test(parsed.visitorId)
      ? parsed.visitorId
      : newId();
  const state: AttributionState = { visitorId };
  if (isTouch(parsed.first)) state.first = parsed.first;
  if (isTouch(parsed.last)) state.last = parsed.last;
  return state;
}

export function saveState(storage: Storage | null, state: AttributionState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento bloqueado (modo privado): segue sem atribuição */
  }
}

/** Registra uma chegada por campanha: a primeira origem nunca é sobrescrita. */
export function recordTouch(state: AttributionState, utm: Utm, now: Date): AttributionState {
  const touch: Touch = { ...utm, at: now.toISOString() };
  return { ...state, first: state.first ?? touch, last: touch };
}

/** Campanha atual só vale por 30 dias; depois disso, considera-se sem campanha atual. */
export function currentTouch(state: AttributionState, now: Date): Touch | undefined {
  if (!state.last) return undefined;
  const age = now.getTime() - new Date(state.last.at).getTime();
  return Number.isFinite(age) && age >= 0 && age <= LAST_TOUCH_TTL_MS ? state.last : undefined;
}

/* ------------------------------------------------------------------ fila de envio
 * Eventos ficam guardados até o servidor confirmar o recebimento. Assim um clique não se
 * perde se a página recarregar ou a rede falhar; o servidor ignora event_id repetido. */
export const PENDING_KEY = "ascend_pending_events_v1";
export const PENDING_MAX = 20;
export const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingEvent = {
  p_event_id: string;
  p_visitor_id: string;
  p_event_type: "visit" | "signup_cta_click";
  p_cta: string | null;
  p_path: string;
  p_utm: Partial<Record<UtmKey, string>>;
  queued_at: string;
};

export function loadPending(storage: Storage | null, now: Date): PendingEvent[] {
  try {
    const list: unknown = JSON.parse(storage?.getItem(PENDING_KEY) ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is PendingEvent =>
        !!e &&
        typeof e.p_event_id === "string" &&
        typeof e.queued_at === "string" &&
        now.getTime() - new Date(e.queued_at).getTime() <= PENDING_TTL_MS,
    );
  } catch {
    return [];
  }
}

export function savePending(storage: Storage | null, list: PendingEvent[]): void {
  try {
    storage?.setItem(PENDING_KEY, JSON.stringify(list.slice(-PENDING_MAX)));
  } catch {
    /* armazenamento bloqueado */
  }
}

export function addPending(storage: Storage | null, event: PendingEvent, now: Date): void {
  const list = loadPending(storage, now).filter((e) => e.p_event_id !== event.p_event_id);
  savePending(storage, [...list, event]);
}

export function removePending(storage: Storage | null, eventId: string, now: Date): void {
  savePending(
    storage,
    loadPending(storage, now).filter((e) => e.p_event_id !== eventId),
  );
}

/** O que acompanha o cadastro (metadados do usuário) para o caso de confirmar o e-mail em outro aparelho. */
export function signupMetadata(
  state: AttributionState,
  now: Date,
): { first?: Touch; last?: Touch } | undefined {
  const last = currentTouch(state, now);
  if (!state.first && !last) return undefined;
  return { ...(state.first ? { first: state.first } : {}), ...(last ? { last } : {}) };
}
