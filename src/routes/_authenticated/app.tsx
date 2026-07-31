import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Home, LineChart, LogOut, MessageSquareText, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

const NAV = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/treinos", label: "Treinos", icon: Dumbbell, exact: false },
  { to: "/app/progresso", label: "Progresso", icon: LineChart, exact: false },
  { to: "/app/coach", label: "Coach IA", icon: MessageSquareText, exact: false },
  { to: "/app/perfil", label: "Perfil", icon: User, exact: false },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-ember md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 p-5 md:flex">
        <Link to="/" className="text-display text-2xl">
          <span className="text-primary">AS</span>CEND
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
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

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wide ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
