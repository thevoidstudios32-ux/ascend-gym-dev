/* ASCEND 2.0 — kit visual compartilhado (cards, barras, confete, headers). */
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Barra de progresso animada (preenche suavemente ao montar). */
export function ProgressBar({
  value,
  className = "",
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "gold" | "water" | "success";
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  const bg =
    tone === "gold"
      ? "bg-gold"
      : tone === "water"
        ? "bg-water"
        : tone === "success"
          ? "bg-success"
          : "bg-primary";
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-muted ${className}`}>
      <div className={`bar-fill h-full rounded-full ${bg}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/** Número que sobe suavemente até o valor final. */
export function CountUp({
  value,
  duration = 900,
  format = (n: number) => n.toLocaleString("pt-BR"),
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

/** Cartão de estatística padrão do app. */
export function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  delay = 0,
}: {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <div className="card stagger p-4" style={{ animationDelay: `${delay}ms` }}>
      {Icon && <Icon className="size-4 text-primary" />}
      <p className="mt-2 text-xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Cabeçalho padronizado de página. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-display text-4xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Confete comemorativo — dispara quando `fire` vira true. */
export function Confetti({ fire }: { fire: boolean }) {
  const [pieces, setPieces] = useState<number[]>([]);
  useEffect(() => {
    if (!fire) return;
    setPieces(Array.from({ length: 42 }, (_, i) => i));
    const t = setTimeout(() => setPieces([]), 2600);
    return () => clearTimeout(t);
  }, [fire]);
  if (!pieces.length) return null;
  const colors = ["#dc2626", "#b91c1c", "#e9c46a", "#ffffff", "#38bdf8"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-[2px]"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti-fall ${1.5 + ((i % 7) * 0.18)}s ease-in ${(i % 11) * 0.06}s forwards`,
            ["--drift" as string]: `${((i % 9) - 4) * 24}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Placeholder de carregamento consistente. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function LoadingPage() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
