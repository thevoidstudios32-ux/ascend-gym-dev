import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BadgeIcon } from "@/components/badge-chip";
import { rarityStyle } from "@/lib/badges";
import { useMarkBadgesSeen, useMyBadges } from "@/hooks/use-badges";

/**
 * Modal "BADGE UNLOCKED": abre uma única vez por selo recém-concedido.
 * Marca como visto imediatamente (idempotente no servidor) para não reabrir
 * após reload e fecha por ESC, X, clique fora ou em ~3.5s.
 */
export function BadgeUnlockOverlay() {
  const { data } = useMyBadges();
  const mark = useMarkBadgesSeen();
  const [current, setCurrent] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markRef = useRef(mark);
  markRef.current = mark;
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const pending = data?.pending?.[0] ?? null;

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (!pending || current) return;
    setCurrent(pending);
    markRef.current.mutate([pending]);
    timer.current = setTimeout(() => setCurrent(null), 3500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [pending, current]);

  useEffect(() => {
    if (!current) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  const owned = current ? (data?.owned.find((o) => o.badge.id === current) ?? null) : null;
  if (!owned || typeof document === "undefined") return null;

  const style = rarityStyle(owned.badge.rarity);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Selo desbloqueado: ${owned.badge.name}`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-rise relative w-full max-w-xs rounded-3xl border bg-surface p-6 text-center ${style.ring} ${style.glow}`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="press absolute right-2 top-2 rounded-full bg-elevated p-1.5 text-muted-foreground"
        >
          <X className="size-4" />
        </button>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-primary">Badge Unlocked</p>
        <div className="mt-4 flex justify-center">
          <BadgeIcon badge={owned.badge} size={84} />
        </div>
        <h2 className="mt-3 text-display text-xl text-foreground">{owned.badge.name}</h2>
        {owned.badge.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{owned.badge.description}</p>
        ) : null}
        <p className={`mt-3 text-[10px] font-black uppercase tracking-widest ${style.text}`}>
          {owned.badge.rarity} · {owned.badge.category}
        </p>
      </div>
    </div>,
    document.body,
  );
}
