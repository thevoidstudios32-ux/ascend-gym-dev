import { BadgeCheck } from "lucide-react";

const SIZE = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

/**
 * Selo oficial de verificação do ASCEND. Concedido apenas pela conta
 * The Void Studios (validado no servidor) — nunca inferido no frontend.
 */
export function VerifiedBadge({
  size = "md",
  className = "",
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      title="Verified Admin"
      aria-label="Verified Admin"
      role="img"
      tabIndex={0}
      className={`group relative inline-grid shrink-0 place-items-center align-middle ${className}`}
    >
      <BadgeCheck
        className={`${SIZE[size]} text-primary drop-shadow-[0_0_6px_rgb(220_38_38/0.55)]`}
        strokeWidth={2.4}
        aria-hidden
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-elevated px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-panel group-hover:block group-focus:block">
        Verified Admin
      </span>
    </span>
  );
}
