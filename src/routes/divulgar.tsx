import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AscendSymbol, AscendWordmark } from "@/components/brand";

const SITE = "https://ascendgym.dev";
const TEXT =
  "Conheci o ASCEND: app de treino de academia grátis, com Coach IA que monta sua ficha de treino e registra séries, cargas e RIR.";

export const Route = createFileRoute("/divulgar")({
  head: () => ({
    meta: [
      { title: "Compartilhe o ASCEND · App de treino grátis com IA" },
      {
        name: "description",
        content:
          "Compartilhe o ASCEND, app de treino de academia grátis com Coach IA e ficha de treino personalizada. Instale pelo navegador no celular.",
      },
      { property: "og:title", content: "ASCEND · App de treino grátis com Coach IA" },
      {
        property: "og:description",
        content: "Ficha de treino personalizada, registro de cargas e RIR. Instale pelo navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/divulgar` }],
  }),
  component: Divulgar,
});

const HASHTAGS = [
  "#AppDeTreino", "#TreinoComIA", "#FichaDeTreino", "#Musculação", "#Academia",
  "#Hipertrofia", "#TreinoEmCasa", "#Maromba", "#GymBR", "#ASCEND",
];

const SEARCHES = [
  "app de treino grátis", "treino com IA", "ficha de treino personalizada",
  "alternativa ao Hevy", "registrar carga e RIR", "app de academia em português",
];

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function Divulgar() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [canShare, setCanShare] = useState(false);
  const url = `${SITE}/?utm_source=compartilhar`;
  const msg = `${TEXT} ${HASHTAGS.slice(0, 4).join(" ")}`;
  const e = encodeURIComponent;

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    const h = (ev: Event) => { ev.preventDefault(); setInstallEvt(ev as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${e(`${msg} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${e(url)}&text=${e(msg)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${e(msg)}&url=${e(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${e(url)}&title=${e("ASCEND: app de treino grátis com Coach IA")}` },
  ];

  const copy = async (t: string, ok: string) => {
    await navigator.clipboard.writeText(t);
    toast.success(ok);
  };

  const install = async () => {
    if (installEvt) {
      await installEvt.prompt();
      setInstallEvt(null);
      return;
    }
    toast("No iPhone: toque em Compartilhar e depois em \"Adicionar à Tela de Início\". No Android: menu do navegador e \"Instalar app\".");
  };

  const card = "rounded-2xl border border-border bg-card p-6";
  const chip = "rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2" aria-label="ASCEND — início">
          <AscendSymbol className="h-6" /><AscendWordmark className="h-3" />
        </Link>
        <Link to="/auth" search={{ mode: "signup" }} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Criar conta grátis
        </Link>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 pb-16">
        <section className="py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Divulgue</p>
          <h1 className="text-display mt-2 text-5xl md:text-6xl">APP DE TREINO GRÁTIS COM COACH IA</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Ficha de treino personalizada, registro de séries, cargas e RIR, em português. Compartilhe com quem treina com você.
          </p>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Instalar pelo navegador</h2>
          <p className="mt-1 text-sm text-muted-foreground">Funciona no celular e no computador, sem loja de apps.</p>
          <button onClick={install} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            <Download className="size-4" /> Instalar o ASCEND
          </button>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Compartilhar</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {canShare && (
              <button className={chip} onClick={() => navigator.share({ title: "ASCEND", text: msg, url }).catch(() => {})}>
                <Share2 className="mr-1 inline size-4" /> Compartilhar
              </button>
            )}
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={chip}>{l.label}</a>
            ))}
            <button className={chip} onClick={() => copy(url, "Link copiado")}>
              <Copy className="mr-1 inline size-4" /> Copiar link
            </button>
          </div>
          <div className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground">{msg}</div>
          <button className={`${chip} mt-3`} onClick={() => copy(`${msg} ${url}`, "Texto copiado")}>Copiar texto</button>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Hashtags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {HASHTAGS.map((h) => (
              <button key={h} className={chip} onClick={() => copy(h, `${h} copiada`)}>{h}</button>
            ))}
          </div>
          <button className={`${chip} mt-3`} onClick={() => copy(HASHTAGS.join(" "), "Hashtags copiadas")}>Copiar todas</button>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">O que as pessoas buscam</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use estes termos nas legendas e posts.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {SEARCHES.map((s) => <li key={s} className="rounded-xl bg-muted px-4 py-3 text-sm">{s}</li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}
