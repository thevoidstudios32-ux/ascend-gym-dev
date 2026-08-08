import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Apple,
  Camera,
  Dumbbell,
  Home,
  LineChart,
  LogOut,
  MessageSquareText,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSocialBadge } from "@/lib/social.functions";

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
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badgeFn = useServerFn(getSocialBadge);
  const { data: badge } = useQuery({
    queryKey: ["social-badge"],
    queryFn: () => badgeFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const broBadge = badge?.total ?? 0;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-ember md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface/50 p-5 backdrop-blur-xl md:flex">
        <Link to="/" className="flex items-center gap-2">
          <AscendSymbol className="size-7" />
          <AscendWordmark className="h-4 w-auto" />
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
                {item.to === "/app/bros" && broBadge > 0 ? (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                    {broBadge > 99 ? "99+" : broBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:pb-12">
        <Outlet />
      </main>

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
              {item.label}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
