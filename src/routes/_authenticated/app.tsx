import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TitleUnlockOverlay } from "@/components/title-unlock";
import { BadgeUnlockOverlay } from "@/components/badge-unlock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Apple,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Home,
  LineChart,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Shield,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSocialBadge } from "@/lib/social.functions";
import { useAdminStatus, useLoginTracking } from "@/hooks/use-admin";
import { AscendSymbol, AscendWordmark } from "@/components/brand";
import { useT } from "@/lib/i18n";
import { useDashboard } from "@/hooks/use-dashboard";
import { TrainingOnboarding } from "@/components/training-onboarding";
import { claimSignupAttribution } from "@/lib/marketing-tracking";


export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

// primary: aparece na barra inferior do celular; o resto fica no menu "Mais".
const NAV = [
  { to: "/app", label: "Início", icon: Home, exact: true, primary: true },
  { to: "/app/treinos", label: "Treinos", icon: Dumbbell, exact: false, primary: true },
  { to: "/app/nutricao", label: "Nutrição", icon: Apple, exact: false, primary: true },
  { to: "/app/coach", label: "Coach", icon: MessageSquareText, exact: false, primary: true },
  { to: "/app/bros", label: "Gym Bros", icon: Users, exact: false, primary: false },
  { to: "/app/arena", label: "Arena", icon: Swords, exact: false, primary: false },
  { to: "/app/shape", label: "Shape", icon: Camera, exact: false, primary: false },
  { to: "/app/progresso", label: "Progresso", icon: LineChart, exact: false, primary: false },
  { to: "/app/conquistas", label: "Conquistas", icon: Trophy, exact: false, primary: false },
  { to: "/app/perfil", label: "Perfil", icon: User, exact: false, primary: false },
  { to: "/app/config", label: "Configurações", icon: Settings, exact: false, primary: false },
] as const;

const isActive = (item: (typeof NAV)[number], pathname: string) =>
  item.exact ? pathname === item.to : pathname.startsWith(item.to);

function AppLayout() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = NAV.some((item) => !item.primary && isActive(item, pathname));
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);
  const badgeFn = useServerFn(getSocialBadge);
  const { data: badge } = useQuery({
    queryKey: ["social-badge"],
    queryFn: () => badgeFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const broBadge = badge?.total ?? 0;
  const { data: adminStatus } = useAdminStatus();
  const isAdmin = adminStatus?.isAdmin === true;
  useLoginTracking();
  // Cadastro concluído: associa a origem de marketing ao usuário (uma vez; contas antigas são ignoradas).
  useEffect(() => {
    void claimSignupAttribution().catch(() => undefined);
  }, []);
  const dashboard = useDashboard();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="app-shell min-h-screen bg-ember md:flex">
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface/50 p-4 backdrop-blur-xl transition-[width] duration-300 md:flex ${
          collapsed ? "w-20 items-center" : "w-56"
        }`}
      >
        <Link to="/" className="flex w-full flex-col items-center py-3">
          {collapsed ? (
            <AscendSymbol className="h-7" />
          ) : (
            <AscendWordmark className="h-6 max-w-[10rem]" />
          )}
        </Link>


        <button
          onClick={() => setCollapsed((v) => !v)}
          className="press mt-3 rounded-full bg-elevated p-1.5 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? t("Expandir menu") : t("Recolher menu")}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>

        <nav className="mt-5 flex w-full flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={t(item.label)}
                className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {collapsed ? null : t(item.label)}
                {item.to === "/app/bros" && broBadge > 0 ? (
                  <span
                    className={`grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground ${
                      collapsed ? "absolute" : "ml-auto"
                    }`}
                  >
                    {broBadge > 99 ? "99+" : broBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        {isAdmin ? (
          <Link
            to="/admin"
            title={t("Admin Panel")}
            className={`press mb-1 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Shield className="size-4 shrink-0" /> {collapsed ? null : t("Admin Panel")}
          </Link>
        ) : null}
        <button
          onClick={signOut}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="size-4" /> {collapsed ? null : t("Sair")}
        </button>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:pb-12">
        {dashboard.isPending ? <p className="py-12 text-muted-foreground">Carregando perfil…</p> : dashboard.error || !dashboard.data?.profile ? <p role="alert" className="text-destructive">Não foi possível carregar seu perfil. Atualize a página.</p> : !dashboard.data.profile.onboarded ? <TrainingOnboarding onDone={() => { void dashboard.refetch(); }} /> : <Outlet />}
      </main>

      <TitleUnlockOverlay />
      <BadgeUnlockOverlay />

      {moreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("Mais opções")}>
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label={t("Fechar")}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pb-24 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">{t("Mais opções")}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid size-11 place-items-center text-muted-foreground hover:text-foreground"
                aria-label={t("Fechar")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV.filter((item) => !item.primary).map((item) => {
                const active = isActive(item, pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`press relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[4px] border text-xs font-semibold ${
                      active ? "border-primary/60 text-primary" : "border-border text-foreground"
                    }`}
                  >
                    <item.icon className="size-5" />
                    {t(item.label)}
                    {item.to === "/app/bros" && broBadge > 0 ? (
                      <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-black leading-4 text-primary-foreground">
                        {broBadge > 9 ? "9+" : broBadge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="press flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[4px] border border-primary/30 text-xs font-semibold text-primary"
                >
                  <Shield className="size-5" />
                  {t("Admin Panel")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={signOut}
                className="press flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-[4px] border border-border text-xs font-semibold text-muted-foreground"
              >
                <LogOut className="size-5" />
                {t("Sair")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-surface/90 backdrop-blur-2xl md:hidden">
        {NAV.filter((item) => item.primary).map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`press relative flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`absolute inset-x-5 top-0 h-0.5 bg-primary transition-opacity duration-200 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <item.icon className="size-5" />
              {t(item.label)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className={`press relative flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors duration-200 ${
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span
            className={`absolute inset-x-5 top-0 h-0.5 bg-primary transition-opacity duration-200 ${
              moreActive ? "opacity-100" : "opacity-0"
            }`}
          />
          <span className="relative">
            <Menu className="size-5" />
            {broBadge > 0 ? (
              <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-black leading-4 text-primary-foreground">
                {broBadge > 9 ? "9+" : broBadge}
              </span>
            ) : null}
          </span>
          {t("Mais")}
        </button>
      </nav>

    </div>
  );
}
