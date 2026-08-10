import { useMemo } from "react";
import type { TitleVisual } from "@/lib/titles";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-[11px]",
  lg: "px-4 py-2 text-xs",
};

/**
 * Emblema animado do título. Efeitos escalam com a raridade e respeitam
 * `prefers-reduced-motion` (partículas e brilho desligam automaticamente via CSS).
 */
export function TitleBadge({
  visual,
  size = "md",
  className = "",
}: {
  visual: TitleVisual;
  size?: Size;
  className?: string;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: visual.particles }, (_, i) => ({
        left: 6 + ((i * 37) % 88),
        delay: (i * 0.7) % 4,
        duration: 3.2 + ((i * 0.9) % 2.4),
      })),
    [visual.particles],
  );

  return (
    <span
      className={`title-badge ${SIZE[size]} ${className}`}
      style={
        {
          "--title-glow": visual.glow,
          "--title-gradient": visual.gradient,
        } as React.CSSProperties
      }
      data-rarity={visual.rarity}
      title={visual.name}
    >
      {particles.map((p, i) => (
        <i
          key={i}
          aria-hidden
          className="title-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <span className="title-emoji">{visual.emoji}</span>
      <span className="title-text">{visual.name}</span>
    </span>
  );
}
