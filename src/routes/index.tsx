import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  Medal,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import { AscendSymbol, AscendWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LandingHeroVideo, landingHeroPoster } from "@/components/landing-hero-video";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASCEND · Treino, progresso e Coach IA" },
      {
        name: "description",
        content:
          "Treino, progresso, nutrição, comunidade e um Coach IA em um único sistema. Transforme esforço em evolução visível.",
      },
      { property: "og:title", content: "ASCEND · Cada repetição vira evidência" },
      {
        property: "og:description",
        content: "Um sistema completo para treinar, medir sua evolução e ir além.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: landingHeroPoster.url, fetchpriority: "high" },
    ],
  }),
  component: Landing,
});

const signupSearch = { mode: "signup" as const };

const systemItems = [
  { number: "01", icon: Dumbbell, title: "Treinamento", text: "Programas, séries e cargas registrados em segundos." },
  { number: "02", icon: BarChart3, title: "Progresso", text: "Cada número vira tendência, comparação e direção." },
  { number: "03", icon: Utensils, title: "Nutrição", text: "Seu combustível medido junto ao trabalho que ele sustenta." },
  { number: "04", icon: Users, title: "Comunidade", text: "Um círculo de atletas que mantém você no ritmo." },
  { number: "05", icon: BrainCircuit, title: "Coach IA", text: "Lê seu histórico e ajusta o próximo passo." },
];

const workoutRows = [
  ["Supino reto", "100×8 · 105×6 · 110×5", "112,5 kg", "+2,5 kg"],
  ["Supino inclinado", "32×10 · 34×10 · 34×9", "34 kg", "+2 kg"],
  ["Paralelas com peso", "20×8 · 20×8 · 22,5×7", "+22,5 kg", "NOVO PR"],
  ["Crucifixo no cabo", "18×12 · 18×12 · 20×10", "20 kg", "Estável"],
];

const feed = [
  { initial: "K", name: "kai.lifts", action: "Novo recorde pessoal", detail: "Terra · 220 kg × 3", likes: "312" },
  { initial: "N", name: "noor.trains", action: "Pull · Força", detail: "6 exercícios · 21 séries", likes: "148" },
  { initial: "T", name: "teo.ascende", action: "Conquista desbloqueada", detail: "100 treinos registrados", likes: "521" },
];

function SignupLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link to="/auth" search={signupSearch} className={className}>
      {children}
    </Link>
  );
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <div className="landing-kicker">
      <span>{number}</span>
      <span>{children}</span>
    </div>
  );
}

function Landing() {
  // Menu transparente sobre a hero; ganha fundo e linha ao rolar.
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => header.current?.classList.toggle("is-scrolled", window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-grain" aria-hidden="true" />

      <header ref={header} className="landing-header">
        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#top" aria-label="ASCEND — início" className="landing-brand">
            <AscendSymbol className="h-6" />
            <AscendWordmark className="h-3" />
          </a>
          <div className="landing-nav-links">
            <a href="#product">Produto</a>
            <a href="#training">Treinos</a>
            <a href="#coach">Coach IA</a>
            <a href="#community">Comunidade</a>
          </div>
          <div className="flex items-center gap-2">
            <SignupLink className="landing-login">Entrar</SignupLink>
            <SignupLink className="landing-button landing-button-small">
              Conheça o ASCEND <ArrowRight className="size-4" />
            </SignupLink>
          </div>
        </nav>
      </header>

      <main>
        <section id="top" className="landing-hero">
          <LandingHeroVideo />

          <div className="landing-hero-content">
            <p className="landing-overline">ASCEND · Treino e evolução</p>
            <h1>
              Sua evolução não{" "}
              <span>acontece por acaso.</span>
            </h1>
            <p className="landing-hero-copy">
              Treino, progresso, nutrição, comunidade e um Coach IA — um sistema que transforma
              seu esforço em evolução visível.
            </p>
            <div className="landing-hero-actions">
              <Button asChild className="landing-button landing-button-primary">
                <Link to="/auth" search={signupSearch}>Começar gratuitamente <ArrowRight className="size-4" /></Link>
              </Button>
              <SignupLink className="landing-button landing-button-secondary">
                Explore o ASCEND
              </SignupLink>
            </div>
          </div>

          <div className="landing-hero-bottom">
            <a href="#system">Descobrir <ArrowDown className="size-4" /></a>
          </div>
        </section>

        <section id="system" className="landing-section landing-system">
          <div className="landing-section-intro">
            <SectionLabel number="01">O sistema ASCEND</SectionLabel>
            <h2>UM SISTEMA.<br /><span>SUA EVOLUÇÃO INTEIRA.</span></h2>
            <p>Cinco áreas que antes viviam separadas. No ASCEND, cada registro torna todo o sistema mais inteligente.</p>
          </div>
          <div className="landing-system-grid">
            {systemItems.map((item) => (
              <SignupLink key={item.number} className="landing-system-card">
                <span className="landing-card-number">{item.number}</span>
                <item.icon className="size-6" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <ArrowRight className="landing-card-arrow size-5" />
              </SignupLink>
            ))}
          </div>
        </section>

        <section id="product" className="landing-section landing-product">
          <div className="landing-section-intro landing-section-intro-centered">
            <SectionLabel number="02">A interface</SectionLabel>
            <h2 className="is-editorial">Construído como<br />um instrumento.</h2>
            <p>Cada tela responde a uma pergunta: estou melhorando? Detalhe onde importa, silêncio no resto.</p>
          </div>
          <SignupLink className="landing-dashboard" aria-label="Criar conta e conhecer o painel ASCEND">
            <aside className="landing-dashboard-side">
              <AscendSymbol className="h-8" />
              {[BarChart3, Dumbbell, BrainCircuit, Users, Trophy].map((Icon, index) => (
                <span key={index} className={index === 0 ? "is-active" : ""}><Icon className="size-5" /></span>
              ))}
              <CircleUserRound className="mt-auto size-6" />
            </aside>
            <div className="landing-dashboard-main">
              <div className="landing-dashboard-top"><div><small>SEMANA 38 · BLOCO 3 DE 4</small><h3>Boa noite, atleta.</h3></div><span>Sequência de 48 dias <Flame className="size-4" /></span></div>
              <div className="landing-stat-row">
                <div><small>PRONTIDÃO</small><strong>92</strong><span>Excelente</span></div>
                <div><small>VOLUME · 4 SEMANAS</small><strong>+12,4%</strong><span>Subindo</span></div>
                <div><small>SONO</small><strong>7h40</strong><span>Recuperado</span></div>
              </div>
              <div className="landing-dashboard-grid">
                <div className="landing-chart-card"><small>FORÇA · 1RM ESTIMADO</small><strong>112,5 <em>kg</em></strong><div className="landing-chart"><i /><i /><i /><i /><i /><i /><i /><i /></div><span>+8,5% nas últimas 12 semanas</span></div>
                <div className="landing-session-card"><small>TREINO DE HOJE</small><h4>Push · Hipertrofia</h4><p>4 exercícios · 15 séries</p><span>Supino reto <b>4 × 6</b></span><span>Supino inclinado <b>3 × 10</b></span><span>Paralelas <b>3 × 8</b></span></div>
              </div>
            </div>
          </SignupLink>
        </section>

        <section id="training" className="landing-section landing-training">
          <div className="landing-split-heading">
            <div><SectionLabel number="03">Treino inteligente</SectionLabel><h2 className="is-white">TREINE COM<br /><span>PROPÓSITO.</span></h2></div>
            <p>O ASCEND transforma cada sessão em dados mensuráveis. Carga, repetições, volume e recordes deixam de ser achismo.</p>
          </div>
          <SignupLink className="landing-workout-panel">
            <div className="landing-panel-head"><div><span>Push A · Hipertrofia</span><small>Semana 38 · Sessão 47</small></div><strong><Clock3 className="size-4" /> 01:02:01</strong></div>
            <div className="landing-workout-table">
              <div className="landing-workout-row landing-workout-labels"><span>EXERCÍCIO</span><span>SÉRIES · KG × REPS</span><span>MELHOR</span><span>EVOLUÇÃO</span></div>
              {workoutRows.map(([exercise, sets, top, progress], index) => (
                <div className="landing-workout-row" key={exercise}>
                  <span><i>{String(index + 1).padStart(2, "0")}</i><b>{exercise}</b></span><span>{sets}</span><span>{top}</span><span className={index === 2 ? "is-pr" : ""}>{progress}</span>
                </div>
              ))}
            </div>
            <div className="landing-panel-footer"><span>11 de 15 séries concluídas</span><div><i /></div><strong>+8.420 kg de volume</strong></div>
          </SignupLink>
        </section>

        <section id="coach" className="landing-section landing-coach">
          <div className="landing-coach-copy">
            <SectionLabel number="04">Coach IA</SectionLabel>
            <h2 className="is-editorial">Seu coach.<br />Sempre evoluindo.</h2>
            <p>Ele lê cada série, noite de sono e refeição — então mostra, em linguagem direta, o que fazer a seguir.</p>
            <SignupLink className="landing-text-link">Conhecer meu Coach IA <ArrowRight className="size-4" /></SignupLink>
          </div>
          <SignupLink className="landing-coach-panel">
            <div className="landing-coach-head"><span><AscendSymbol className="h-6" /> ASCEND COACH</span><i>AO VIVO</i></div>
            <div className="landing-coach-analysis"><small>ANALISANDO</small><p>12 semanas · 47 sessões · 1.318 séries</p><div className="landing-scan-line" /></div>
            <div className="landing-coach-message"><BrainCircuit className="size-5" /><p>Seu volume de peito subiu 14%, mas a recuperação caiu. Hoje, mantenha 110 kg e preserve duas repetições na reserva.</p></div>
            <div className="landing-coach-metrics"><span>RECUPERAÇÃO <b>92%</b></span><span>CONFIANÇA <b>96%</b></span></div>
            <div className="landing-coach-input">Pergunte sobre treino, recuperação ou nutrição… <ArrowRight className="size-4" /></div>
          </SignupLink>
        </section>

        <section id="progress" className="landing-section landing-progress">
          <div className="landing-split-heading">
            <div><SectionLabel number="05">Progresso</SectionLabel><h2>VEJA O ESFORÇO<br />VIRAR <em>RESULTADO.</em></h2></div>
            <p>Sem métricas de vaidade. Só as linhas que importam, avançando junto com você.</p>
          </div>
          <SignupLink className="landing-progress-panel">
            <div className="landing-progress-summary"><small>FORÇA · 1RM ESTIMADO</small><strong>122,5 <em>kg</em></strong><span>+27,6%</span></div>
            <div className="landing-progress-chart" aria-hidden="true"><div className="landing-chart-grid" /><svg viewBox="0 0 800 230" preserveAspectRatio="none"><path className="landing-chart-area" d="M0 205 C100 196,120 175,205 180 S320 125,405 140 S520 92,595 110 S690 38,800 45 L800 230 L0 230Z"/><path className="landing-chart-line" d="M0 205 C100 196,120 175,205 180 S320 125,405 140 S520 92,595 110 S690 38,800 45"/></svg></div>
            <div className="landing-progress-stats"><span><small>RECORDES NO BLOCO</small><b>8</b></span><span><small>VOLUME SEMANAL</small><b>14,2 t</b></span><span><small>CONSISTÊNCIA</small><b>96%</b></span><span><small>SEQUÊNCIA</small><b>48 dias</b></span></div>
          </SignupLink>
        </section>

        <section id="community" className="landing-section landing-community">
          <div className="landing-community-copy">
            <SectionLabel number="06">Gym Bros</SectionLabel>
            <h2 className="is-editorial">Progresso é<br />contagiante.</h2>
            <p>Uma comunidade construída em torno do trabalho, não da pose. Siga quem impulsiona você e deixe que vejam sua subida.</p>
            <div className="landing-community-points"><span><Users className="size-5" /><b>Círculos</b> Treine com pessoas, não plateias.</span><span><ShieldCheck className="size-5" /><b>Respeito</b> Conquistado pelo trabalho.</span><span><Medal className="size-5" /><b>Conquistas</b> Esforço comprovado por dados.</span></div>
          </div>
          <SignupLink className="landing-feed">
            <div className="landing-feed-top"><span>SEU CÍRCULO</span><span>AO VIVO <i /></span></div>
            {feed.map((post) => <article key={post.name} className="landing-feed-post"><div className="landing-avatar">{post.initial}</div><div><strong>{post.name}</strong><small>{post.action}</small><p>{post.detail}</p></div><span><Heart className="size-4" /> {post.likes}</span></article>)}
            <div className="landing-feed-action">Entrar na comunidade <ChevronRight className="size-4" /></div>
          </SignupLink>
        </section>

        <section id="achievements" className="landing-section landing-achievements">
          <div className="landing-section-intro landing-section-intro-centered"><SectionLabel number="07">Conquistas</SectionLabel><h2 className="is-muted">CONQUISTADAS.<br /><span>NUNCA COMPRADAS.</span></h2><p>Cada emblema nasce de dados reais de treino. Alguns são quase impossíveis de alcançar.</p></div>
          <div className="landing-badges">
            {[{ icon: ShieldCheck, tier: "IDENTIDADE", title: "Atleta verificado", rate: "12,4%" },{ icon: Flame, tier: "LIMITADO", title: "Early Ascender", rate: "3,1%" },{ icon: Trophy, tier: "LENDÁRIO", title: "Fundador", rate: "0,4%" },{ icon: Sparkles, tier: "MÍTICO", title: "The Void", rate: "0,1%" }].map((badge) => (
              <SignupLink className="landing-badge" key={badge.title}><span>{badge.tier}</span><badge.icon className="size-9" /><h3>{badge.title}</h3><small>{badge.rate} dos atletas</small></SignupLink>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <AscendSymbol className="h-14" />
          <p>Sua próxima versão está esperando.</p>
          <h2>PRONTO PARA<br /><span>SUBIR?</span></h2>
          <p>Comece grátis. Sem cartão. Seu primeiro programa fica pronto em menos de um minuto.</p>
          <SignupLink className="landing-button landing-button-primary landing-button-large">Criar minha conta <ArrowRight className="size-5" /></SignupLink>
          <span>iOS · Android · Web</span>
        </section>
      </main>

      <footer className="landing-footer">
        <div><AscendSymbol className="h-7" /><AscendWordmark className="h-3" /></div>
        <p>Treino. Progresso. Nutrição. Comunidade.</p>
        <SignupLink>Entrar no ASCEND <ArrowRight className="size-4" /></SignupLink>
        <small>© 2026 ASCEND · FEITO PARA QUEM SE RECUSA A FICAR IGUAL.</small>
      </footer>
    </div>
  );
}