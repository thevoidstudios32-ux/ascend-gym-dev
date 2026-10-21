import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Copy, Download, Dumbbell, Hash, Link2, MessageCircle, Send, Share2, Sparkles, TrendingUp, Users, Utensils } from "lucide-react";
import { toast } from "sonner";
import { AscendSymbol, AscendWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ExerciseMedia } from "@/components/exercise-media";
import { MuscleMap } from "@/components/muscle-map";
import { getExerciseInfo } from "@/lib/exercise-detail";

const SITE = "https://ascendgym.dev";
const URL = `${SITE}/?utm_source=compartilhar`;
const TEXT = "Conheci o ASCEND: app de treino de academia grátis, com Coach IA que monta sua ficha de treino e registra séries, cargas e RIR.";
const HASHTAGS = ["#AppDeTreino", "#TreinoComIA", "#FichaDeTreino", "#Musculação", "#Academia", "#Hipertrofia", "#TreinoEmCasa", "#Maromba", "#GymBR", "#ASCEND"];
const SEARCHES = ["app de treino grátis", "treino com IA", "ficha de treino personalizada", "alternativa ao Hevy", "registrar carga e RIR", "app de academia em português"];
const FEATURES = [
  { icon: Sparkles, title: "Coach IA", text: "Personalização do programa e ajustes para sua rotina de treino." },
  { icon: Dumbbell, title: "Cada série conta", text: "Registre séries, repetições, cargas e RIR no seu treino." },
  { icon: TrendingUp, title: "Evolução e recordes", text: "Acompanhe seu histórico e compare sua progressão." },
  { icon: Utensils, title: "Nutrição", text: "Registro alimentar, calorias e acompanhamento da hidratação." },
  { icon: Users, title: "Gym Bros", text: "Compartilhe treinos e converse com a comunidade." },
];
const DEMOS = ["Supino reto", "Cadeira extensora", "Remada máquina"];
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export const Route = createFileRoute("/divulgar")({
  head: () => ({
    meta: [
      { title: "ASCEND · Treinos, Coach IA e compartilhamento" },
      { name: "description", content: "Conheça e compartilhe o ASCEND: app de treino grátis em português, ficha personalizada, Coach IA, cargas e RIR. Instale pelo navegador." },
      { property: "og:title", content: "ASCEND · Seu próximo nível começa aqui" },
      { property: "og:description", content: "Treinos personalizados, Coach IA e evolução. Experimente grátis e compartilhe o ASCEND." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ], links: [{ rel: "canonical", href: `${SITE}/divulgar` }],
  }), component: Divulgar,
});
function Signup({ label = "Experimentar grátis", className = "" }: { label?: string; className?: string }) {
  return <Button asChild className={`promo-button ${className}`}><Link to="/auth" search={{ mode: "signup" }}>{label}<ArrowUpRight /></Link></Button>;
}
function Divulgar() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [message, setMessage] = useState(`${TEXT} ${HASHTAGS.slice(0, 4).join(" ")}`);
  const [copied, setCopied] = useState("");
  const [demo, setDemo] = useState(DEMOS[0]);
  const info = getExerciseInfo(demo);
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    const h = (ev: Event) => { ev.preventDefault(); setInstallEvt(ev as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(""), 2200); return () => clearTimeout(timer); }, [copied]);
  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); toast.success("Copiado"); }
    catch { toast.error("Não foi possível copiar. Selecione o texto e copie pelo navegador."); }
  };
  const install = async () => {
    if (!installEvt) { toast('No iPhone: Compartilhar → Adicionar à Tela de Início. No Android ou computador: menu do navegador → Instalar app.', { duration: 9000 }); return; }
    setInstalling(true);
    try { await installEvt.prompt(); const choice = await installEvt.userChoice; if (choice.outcome === "accepted") toast.success("Instalação solicitada"); setInstallEvt(null); }
    catch { toast.error("A instalação não abriu. Tente pelo menu do navegador."); }
    finally { setInstalling(false); }
  };
  const share = async () => {
    try { await navigator.share({ title: "ASCEND", text: message, url: URL }); }
    catch (error) { if (!(error instanceof Error && error.name === "AbortError")) toast.error("Não foi possível compartilhar. Use um dos links abaixo."); }
  };
  const e = encodeURIComponent;
  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${e(`${message} ${URL}`)}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${e(URL)}&text=${e(message)}` },
    { label: "X", icon: Share2, href: `https://twitter.com/intent/tweet?text=${e(message)}&url=${e(URL)}` },
    { label: "Facebook", icon: Users, href: `https://www.facebook.com/sharer/sharer.php?u=${e(URL)}` },
    { label: "LinkedIn", icon: Users, href: `https://www.linkedin.com/sharing/share-offsite/?url=${e(URL)}` },
    { label: "Reddit", icon: MessageCircle, href: `https://www.reddit.com/submit?url=${e(URL)}&title=${e(message)}` },
  ];
  return <div className="promo-page">
    <header className="promo-wrap promo-nav">
      <Link to="/" aria-label="ASCEND — início" className="flex items-center gap-3"><AscendSymbol className="h-7" /><AscendWordmark className="h-4" /></Link>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"><a href="#produto">O produto</a><a href="#compartilhar">Compartilhar</a></nav>
      <Signup label="Criar conta grátis" className="promo-nav-cta" />
    </header>
    <main>
      <section className="promo-hero promo-wrap">
        <p className="promo-eyebrow"><span className="h-px w-8 bg-primary" />ASCEND / FITNESS TECHNOLOGY</p>
        <h1>SEU PRÓXIMO NÍVEL<br /><span>COMEÇA AQUI.</span></h1>
        <p className="promo-hero-copy">Treinos personalizados, Coach IA e acompanhamento da sua evolução em um só lugar.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4"><Signup /><Button variant="ghost" asChild className="promo-button"><a href="#produto">Conheça o ASCEND<ArrowDown /></a></Button></div>
        <div className="promo-hero-foot"><span>APP DE TREINO GRÁTIS · EM PORTUGUÊS</span><span className="flex items-center gap-2"><Download className="size-3" /> CELULAR & COMPUTADOR</span></div>
        <AscendSymbol className="promo-hero-symbol" alt="" />
      </section>
      <section id="produto" className="promo-band">
        <div className="promo-wrap">
          <div className="promo-section-heading"><div><p className="promo-eyebrow">01 / POR DENTRO DO ASCEND</p><h2>O TREINO, EM DETALHES.</h2></div><p>Execução, anatomia e instruções do catálogo ASCEND.</p></div>
          <div className="promo-demo-tabs" role="group" aria-label="Exercício de demonstração">{DEMOS.map(name => <Button key={name} variant={demo === name ? "default" : "secondary"} className="min-h-11 rounded-md" onClick={() => setDemo(name)}>{name}</Button>)}</div>
          <div className="promo-demo">
            <div className="min-w-0"><ExerciseMedia key={info.id} exercise={info} /></div>
            <div className="min-w-0"><p className="promo-eyebrow">FICHA DO EXERCÍCIO</p><h3 className="mt-3 font-display text-4xl">{info.name}</h3><p className="mt-2 text-sm text-muted-foreground">{info.equipment} · {info.difficulty}</p><ol className="mt-6 space-y-4">{info.instructions.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-relaxed"><span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>)}</ol><div className="mt-6"><MuscleMap primaryMuscles={info.primaryMuscles} secondaryMuscles={info.secondaryMuscles} compact /></div></div>
          </div>
        </div>
      </section>
      <section className="promo-wrap promo-section">
        <p className="promo-eyebrow">02 / SUA ROTINA. SEU PROGRESSO.</p><h2>TUDO CONECTADO AO SEU TREINO.</h2>
        <div className="promo-features">{FEATURES.map(({ icon: Icon, title, text }, i) => <article key={title} className="promo-feature"><div className="flex items-center justify-between"><Icon className="size-6 text-primary" /><span className="text-xs text-muted-foreground">0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        <div className="promo-cta"><div><h3>SEU PRÓXIMO TREINO É NO ASCEND.</h3><p>Crie sua conta e comece com um programa para você.</p></div><Signup /></div>
      </section>
      <section id="compartilhar" className="promo-band">
        <div className="promo-wrap promo-section">
          <div className="promo-section-heading"><div><p className="promo-eyebrow">03 / EVOLUIR É MELHOR JUNTO</p><h2>MANDA PARA QUEM TREINA COM VOCÊ.</h2></div><Share2 className="hidden size-8 text-primary md:block" /></div>
          <div className="promo-share-grid">
            <div><label htmlFor="share-message" className="mb-3 block text-sm font-semibold">Sua mensagem</label><textarea id="share-message" value={message} onChange={event => setMessage(event.target.value)} className="promo-message" /><div className="promo-link-preview"><AscendSymbol className="h-8" /><div className="min-w-0"><strong className="block">ASCEND · App de treino grátis</strong><span className="text-sm text-muted-foreground">ascendgym.dev</span></div><ArrowUpRight className="ml-auto size-4 text-muted-foreground" /></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" className="promo-button" onClick={() => copy(`${message} ${URL}`, "text")}>{copied === "text" ? <Check /> : <Copy />}{copied === "text" ? "Texto copiado" : "Copiar texto"}</Button><Button variant="outline" className="promo-button" onClick={() => copy(URL, "link")}>{copied === "link" ? <Check /> : <Link2 />}{copied === "link" ? "Link copiado" : "Copiar link"}</Button></div></div>
            <div><p className="mb-3 text-sm font-semibold">Escolha onde compartilhar</p><div className="promo-networks">{links.map(({ label, href, icon: Icon }) => <Button key={label} variant="outline" asChild className="promo-network"><a href={href} target="_blank" rel="noopener noreferrer"><Icon /><span>{label}</span><ArrowUpRight className="ml-auto" /></a></Button>)}</div>{canShare && <Button className="promo-button mt-3 w-full" onClick={share}><Share2 />Compartilhar pelo dispositivo</Button>}<div className="promo-install"><Download className="size-5 text-primary" /><div><h3 className="font-semibold">Leve o ASCEND com você.</h3><p className="mt-1 text-sm text-muted-foreground">Instale pelo navegador. Sem loja de apps.</p><Button variant="link" className="mt-2 h-11 p-0" onClick={install} disabled={installing}>{installing ? "Abrindo instalação…" : "Instalar o ASCEND"}<ArrowRight /></Button></div></div></div>
          </div>
        </div>
      </section>
      <section className="promo-wrap promo-section">
        <div className="promo-section-heading"><div><p className="promo-eyebrow">04 / A CONVERSA CONTINUA</p><h2>HASHTAGS PARA O SEU POST.</h2></div><Button variant="secondary" className="promo-button" onClick={() => copy(HASHTAGS.join(" "), "hashtags")}>{copied === "hashtags" ? <Check /> : <Copy />}Copiar todas</Button></div>
        <div className="flex flex-wrap gap-2">{HASHTAGS.map(tag => <Button key={tag} variant="outline" className="promo-tag" onClick={() => copy(tag, tag)}>{copied === tag ? <Check /> : <Hash />}{tag.slice(1)}</Button>)}</div>
      </section>
      <section className="promo-band"><div className="promo-wrap promo-section">
        <div className="promo-section-heading"><div><p className="promo-eyebrow">05 / PALAVRAS QUE CONECTAM</p><h2>IDEIAS PARA SUA LEGENDA.</h2></div><Button variant="secondary" className="promo-button" onClick={() => copy(SEARCHES.join(", "), "searches")}><Copy />Copiar termos</Button></div>
        <p className="mb-6 max-w-2xl text-muted-foreground">Use os termos que combinam com seu post, de forma natural. São sugestões para divulgação, não uma garantia de posição no Google.</p>
        <div className="promo-searches">{SEARCHES.map((term, i) => <Button key={term} variant="ghost" className="promo-search" onClick={() => copy(term, term)}><span className="font-mono text-xs text-muted-foreground">0{i + 1}</span><span>{term}</span>{copied === term ? <Check className="ml-auto text-primary" /> : <Copy className="ml-auto text-muted-foreground" />}</Button>)}</div>
      </div></section>
    </main>
    <footer className="promo-wrap promo-footer"><Link to="/" aria-label="ASCEND — início"><AscendWordmark className="h-4" /></Link><p>ASCEND · The Void Studios</p><div className="flex gap-6"><Link to="/">Início</Link><Link to="/auth" search={{ mode: "signup" }}>Criar conta<ArrowUpRight className="ml-1 inline size-3" /></Link></div></footer>
  </div>;
}
