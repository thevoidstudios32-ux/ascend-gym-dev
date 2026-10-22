import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import symbolAsset from "@/assets/branding/ascend-symbol-v2.png.asset.json";
import wordmarkAsset from "@/assets/branding/ascend-wordmark-v2.png.asset.json";
import { useCinematic } from "./use-cinematic";
import "./cinematic.css";

const signup = { mode: "signup" as const };

export function CinematicLanding() {
  const root = useRef<HTMLDivElement>(null);
  useCinematic(root);
  return (
    <div ref={root} className="cine-page">
      <a className="cine-skip" href="#conteudo">Pular para o conteúdo</a>
      <header className="cine-header" data-header>
        <nav className="cine-nav" aria-label="Navegação principal">
          <a className="cine-brand" href="#topo" aria-label="ASCEND — início">
            <img src={symbolAsset.url} alt="" width={245} height={205} />
            <img className="cine-brand-word" src={wordmarkAsset.url} alt="ASCEND" width={411} height={33} />
          </a>
          <div className="cine-nav-links"><a href="#treino">Treino</a><a href="#alimentacao">Alimentação</a><a href="#evolucao">Evolução</a></div>
          <div className="cine-nav-actions">
            <Link className="cine-login" to="/auth">Entrar</Link>
            <Link className="cine-btn cine-btn-sm" to="/auth" search={signup}>Criar conta <span className="cine-arrow" aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </header>
      <main id="conteudo">
        <section id="topo" className="cine-hero" aria-labelledby="hero-title">
          <div className="cine-media" data-slot="hero" data-priority></div>
          <div className="cine-hero-shade" aria-hidden="true"></div>
          <div className="cine-hero-content">
            <p className="cine-overline"><span className="cine-dot" aria-hidden="true"></span>ASCEND · Sistema de treino</p>
            <h1 id="hero-title" className="cine-display"><span className="cine-line"><span>Treino com</span></span><span className="cine-line"><span>direção<em>.</em></span></span></h1>
            <p className="cine-lede">Treino personalizado, Coach IA, alimentação e progresso em um único sistema.</p>
            <div className="cine-actions">
              <Link className="cine-btn" to="/auth" search={signup}>Criar minha conta <span className="cine-arrow" aria-hidden="true">→</span></Link>
              <a className="cine-link" href="#problema">Ver como funciona</a>
            </div>
          </div>
        </section>
        <section id="problema" className="cine-section" aria-labelledby="problem-title">
          <div className="cine-wrap">
            <p className="cine-kicker" data-reveal><b>02</b> O problema</p>
            <h2 id="problem-title" className="cine-h2" data-reveal>A diferença não está<br />no esforço. <span>Está na direção.</span></h2>
            <div className="cine-versus">
              <div className="cine-col cine-col-off" data-reveal><h3>Sem direção</h3><ol><li>Treino escolhido no improviso</li><li>Cargas esquecidas de uma semana para outra</li><li>Sem saber se houve evolução</li></ol></div>
              <div className="cine-col cine-col-on" data-reveal><h3>Com o ASCEND</h3><ol><li>Programa montado a partir das suas respostas</li><li>Cada série registrada, com carga e reserva</li><li>Evolução que você consegue ver</li></ol></div>
            </div>
            <p className="cine-bridge" data-reveal>Esforço sem registro não vira evidência.</p>
          </div>
        </section>
        <section id="solucao" className="cine-section cine-solution" aria-labelledby="solution-title">
          <div className="cine-wrap">
            <p className="cine-kicker" data-reveal><b>03</b> A solução</p>
            <h2 id="solution-title" className="cine-manifesto">
              <span className="cine-line" data-reveal><span>Um sistema.</span></span>
              <span className="cine-line" data-reveal><span>Treino, Coach IA,</span></span>
              <span className="cine-line" data-reveal><span>alimentação e progresso</span></span>
              <span className="cine-line" data-reveal><span><em>— conectados.</em></span></span>
            </h2>
            <ul className="cine-index" aria-label="Pilares do ASCEND">
              <li data-reveal><a href="#treino"><b>04</b><span>Treino inteligente</span></a></li>
              <li data-reveal><a href="#treino"><b>04</b><span>Coach IA</span></a></li>
              <li data-reveal><a href="#alimentacao"><b>05</b><span>Alimentação</span></a></li>
              <li data-reveal><a href="#evolucao"><b>06</b><span>Evolução</span></a></li>
            </ul>
          </div>
        </section>
        <section id="treino" className="cine-section" aria-labelledby="training-title">
          <div className="cine-wrap">
            <div className="cine-split">
              <div><p className="cine-kicker" data-reveal><b>04</b> Treino inteligente</p><h2 id="training-title" className="cine-h2" data-reveal>Seu programa.<br /><span>Não um modelo pronto.</span></h2></div>
              <p className="cine-split-copy" data-reveal>Da primeira avaliação a cada série registrada, o treino é construído — e ajustado — a partir de você.</p>
            </div>
            <ol className="cine-steps">
              <li data-reveal><b>Avaliação</b><p>Disponibilidade, equipamentos, nível, restrições e um mapa muscular dos seus focos.</p></li>
              <li data-reveal><b>Programa</b><p>Um plano de várias semanas gerado a partir das suas respostas e do catálogo de exercícios.</p></li>
              <li data-reveal><b>Execução</b><p>Fichas com instruções, anatomia e demonstrações. Cada série registrada com carga, repetições e RIR.</p></li>
              <li data-reveal><b>Coach IA</b><p>Lê seu histórico e propõe ajustes. Você aceita ou recusa; nada muda sem você.</p></li>
            </ol>
            <div className="cine-demos">
              <figure className="cine-demo" data-reveal><div className="cine-media" data-slot="demo-militar"><div className="cine-demo-tag" aria-hidden="true"><b>01</b><span>Desenvolvimento militar</span></div></div><figcaption><span className="cine-sr">Desenvolvimento militar. </span>Demonstração real do catálogo · FitnessScape/Wikimedia · CC BY 3.0</figcaption></figure>
              <figure className="cine-demo" data-reveal><div className="cine-media" data-slot="demo-terra"><div className="cine-demo-tag" aria-hidden="true"><b>02</b><span>Levantamento terra</span></div></div><figcaption><span className="cine-sr">Levantamento terra. </span>Demonstração real do catálogo · FitnessScape/Wikimedia · CC BY 3.0</figcaption></figure>
              <figure className="cine-demo" data-reveal><div className="cine-media" data-slot="demo-agachamento"><div className="cine-demo-tag" aria-hidden="true"><b>03</b><span>Agachamento livre</span></div></div><figcaption><span className="cine-sr">Agachamento livre. </span>Demonstração real do catálogo · FitnessScape/Wikimedia · CC BY 3.0</figcaption></figure>
              <button className="cine-pause cine-pause-inline" type="button" data-pause-group="demos" hidden></button>
            </div>
            <p className="cine-footnote" data-reveal>Gravações reais usadas nas fichas de exercício do app. Treinos também exportáveis em PDF.</p>
          </div>
        </section>
        <section id="alimentacao" className="cine-section" aria-labelledby="nutrition-title">
          <div className="cine-wrap">
            <div className="cine-split">
              <div><p className="cine-kicker" data-reveal><b>05</b> Alimentação</p><h2 id="nutrition-title" className="cine-h2" data-reveal>O combustível,<br /><span>medido junto ao treino.</span></h2></div>
              <p className="cine-split-copy" data-reveal>Metas calculadas para você e um registro rápido do que entra no prato e no copo.</p>
            </div>
            <ul className="cine-list">
              <li data-reveal><b>Metas diárias</b><span>Calorias, proteína, carboidrato e gordura calculados a partir do seu perfil e objetivo.</span></li>
              <li data-reveal><b>Registro de refeições</b><span>Lance o que comeu e veja quanto falta para a meta do dia.</span></li>
              <li data-reveal><b>Código de barras</b><span>Leia a embalagem e puxe os dados da base pública Open Food Facts.</span></li>
              <li data-reveal><b>Hidratação</b><span>Meta de água ajustada ao seu peso, registrada em um toque.</span></li>
            </ul>
            <p className="cine-experimental" data-reveal><span>Experimental</span> Estimativa de refeições por foto, sempre revisada por você antes de salvar.</p>
          </div>
        </section>
        <section id="evolucao" className="cine-section" aria-labelledby="progress-title">
          <div className="cine-wrap">
            <div className="cine-split">
              <div><p className="cine-kicker" data-reveal><b>06</b> Evolução</p><h2 id="progress-title" className="cine-h2" data-reveal>Veja o esforço<br /><span>virar linha.</span></h2></div>
              <p className="cine-split-copy" data-reveal>Sem métricas de vaidade. Seus próprios registros, organizados para responder uma pergunta: estou melhorando?</p>
            </div>
            <div className="cine-chart" data-reveal aria-hidden="true">
              <svg viewBox="0 0 1200 260" preserveAspectRatio="none"><path className="cine-chart-grid" d="M0 65H1200M0 130H1200M0 195H1200" /><path className="cine-chart-line" pathLength={1} d="M0 230 C140 222 190 200 300 204 S470 160 590 168 S760 112 880 120 S1060 52 1200 40" /></svg>
              <span className="cine-chart-tag">Ilustrativo</span>
            </div>
            <dl className="cine-metrics">
              <div data-reveal><dt>Recordes pessoais</dt><dd>Com 1RM estimado a cada registro.</dd></div>
              <div data-reveal><dt>Peso corporal</dt><dd>Histórico e tendência ao longo do tempo.</dd></div>
              <div data-reveal><dt>Volume</dt><dd>Quilos movidos na semana e no mês.</dd></div>
              <div data-reveal><dt>Constância</dt><dd>Dias treinados e tempo de treino.</dd></div>
              <div data-reveal><dt>Conquistas</dt><dd>Emblemas e títulos liberados pelos seus dados reais.</dd></div>
            </dl>
          </div>
        </section>
        <section id="comecar" className="cine-final" aria-labelledby="final-title">
          <div className="cine-media" data-slot="closing"></div>
          <div className="cine-final-shade" aria-hidden="true"></div>
          <div className="cine-final-content">
            <img className="cine-final-symbol" data-reveal src={symbolAsset.url} alt="" width={245} height={205} loading="lazy" />
            <h2 id="final-title" className="cine-display cine-final-title">
              <span className="cine-line" data-reveal><span>A próxima versão</span></span>
              <span className="cine-line" data-reveal><span>de você começa</span></span>
              <span className="cine-line" data-reveal><span>no primeiro registro<em>.</em></span></span>
            </h2>
            <Link className="cine-btn cine-btn-lg" data-reveal to="/auth" search={signup}>Criar minha conta <span className="cine-arrow" aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <footer className="cine-footer">
        <img src={wordmarkAsset.url} alt="ASCEND" width={411} height={33} loading="lazy" />
        <Link to="/auth">Entrar</Link>
        <small>© 2026 ASCEND</small>
      </footer>
    </div>
  );
}
