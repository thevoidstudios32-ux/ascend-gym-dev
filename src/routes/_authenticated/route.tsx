import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1) Sessão persistida no localStorage (restaurada ao abrir o app).
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;

    // 2) Sem sessão local: não há como restaurar → login.
    if (!session) {
      console.info("[auth] nenhuma sessão salva — redirecionando para /auth");
      throw redirect({ to: "/auth" });
    }

    // 3) Token expirado: tenta renovar antes de deslogar.
    const expiresAt = (session.expires_at ?? 0) * 1000;
    if (expiresAt && expiresAt <= Date.now()) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) {
        console.info("[auth] refresh token inválido/expirado — redirecionando para /auth");
        throw redirect({ to: "/auth" });
      }
      session = refreshed.session;
      console.info("[auth] sessão renovada automaticamente");
    }

    return { user: session.user };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-ember px-8">
      <AscendLogoFull className="h-32 w-auto animate-pulse sm:h-44" />
    </div>
  ),

  component: () => <Outlet />,
});
