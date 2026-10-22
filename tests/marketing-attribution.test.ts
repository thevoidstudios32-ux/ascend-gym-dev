import { describe, expect, test } from "bun:test";
import {
  clientIpFrom,
  trackEventSchema,
  PENDING_MAX,
  addPending,
  loadPending,
  removePending,
  STORAGE_KEY,
  cleanUtm,
  currentTouch,
  loadState,
  parseUtm,
  recordTouch,
  saveState,
  signupMetadata,
  utmSignature,
} from "../src/lib/marketing-attribution";

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
}

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const newId = () => ID;
const TIKTOK =
  "?utm_source=TikTok&utm_medium=organic_social&utm_campaign=ascend_growth&utm_content=2026-10-22_erros_iniciantes_i2_v4&mode=signup";

describe("parseUtm", () => {
  test("lê e normaliza os 4 UTMs como o banco (minúsculas, caracteres seguros)", () => {
    expect(parseUtm(TIKTOK)).toEqual({
      utm_source: "tiktok",
      utm_medium: "organic_social",
      utm_campaign: "ascend_growth",
      utm_content: "2026-10-22_erros_iniciantes_i2_v4",
    });
    expect(cleanUtm(" Tik Tok<script> ")).toBe("tik_tok_script_");
    expect(cleanUtm("x".repeat(300))?.length).toBe(100);
  });

  test("sem utm_source não é visita de campanha", () => {
    expect(parseUtm("?utm_medium=social")).toBeNull();
    expect(parseUtm("?mode=signup")).toBeNull();
    expect(parseUtm("")).toBeNull();
  });
});

describe("primeira origem e campanha atual", () => {
  test("primeira origem nunca é sobrescrita; campanha atual é a mais recente", () => {
    let s = loadState(null, newId);
    s = recordTouch(s, parseUtm(TIKTOK)!, new Date("2026-10-22T10:00:00Z"));
    s = recordTouch(
      s,
      parseUtm("?utm_source=instagram&utm_campaign=outra")!,
      new Date("2026-10-23T10:00:00Z"),
    );
    expect(s.first?.utm_source).toBe("tiktok");
    expect(s.last?.utm_source).toBe("instagram");
  });

  test("campanha atual expira em 30 dias; primeira origem continua", () => {
    const s = recordTouch(
      loadState(null, newId),
      parseUtm(TIKTOK)!,
      new Date("2026-10-01T00:00:00Z"),
    );
    expect(currentTouch(s, new Date("2026-10-20T00:00:00Z"))?.utm_source).toBe("tiktok");
    expect(currentTouch(s, new Date("2026-11-15T00:00:00Z"))).toBeUndefined();
    expect(signupMetadata(s, new Date("2026-11-15T00:00:00Z"))).toEqual({ first: s.first! });
  });

  test("sem nenhuma campanha não envia metadados de origem", () => {
    expect(signupMetadata(loadState(null, newId), new Date())).toBeUndefined();
  });

  test("estado persiste no navegador e mantém o mesmo visitante", () => {
    const st = new MemoryStorage();
    const s = recordTouch(
      loadState(st, newId),
      parseUtm(TIKTOK)!,
      new Date("2026-10-22T10:00:00Z"),
    );
    saveState(st, s);
    const again = loadState(st, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(again.visitorId).toBe(ID);
    expect(again.first?.utm_content).toBe("2026-10-22_erros_iniciantes_i2_v4");
  });

  test("armazenamento corrompido ou malicioso é descartado com segurança", () => {
    const st = new MemoryStorage();
    st.setItem(STORAGE_KEY, "{not json");
    expect(loadState(st, newId)).toEqual({ visitorId: ID });
    st.setItem(STORAGE_KEY, JSON.stringify({ visitorId: "<x>", first: { utm_source: 5 } }));
    expect(loadState(st, newId)).toEqual({ visitorId: ID });
  });

  test("assinatura distingue vídeos diferentes da mesma campanha (evita contar visita duas vezes)", () => {
    const a = parseUtm(TIKTOK)!;
    const b = parseUtm(TIKTOK.replace("i2_v4", "i3_v1"))!;
    expect(utmSignature(a)).toBe(utmSignature(parseUtm(TIKTOK)!));
    expect(utmSignature(a)).not.toBe(utmSignature(b));
  });
});

describe("fila de envio (clique não se perde se a página recarregar)", () => {
  const ev = (id: string, queued = "2026-10-22T10:00:00Z") => ({
    p_event_id: id,
    p_visitor_id: ID,
    p_event_type: "signup_cta_click" as const,
    p_cta: "landing_hero",
    p_path: "/",
    p_utm: { utm_source: "tiktok" },
    queued_at: queued,
  });
  const now = new Date("2026-10-22T10:01:00Z");

  test("guarda, não duplica o mesmo evento e remove após confirmação", () => {
    const st = new MemoryStorage();
    addPending(st, ev("e1"), now);
    addPending(st, ev("e1"), now);
    addPending(st, ev("e2"), now);
    expect(loadPending(st, now).map((e) => e.p_event_id)).toEqual(["e1", "e2"]);
    removePending(st, "e1", now);
    expect(loadPending(st, now).map((e) => e.p_event_id)).toEqual(["e2"]);
  });

  test("limita o tamanho e descarta pendências com mais de 7 dias", () => {
    const st = new MemoryStorage();
    for (let i = 0; i < PENDING_MAX + 5; i++) addPending(st, ev(`e${i}`), now);
    expect(loadPending(st, now).length).toBe(PENDING_MAX);
    const later = new Date("2026-11-05T00:00:00Z");
    expect(loadPending(st, later)).toEqual([]);
  });
});

describe("entrada da função de servidor", () => {
  const ok = {
    p_event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    p_visitor_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    p_event_type: "signup_cta_click",
    p_cta: "landing_hero",
    p_path: "/",
    p_utm: { utm_source: "tiktok", utm_content: "video_1" },
  };

  test("aceita evento válido", () => {
    expect(trackEventSchema.safeParse(ok).success).toBe(true);
  });

  test("recusa campos extras (ex.: tentar mandar o IP pelo navegador) e valores inválidos", () => {
    expect(trackEventSchema.safeParse({ ...ok, p_client_ip: "1.2.3.4" }).success).toBe(false);
    expect(
      trackEventSchema.safeParse({ ...ok, p_utm: { ...ok.p_utm, email: "a@b.com" } }).success,
    ).toBe(false);
    expect(trackEventSchema.safeParse({ ...ok, p_event_type: "signup" }).success).toBe(false);
    expect(trackEventSchema.safeParse({ ...ok, p_cta: "<script>" }).success).toBe(false);
    expect(trackEventSchema.safeParse({ ...ok, p_event_id: "nao-e-uuid" }).success).toBe(false);
    expect(
      trackEventSchema.safeParse({ ...ok, p_utm: { utm_source: "x".repeat(101) } }).success,
    ).toBe(false);
  });
});

describe("IP do visitante", () => {
  const headers = (h: Record<string, string>) => (name: string) => h[name];

  test("usa o cabeçalho da Cloudflare, que o visitante não consegue forjar", () => {
    expect(clientIpFrom(headers({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIpFrom(headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  test("ignora X-Forwarded-For e valores estranhos", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
    expect(clientIpFrom(headers({ "cf-connecting-ip": "1.2.3.4; DROP TABLE" }))).toBeNull();
    expect(clientIpFrom(headers({}), "198.51.100.2")).toBe("198.51.100.2");
    expect(clientIpFrom(headers({}))).toBeNull();
  });
});
