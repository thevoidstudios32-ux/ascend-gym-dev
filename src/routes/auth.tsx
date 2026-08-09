import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AscendLogoFull } from "@/components/brand";


export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: "login" | "signup" } => ({
    mode: search["mode"] === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Entrar · ASCEND" },
      {
        name: "description",
        content:
          "Entre na sua conta ASCEND ou crie uma gratuita para registrar treinos, acompanhar recordes e falar com o Coach IA em português.",
      },
      { property: "og:title", content: "Entrar · ASCEND" },
      {
        property: "og:description",
        content:
          "Acesse o ASCEND com e-mail ou Google e continue seus treinos, recordes e conversas com o Coach IA.",
      },
      { property: "og:url", content: "/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),

  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
          return;
        }
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ember px-5 py-10">
      <Link to="/" className="block py-4">
        <AscendLogoFull className="h-32 w-auto sm:h-40" />
      </Link>

      <h1 className="mt-2 text-center text-sm text-muted-foreground">
        {isSignup ? "Crie sua conta ASCEND e comece hoje" : "Acesse o ASCEND · Bem-vindo de volta"}
      </h1>

      <div className="panel mt-8 w-full max-w-sm p-6 shadow-panel">
        <button
          onClick={handleGoogle}
          className="w-full rounded-full border border-border bg-elevated py-3 text-sm font-bold transition-colors hover:bg-muted"
        >
          Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignup && (
            <>
              <label htmlFor="auth-name" className="sr-only">
                Seu nome
              </label>
              <input
                id="auth-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
              />
            </>
          )}
          <label htmlFor="auth-email" className="sr-only">
            E-mail
          </label>
          <input
            id="auth-email"
            name="email"
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />
          <label htmlFor="auth-password" className="sr-only">
            Senha
          </label>
          <input
            id="auth-password"
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha (mín. 6 caracteres)"
            className="w-full rounded-xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {loading ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            onClick={() => setIsSignup((v) => !v)}
            className="font-bold text-primary hover:underline"
          >
            {isSignup ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>
    </div>
  );
}
