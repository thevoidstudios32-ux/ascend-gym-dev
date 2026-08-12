import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TitleBadge } from "@/components/title-badge";
import { useMarkTitleShown, useTitles } from "@/hooks/use-titles";
import { TITLE_BY_ID } from "@/lib/titles";

/**
 * Animação "TITLE UNLOCKED" — aparece uma única vez por título desbloqueado.
 * Marca `reward_shown` assim que exibe (idempotente no servidor) e fecha
 * sozinho em ~3.5s, por ESC, pelo X ou clicando fora.
 */
export function TitleUnlockOverlay() {
  const { data } = useTitles();
  const mark = useMarkTitleShown();
  const [current, setCurrent] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markRef = useRef(mark);
  markRef.current = mark;

  const pending = data?.pending?.[0] ?? null;

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (!pending || current) return;
    setCurrent(pending);
    // Marca imediatamente: evita reexibir após refresh/re-render e não repete XP.
    markRef.current.mutate(pending);
    timer.current = setTimeout(() => setCurrent(null), 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [pending, current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  const def = current ? TITLE_BY_ID[current] : null;
  if (!def || typeof document === "undefined") return null;

  const rare = def.rarity === "MYTHIC" || def.rarity === "EXCLUSIVE";

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]"
      role="status"
      aria-live="polite"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`title-unlock-card relative ${rare ? "title-unlock-rare" : ""}`}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="press absolute right-2 top-2 rounded-full bg-white/10 p-1.5 text-white"
        >
          <X className="size-4" />
        </button>
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
    </div>,
    document.body,
  );
}
