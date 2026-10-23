/**
 * Atribuição de marketing no navegador (sem dados pessoais).
 *
 * - "Primeira origem" (first): a primeira campanha com UTM que trouxe este navegador.
 * - "Campanha atual" (last): a campanha com UTM mais recente, válida por 30 dias.
 * - visitorId: UUID aleatório, só identifica o navegador para contar visitantes únicos.
 *
 * Módulo puro e client-safe: recebe Storage/relógio por parâmetro para poder ser testado.
 */
import { z } from "zod";

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

/* ------------------------------------------------------------------ envio pelo servidor */

const utmValue = z.string().max(100).optional();

/** Formato aceito pela função de servidor que registra visitas e cliques. */
export const trackEventSchema = z
  .object({
    p_event_id: z.string().uuid(),
    p_visitor_id: z.string().uuid(),
    p_event_type: z.enum(["visit", "signup_cta_click"]),
    p_cta: z
      .string()
      .regex(/^[a-z0-9_]{1,40}$/)
      .nullable(),
    p_path: z.string().max(200),
    p_utm: z
      .object({
        utm_source: utmValue,
        utm_medium: utmValue,
        utm_campaign: utmValue,
        utm_content: utmValue,
      })
      .strict(),
  })
  .strict();
export type TrackEventInput = z.infer<typeof trackEventSchema>;

/**
 * Estado do IP do visitante, informado ao banco junto com a rede:
 *  - ok: IP público válido vindo da borda da Cloudflare → limite por rede se aplica;
 *  - missing: cabeçalho ausente → sem rede (não há como identificar a rede);
 *  - invalid: valor que não é um IP → sem rede;
 *  - untrusted: IP de infraestrutura (Worker da Cloudflare, rede privada/local, CGNAT
 *    interno) que não representa o visitante → sem rede.
 * Sem IP confiável NÃO se inventa rede nem se agrupa visitantes: o limite por rede deixa
 * de valer para o evento e o painel mostra quantos eventos chegaram assim.
 */
export type IpStatus = "ok" | "missing" | "invalid" | "untrusted";
export type NetworkInfo = {
  status: IpStatus;
  network: string | null;
  family: "ipv4" | "ipv6" | null;
};

/**
 * Rede do visitante, para o limite por rede. Usa somente o cabeçalho que a borda da
 * Cloudflare define (cf-connecting-ip); no runtime Cloudflare o "endereço da conexão"
 * (getRequestIP) é esse mesmo cabeçalho. Nunca usa cabeçalhos que o visitante possa enviar
 * por conta própria (X-Forwarded-For, X-Real-IP, True-Client-IP).
 */
export function clientNetworkFrom(
  header: (name: string) => string | undefined,
  connectionIp?: string,
): NetworkInfo {
  const raw = (header("cf-connecting-ip") ?? connectionIp ?? "").trim();
  if (!raw) return { status: "missing", network: null, family: null };
  const ip = parseIp(raw);
  if (!ip) return { status: "invalid", network: null, family: null };
  const family = ip.family === 4 ? "ipv4" : "ipv6";
  if (isUntrustedIp(ip)) return { status: "untrusted", network: null, family };
  return { status: "ok", network: bucketOf(ip), family };
}

/**
 * Reduz o IP ao bloco usado no limite: IPv4 inteiro; IPv6 só os primeiros 64 bits (/64),
 * pois um único assinante costuma receber um /64 inteiro e poderia trocar de endereço à
 * vontade. Também diminui a precisão do dado guardado. Retorna null se não for um IP válido.
 */
export function ipBucket(raw: string | null | undefined): string | null {
  const ip = parseIp(raw);
  return ip ? bucketOf(ip) : null;
}

type ParsedIp = { family: 4; octets: number[] } | { family: 6; groups: number[] };

function bucketOf(ip: ParsedIp): string {
  if (ip.family === 4) return ip.octets.join(".");
  return `${ip.groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(":")}::/64`;
}

/** Faixas que não representam um visitante real na borda da Cloudflare. */
function isUntrustedIp(ip: ParsedIp): boolean {
  if (ip.family === 4) {
    const [a = 0, b = 0] = ip.octets;
    return (
      a === 0 || // "esta rede"
      a === 10 || // privada
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10, lado interno de CGNAT
      (a === 169 && b === 254) || // link-local
      (a === 172 && b >= 16 && b <= 31) || // privada
      (a === 192 && b === 168) || // privada
      a >= 224 // multicast/reservado
    );
  }
  const [g0 = 0, g1 = 0] = ip.groups;
  return (
    ip.groups.every((g) => g === 0) || // ::
    (ip.groups.slice(0, 7).every((g) => g === 0) && ip.groups[7] === 1) || // ::1
    (g0 & 0xfe00) === 0xfc00 || // fc00::/7 local única
    (g0 & 0xffc0) === 0xfe80 || // fe80::/10 link-local
    (g0 & 0xff00) === 0xff00 || // multicast
    (g0 === 0x2a06 && (g1 & 0xfff8) === 0x98c0) // 2a06:98c0::/29 Cloudflare (subrequisições de Workers)
  );
}

function parseIp(raw: string | null | undefined): ParsedIp | null {
  let ip = (raw ?? "").trim().toLowerCase();
  const zone = ip.indexOf("%");
  if (zone >= 0) ip = ip.slice(0, zone);
  const v4 = ipv4Octets(ip);
  if (v4) return { family: 4, octets: v4 };
  if (!/^[0-9a-f:.]{2,45}$/.test(ip)) return null;
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const toGroups = (s: string | undefined) => (s ? s.split(":") : []);
  const head = toGroups(halves[0]);
  const tail = toGroups(halves[1]);
  // IPv4 embutido no final (ex.: 64:ff9b::192.0.2.1) vira dois grupos de 16 bits
  const lastList = halves.length === 2 ? tail : head;
  const last = lastList[lastList.length - 1];
  if (last?.includes(".")) {
    const o = ipv4Octets(last);
    if (!o) return null;
    lastList.splice(
      -1,
      1,
      ((o[0]! << 8) | o[1]!).toString(16),
      ((o[2]! << 8) | o[3]!).toString(16),
    );
  }
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  const n = groups.map((g) => parseInt(g, 16));
  // IPv4 mapeado em IPv6 (::ffff:0:0/96), em qualquer grafia (::ffff:1.2.3.4 ou ::ffff:102:304),
  // é um IPv4: tratado como IPv4 (rede e faixas não confiáveis corretas).
  if (n.slice(0, 5).every((g) => g === 0) && n[5] === 0xffff) {
    const [hi = 0, lo = 0] = n.slice(6);
    return { family: 4, octets: [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff] };
  }
  return { family: 6, groups: n };
}

function ipv4Octets(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((n) => n <= 255) ? o : null;
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
