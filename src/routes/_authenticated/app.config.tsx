import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Globe, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/config")({
  head: () => ({
    meta: [
      { title: "Configurações · ASCEND" },
      { name: "description", content: "Idioma e preferências do seu app ASCEND." },
      { property: "og:title", content: "Configurações · ASCEND" },
      { property: "og:description", content: "Idioma e preferências do seu app ASCEND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const LANGS: { id: Lang; flag: string; name: string; native: string }[] = [
  { id: "pt", flag: "🇧🇷", name: "Português", native: "Português (Brasil)" },
  { id: "en", flag: "🇺🇸", name: "Inglês", native: "English (US)" },
];

function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function pick(next: Lang) {
    setLang(next);
    toast.success(next === "en" ? "Language changed to English" : "Idioma alterado para Português");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="animate-rise space-y-4">
      <PageHeader title={t("Configurações")} subtitle={t("Ajuste o app do seu jeito")} />

      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          <h2 className="text-sm font-extrabold uppercase tracking-widest">Idioma / Language</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Escolha o idioma da interface. A preferência fica salva na sua conta e neste dispositivo.")}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LANGS.map((l) => {
            const active = lang === l.id;
            return (
              <button
                key={l.id}
                onClick={() => pick(l.id)}
                aria-pressed={active}
                className={`press flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10 shadow-glow"
                    : "border-border bg-elevated hover:border-primary/40"
                }`}
              >
                <span className="text-2xl leading-none">{l.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{t(l.name)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{l.native}</span>
                </span>
                {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-widest">{t("Conta")}</h2>
        <div className="mt-3 space-y-2">
          <Link
            to="/app/perfil"
            className="press flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-semibold"
          >
            <User className="size-4 text-primary" /> {t("Editar perfil")}
          </Link>
          <button
            onClick={signOut}
            className="press flex w-full items-center gap-3 rounded-2xl bg-elevated px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" /> {t("Sair da conta")}
          </button>
        </div>
      </section>
    </div>
  );
}
