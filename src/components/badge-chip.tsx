import { Glyph } from "@/components/ascend-icon";
import { rarityStyle, type BadgeDef } from "@/lib/badges";

/** Ícone do selo (imagem, emoji ou inicial) com anel/brilho por raridade. */
export function BadgeIcon({
  badge,
  size = 40,
  className = "",
}: {
  badge: BadgeDef;
  size?: number;
  className?: string;
}) {
  const style = rarityStyle(badge.rarity);
  return (
    <span
      className={`grid place-items-center overflow-hidden rounded-full border bg-elevated ${style.ring} ${style.glow} ${className}`}
      style={{ width: size, height: size, color: badge.color ?? undefined }}
      aria-hidden
    >
      {badge.icon_url ? (
        <img src={badge.icon_url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Glyph value={badge.emoji} size={Math.round(size * 0.55)} fallback="shield" />
      )}
    </span>
  );
}

/** Selo compacto para exibir ao lado do username. */
export function FeaturedBadge({
  badge,
  size = 18,
  className = "",
}: {
  badge: BadgeDef | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!badge) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center align-middle ${className}`}
      title={badge.name}
      aria-label={`Selo ${badge.name}`}
      role="img"
    >
      <BadgeIcon badge={badge} size={size} />
    </span>
  );
}

/** Cartão de selo com nome, raridade e categoria. */
export function BadgeCard({
  badge,
  featured = false,
  locked = false,
  onClick,
  disabled = false,
}: {
  badge: BadgeDef;
  featured?: boolean;
  locked?: boolean;
  onClick?: (() => void) | undefined;
  disabled?: boolean;
}) {
  const style = rarityStyle(badge.rarity);
  const Tag = (onClick ? "button" : "div") as "button";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      className={`press flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-colors ${
        featured ? `${style.ring} ${style.glow}` : "border-border"
      } ${locked ? "opacity-45" : ""} ${onClick && !disabled ? "hover:border-primary/50" : ""}`}
    >
      <BadgeIcon badge={badge} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{badge.name}</span>
          {featured ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
              destaque
            </span>
          ) : null}
        </span>
        {badge.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{badge.description}</span>
        ) : null}
        <span className={`mt-1 block text-[10px] font-black uppercase tracking-widest ${style.text}`}>
          {badge.rarity} · {badge.category} {locked ? "· bloqueado" : ""}
        </span>
      </span>
    </Tag>
  );
}
