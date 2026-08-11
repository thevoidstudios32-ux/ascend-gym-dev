import { Lock, X } from "lucide-react";
import { toast } from "sonner";
import { TitleBadge } from "@/components/title-badge";
import { useEquipTitle } from "@/hooks/use-titles";
import { TITLE_RARITY_STYLE, visibleTitlesFor, type TitleDef } from "@/lib/titles";

/**
 * Seletor compacto de títulos: mostra os títulos possuídos (equipáveis) e os
 * bloqueados com o requisito real. A posse é sempre revalidada no servidor.
 */
export function TitleSelector({
  open,
  onClose,
  userId,
  owned,
  equipped,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  owned: string[];
  equipped: string | null;
}) {
  const equip = useEquipTitle();
  if (!open) return null;

  const list = visibleTitlesFor(userId, owned);

  function choose(t: TitleDef) {
    if (!owned.includes(t.id)) return;
    equip.mutate(t.id, {
      onSuccess: () => {
        toast.success(`Título equipado: ${t.name}`);
        onClose();
      },
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Meus títulos"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-violet-500/20 bg-[#101014]/95 p-5 shadow-[0_0_40px_-12px_rgba(168,85,247,0.45)] sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
            Meus títulos
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="press rounded-full bg-white/10 p-1.5 text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul className="space-y-2">
          {list.map((t) => {
            const has = owned.includes(t.id);
            const isEquipped = equipped === t.id;
            const rarity = TITLE_RARITY_STYLE[t.rarity];
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={!has || equip.isPending}
                  onClick={() => choose(t)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    isEquipped
                      ? "border-violet-500/50 bg-violet-500/10"
                      : has
                        ? "border-white/10 bg-white/[0.03] hover:border-violet-400/40 hover:bg-white/[0.06]"
                        : "cursor-not-allowed border-white/5 bg-black/30 opacity-60"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    {has ? (
                      <TitleBadge visual={t} size="sm" />
                    ) : (
                      <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                        <Lock className="size-3.5" />
                        {t.secret ? "Título secreto" : t.name}
                      </span>
                    )}
                    <span className="mt-1.5 block text-[11px] text-muted-foreground">
                      {has
                        ? isEquipped
                          ? "✓ Equipado"
                          : "Tocar para equipar"
                        : t.secret && !has
                          ? "Título especial"
                          : (t.requirement?.label ?? "Bloqueado")}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest"
                    style={{ color: rarity.color, background: `${rarity.color}1a` }}
                  >
                    {rarity.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
