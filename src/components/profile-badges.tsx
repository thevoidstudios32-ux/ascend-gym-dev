import { toast } from "sonner";
import { BadgeCard } from "@/components/badge-chip";
import { useMyBadges, useSetFeaturedBadge, useUserBadges } from "@/hooks/use-badges";

/**
 * Seção BADGES do perfil. Para o próprio usuário permite escolher o selo
 * em destaque (validado no servidor: só selos realmente possuídos).
 */
export function ProfileBadges({ userId, own = false }: { userId: string | null; own?: boolean }) {
  const mine = useMyBadges();
  const other = useUserBadges(own ? null : userId);
  const query = own ? mine : other;
  const setFeatured = useSetFeaturedBadge();

  const owned = query.data?.owned ?? [];
  const featured = query.data?.featured ?? null;

  return (
    <section className="panel space-y-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-display text-lg text-foreground">BADGES</h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {owned.length} conquistado{owned.length === 1 ? "" : "s"}
        </span>
      </header>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-xs text-muted-foreground">Não foi possível carregar os selos.</p>
          <button
            onClick={() => query.refetch()}
            className="press mt-2 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      ) : owned.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Nenhum selo ainda
        </p>
      ) : (
        <div className="space-y-2">
          {owned.map((o) => (
            <BadgeCard
              key={o.badge.id}
              badge={o.badge}
              featured={o.is_featured}
              disabled={setFeatured.isPending || !o.badge.featurable}
              onClick={
                own
                  ? () => {
                      if (!o.badge.featurable) {
                        toast.error("Este selo não pode ficar em destaque.");
                        return;
                      }
                      const next = featured === o.badge.id ? null : o.badge.id;
                      setFeatured.mutate(next, {
                        onSuccess: () => toast.success(next ? "Selo em destaque atualizado." : "Destaque removido."),
                        onError: () => toast.error("Não foi possível atualizar o destaque."),
                      });
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {own && owned.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">Toque em um selo para colocá-lo em destaque no seu perfil.</p>
      ) : null}
    </section>
  );
}
