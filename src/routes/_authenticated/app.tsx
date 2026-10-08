import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TitleUnlockOverlay } from "@/components/title-unlock";
import { BadgeUnlockOverlay } from "@/components/badge-unlock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Apple,
  Camera,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Home,
  LineChart,
  LogOut,
  MessageSquareText,
  Settings,
  Shield,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSocialBadge } from "@/lib/social.functions";
import { useAdminStatus, useLoginTracking } from "@/hooks/use-admin";
import { AscendSymbol, AscendWordmark } from "@/components/brand";
import { useT } from "@/lib/i18n";
import { useDashboard } from "@/hooks/use-dashboard";
import { TrainingOnboarding } from "@/components/training-onboarding";


export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/treinos", label: "Treinos", icon: Dumbbell, exact: false },
  { to: "/app/bros", label: "Gym Bros", icon: Users, exact: false },
  { to: "/app/arena", label: "Arena", icon: Swords, exact: false },
  { to: "/app/coach", label: "Coach", icon: MessageSquareText, exact: false },
  { to: "/app/nutricao", label: "Dieta", icon: Apple, exact: false },
  { to: "/app/shape", label: "Shape", icon: Camera, exact: false },
  { to: "/app/progresso", label: "Stats", icon: LineChart, exact: false },
  { to: "/app/conquistas", label: "Medalhas", icon: Trophy, exact: false },
  { to: "/app/perfil", label: "Perfil", icon: User, exact: false },
  { to: "/app/config", label: "Config", icon: Settings, exact: false },
] as const;

function AppLayout() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState<boolean>(false);
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
  const dashboard = useDashboard();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-ember md:flex">
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
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
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
        {dashboard.isPending ? <p className="py-12 text-muted-foreground">Carregando perfil…</p> : dashboard.error ? <p role="alert" className="text-destructive">Não foi possível carregar seu perfil. Atualize a página.</p> : dashboard.data?.profile && !dashboard.data.profile.onboarded ? <TrainingOnboarding onDone={() => { void dashboard.refetch(); }} /> : <Outlet />}
      </main>

      <TitleUnlockOverlay />
      <BadgeUnlockOverlay />

      <nav className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-border bg-surface/80 backdrop-blur-2xl md:hidden">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`press relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 py-3 text-[9px] font-bold uppercase tracking-wide transition-colors duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary transition-opacity duration-200 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="relative">
                <item.icon
                  className={`size-5 transition-transform duration-200 ${active ? "scale-110" : ""}`}
                />
                {item.to === "/app/bros" && broBadge > 0 ? (
                  <span className="animate-pop absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-black leading-4 text-primary-foreground">
                    {broBadge > 9 ? "9+" : broBadge}
                  </span>
                ) : null}
              </span>
              {t(item.label)}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
