import { describe, expect, test } from "bun:test";
import {
  clientNetworkFrom,
  ipBucket,
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

  test("o navegador não consegue enviar rede nem estado do IP (quem define é o servidor)", () => {
    expect(trackEventSchema.safeParse({ ...ok, p_ip_status: "ok" }).success).toBe(false);
    expect(trackEventSchema.safeParse({ ...ok, p_client_network: "203.0.113.7" }).success).toBe(
      false,
    );
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

describe("rede do visitante (limite por rede)", () => {
  const headers = (h: Record<string, string>) => (name: string) => h[name];

  const ok = (network: string, family: "ipv4" | "ipv6") => ({ status: "ok", network, family });

  test("IPv4 público vindo da Cloudflare: rede = IP inteiro", () => {
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "203.0.113.7" }))).toEqual(
      ok("203.0.113.7", "ipv4"),
    );
  });

  test("IPv6 público: rede = bloco /64", () => {
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "2804:14c:abcd:ef01::1234" }))).toEqual(
      ok("2804:14c:abcd:ef01::/64", "ipv6"),
    );
  });

  test("CGNAT: pessoas diferentes atrás do mesmo IPv4 público caem na mesma rede (o banco adia, não descarta)", () => {
    const a = clientNetworkFrom(headers({ "cf-connecting-ip": "203.0.113.50" }));
    const b = clientNetworkFrom(headers({ "cf-connecting-ip": "203.0.113.50" }));
    expect(a).toEqual(ok("203.0.113.50", "ipv4"));
    expect(b).toEqual(a);
  });

  test("IP ausente: estado 'missing', sem rede inventada", () => {
    expect(clientNetworkFrom(headers({}))).toEqual({
      status: "missing",
      network: null,
      family: null,
    });
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "   " }))).toEqual({
      status: "missing",
      network: null,
      family: null,
    });
  });

  test("IP inválido: estado 'invalid', sem rede", () => {
    for (const bad of ["1.2.3.4; DROP TABLE", "abc", "1.2.3.256", "1::2::3"])
      expect(clientNetworkFrom(headers({ "cf-connecting-ip": bad }))).toEqual({
        status: "invalid",
        network: null,
        family: null,
      });
  });

  test("cabeçalhos que o visitante pode inventar são ignorados (sem cf-connecting-ip → 'missing')", () => {
    const forged = headers({
      "true-client-ip": "198.51.100.9",
      "x-forwarded-for": "198.51.100.10",
      "x-real-ip": "198.51.100.11",
    });
    expect(clientNetworkFrom(forged)).toEqual({ status: "missing", network: null, family: null });
    // com cf-connecting-ip presente, os forjados também não interferem
    expect(
      clientNetworkFrom(
        headers({
          "cf-connecting-ip": "203.0.113.7",
          "true-client-ip": "198.51.100.9",
          "x-real-ip": "198.51.100.12",
        }),
      ),
    ).toEqual(ok("203.0.113.7", "ipv4"));
  });

  test("IPv4 mapeado em IPv6 é IPv4, em qualquer grafia (não vira um bloco IPv6 comum)", () => {
    for (const ip of ["::ffff:203.0.113.7", "::ffff:cb00:7107", "0:0:0:0:0:ffff:cb00:7107"])
      expect(clientNetworkFrom(headers({ "cf-connecting-ip": ip }))).toEqual(
        ok("203.0.113.7", "ipv4"),
      );
    // privado continua não confiável mesmo em hexadecimal (::ffff:a00:1 = 10.0.0.1)
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "::ffff:a00:1" }))).toEqual({
      status: "untrusted",
      network: null,
      family: "ipv4",
    });
    expect(ipBucket("::ffff:cb00:7108")).toBe("203.0.113.8");
  });

  test("IP de infraestrutura não representa o visitante: 'untrusted', sem rede", () => {
    const cases: [string, "ipv4" | "ipv6"][] = [
      ["2a06:98c0:3600::103", "ipv6"], // subrequisição de Worker entre zonas (documentado pela Cloudflare)
      ["2a06:98c7:ffff::1", "ipv6"], // ainda dentro de 2a06:98c0::/29
      ["127.0.0.1", "ipv4"],
      ["::1", "ipv6"],
      ["10.1.2.3", "ipv4"],
      ["172.20.0.1", "ipv4"],
      ["192.168.0.10", "ipv4"],
      ["100.64.1.2", "ipv4"], // lado interno de CGNAT (não é um IP público)
      ["169.254.1.1", "ipv4"],
      ["fd00::1", "ipv6"],
      ["fe80::1%eth0", "ipv6"],
      ["::ffff:10.0.0.1", "ipv4"],
    ];
    for (const [ip, family] of cases)
      expect(clientNetworkFrom(headers({ "cf-connecting-ip": ip }))).toEqual({
        status: "untrusted",
        network: null,
        family,
      });
    // vizinhos públicos fora das faixas continuam válidos
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "2a06:98c8::1" })).status).toBe("ok");
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "100.128.0.1" })).status).toBe("ok");
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "172.32.0.1" })).status).toBe("ok");
  });

  test("reserva: sem cabeçalho, usa o endereço da conexão (no Cloudflare é o mesmo cabeçalho)", () => {
    expect(clientNetworkFrom(headers({}), "198.51.100.2")).toEqual(ok("198.51.100.2", "ipv4"));
    expect(clientNetworkFrom(headers({}), "127.0.0.1").status).toBe("untrusted");
    expect(clientNetworkFrom(headers({}), undefined).status).toBe("missing");
    expect(clientNetworkFrom(headers({ "cf-connecting-ip": "203.0.113.7" }), "10.0.0.1")).toEqual(
      ok("203.0.113.7", "ipv4"),
    );
  });

  test("IPv6: todos os endereços do mesmo bloco /64 viram a mesma rede", () => {
    const net = "2001:db8:abcd:12::/64";
    for (const ip of [
      "2001:db8:abcd:12::1",
      "2001:db8:abcd:12::ffff",
      "2001:0db8:abcd:0012:ffff:ffff:ffff:ffff",
      "2001:DB8:ABCD:12:1:2:3:4",
      "2001:db8:abcd:12::1%eth0",
    ])
      expect(ipBucket(ip)).toBe(net);
    expect(ipBucket("2001:db8:abcd:13::1")).toBe("2001:db8:abcd:13::/64");
  });

  test("IPv4 continua inteiro; IPv4 dentro de IPv6 é tratado como IPv4", () => {
    expect(ipBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(ipBucket("203.0.113.8")).toBe("203.0.113.8");
    expect(ipBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(ipBucket("64:ff9b::192.0.2.1")).toBe("64:ff9b:0:0::/64");
    expect(ipBucket("::1")).toBe("0:0:0:0::/64");
  });

  test("valores inválidos não viram rede", () => {
    for (const bad of [
      "",
      "abc",
      "1.2.3.256",
      "1.2.3",
      "1::2::3",
      "1:2:3:4:5:6:7:8:9",
      "12345::1",
      "::g",
    ])
      expect(ipBucket(bad)).toBeNull();
  });
});
