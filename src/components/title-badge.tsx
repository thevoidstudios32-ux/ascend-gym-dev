import { Glyph } from "@/components/ascend-icon";
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
  onClick,
  ariaLabel,
}: {
  visual: TitleVisual;
  size?: Size;
  className?: string;
  /** Quando informado, o emblema vira botão (abre o seletor de títulos). */
  onClick?: () => void;
  ariaLabel?: string;
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

  const Tag = (onClick ? "button" : "span") as "button";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? (ariaLabel ?? `Título ${visual.name}. Trocar título`) : undefined}
      className={`title-badge ${SIZE[size]} ${onClick ? "title-badge-interactive" : ""} ${className}`}
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
      <i aria-hidden className="title-sweep" />
      <Glyph value={visual.emoji} size={14} className="title-emoji" fallback="crown" />
      <span className="title-text">{visual.name}</span>
    </Tag>
  );
}
