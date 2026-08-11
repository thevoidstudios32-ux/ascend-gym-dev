import { useEffect, useState } from "react";
import { TitleBadge } from "@/components/title-badge";
import { useMarkTitleShown, useTitles } from "@/hooks/use-titles";
import { TITLE_BY_ID } from "@/lib/titles";

/**
 * Animação "TITLE UNLOCKED" — aparece uma única vez por título desbloqueado.
 * Depois de exibida, marcamos `reward_shown` no banco para nunca repetir.
 */
export function TitleUnlockOverlay() {
  const { data } = useTitles();
  const mark = useMarkTitleShown();
  const [current, setCurrent] = useState<string | null>(null);

  const pending = data?.pending?.[0] ?? null;

  useEffect(() => {
    if (!pending || current) return;
    setCurrent(pending);
    const id = pending;
    const t = setTimeout(() => {
      mark.mutate(id);
      setCurrent(null);
    }, 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, current]);

  const def = current ? TITLE_BY_ID[current] : null;
  if (!def) return null;

  const rare = def.rarity === "MYTHIC" || def.rarity === "EXCLUSIVE";

  return (
    <div className="title-unlock-overlay" role="status" aria-live="polite">
      <div className={`title-unlock-card ${rare ? "title-unlock-rare" : ""}`}>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-violet-300">
          Title Unlocked
        </p>
        <div className="mt-3 flex justify-center">
          <TitleBadge visual={def} size="lg" />
        </div>
        {def.xpReward > 0 && (
          <p className="mt-3 text-sm font-extrabold text-white">
            +{def.xpReward.toLocaleString("pt-BR")} XP
          </p>
        )}
      </div>
    </div>
  );
}
