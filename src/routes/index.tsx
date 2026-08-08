import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Flame, LineChart, MessageSquareText, Smartphone, Trophy } from "lucide-react";
import { AscendSymbol, AscendWordmark } from "@/components/brand";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASCEND · App de treino com Coach IA em português" },
      {
        name: "description",
        content:
          "Registre treinos, acompanhe recordes e peso, e fale com um coach de IA que conhece a sua evolução. Funciona no celular e no computador.",
      },
      { property: "og:title", content: "ASCEND · App de treino com Coach IA" },
      {
        property: "og:description",
        content: "Treinos, recordes, evolução de peso e coach de IA em português.",
      },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Flame,
    title: "Sequência e XP",
    text: "Cada treino registrado soma XP, sobe de nível e mantém sua streak viva.",
  },
  {
    icon: Trophy,
    title: "Recordes reais",
    text: "Cadastre suas cargas máximas e veja o 1RM estimado evoluir.",
  },
  {
    icon: LineChart,
    title: "Evolução de peso",
    text: "Registre o peso e acompanhe o gráfico junto com a meta de calorias.",
  },
  {
    icon: MessageSquareText,
    title: "Coach IA",
    text: "Um treinador que lê seus dados e responde com séries, cargas e ajustes.",
  },
  {
    icon: Dumbbell,
    title: "Plano semanal",
    text: "Divisão de treinos pronta, com duração e foco muscular por dia.",
  },
  {
    icon: Smartphone,
    title: "Celular e site",
    text: "Mesma conta na nuvem: comece no computador, continue no celular.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-ember">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <AscendWordmark className="h-6 w-auto md:h-7" />

        <nav className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Entrar
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:pt-20">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full ember-border bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                <Flame className="size-3.5" /> Academia · IA · Evolução
              </span>
              <h1 className="text-display mt-6 text-6xl md:text-8xl">
                TREINE COM
                <br />
                <span className="text-primary">DADOS</span>, NÃO COM ACHISMO
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                O ASCEND registra cada treino, guarda seus recordes e coloca um coach de IA para
                ajustar carga, volume e dieta com base na sua evolução real.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-full bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  Começar agora
                </Link>
                <Link
                  to="/auth"
                  className="rounded-full border border-border bg-surface px-8 py-3.5 font-bold text-foreground"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>

            <div className="panel mx-auto w-full max-w-sm p-5 shadow-panel">
              <div className="rounded-2xl bg-elevated p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Nível atual
                </p>
                <p className="text-display mt-1 text-5xl">
                  ATLETA <span className="text-primary">25</span>
                </p>
                <div className="mt-4 h-2 rounded-full bg-muted">
                  <div className="h-2 w-[70%] rounded-full bg-primary" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">2.450 / 3.500 XP</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  ["45", "dias streak"],
                  ["105kg", "supino"],
                  ["28", "treinos"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-elevated p-3 text-center">
                    <p className="text-lg font-extrabold">{v}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl ember-border bg-surface p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Coach IA</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  “Hoje sobe 2,5 kg no supino e mantém 8 repetições. Descanso de 90s.”
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface/40 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-display text-4xl md:text-5xl">O QUE VOCÊ TEM DENTRO</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="panel p-6">
                  <f.icon className="size-6 text-primary" />
                  <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <h2 className="text-display text-5xl md:text-6xl">PRONTO PARA SUBIR DE NÍVEL?</h2>
          <p className="mt-4 text-muted-foreground">
            Crie sua conta grátis e registre o primeiro treino em menos de um minuto.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-block rounded-full bg-primary px-10 py-4 font-bold text-primary-foreground shadow-glow"
          >
            Criar minha conta
          </Link>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-5 py-10 text-center text-xs text-muted-foreground">
        <AscendSymbol className="size-8" />
        ASCEND · Gym AI · feito para quem treina de verdade
      </footer>

    </div>
  );
}
