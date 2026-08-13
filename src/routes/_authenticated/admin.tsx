import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Palette,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ContentManagement } from "@/components/admin-content";
import { UserAvatar } from "@/components/user-avatar";
import { CountUp } from "@/components/ui-kit";
import { levelFromXp } from "@/lib/ascend";
import { fmtDate, fmtDateTime, isOnline, type Period } from "@/lib/admin";
import {
  useAdminOverview,
  useAdminStatus,
  useAdminUserDetail,
  useAdminUsers,
  useAuditLog,
} from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel · ASCEND" },
      { name: "description", content: "Painel administrativo do ASCEND: métricas de contas, atividade e retenção." },
      { property: "og:title", content: "Admin Panel · ASCEND" },
      { property: "og:description", content: "Métricas reais de usuários, logins e retenção D1/D7/D30 do ASCEND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanel,
});

const PERIODS: { label: string; value: Period }[] = [
  { label: "7 DAYS", value: 7 },
  { label: "30 DAYS", value: 30 },
  { label: "90 DAYS", value: 90 },
  { label: "ALL TIME", value: 0 },
];

function AdminPanel() {
  const navigate = useNavigate();
  const status = useAdminStatus();
  const [tab, setTab] = useState<"dashboard" | "users" | "content" | "audit">("dashboard");
  const [days, setDays] = useState<Period>(30);

  useEffect(() => {
    if (status.data && !status.data.isAdmin) {
      const t = setTimeout(() => navigate({ to: "/app", replace: true }), 1800);
      return () => clearTimeout(t);
    }
    return;
  }, [status.data, navigate]);

  if (status.isLoading) return <PanelSkeleton />;

  if (!status.data?.isAdmin) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="size-12 text-primary" />
        <h1 className="text-display mt-4 text-3xl text-foreground">ACCESS DENIED</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva da administração. Redirecionando…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate({ to: "/app" })}
          className="press grid size-9 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-display text-2xl text-foreground sm:text-3xl">ADMIN PANEL</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">The Void Studios</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" /> Owner
        </span>
      </header>

      <nav className="flex gap-2 overflow-x-auto">
        {(
          [
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "users", label: "Users", icon: Users },
            { id: "content", label: "Content", icon: Palette },
            { id: "audit", label: "Audit", icon: Activity },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" ? <Dashboard days={days} setDays={setDays} /> : null}
      {tab === "users" ? <UsersTab days={days} /> : null}
      {tab === "content" ? <ContentManagement /> : null}
      {tab === "audit" ? <AuditTab /> : null}
    </div>
  );
}

/* --------------------------------- dashboard -------------------------------- */

function Dashboard({ days, setDays }: { days: Period; setDays: (p: Period) => void }) {
  const { data, isLoading, isError, refetch } = useAdminOverview(days);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setDays(p.value)}
            className={`press rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
              days === p.value
                ? "bg-foreground text-background"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <PanelSkeleton /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Total users" value={data.totalUsers} />
            <Metric label="New users today" value={data.newToday} />
            <Metric label="Active today" value={data.activeToday} />
            <Metric label="Returning users" value={data.returningUsers} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Retention label="D1 Retention" stat={data.d1} />
            <Retention label="D7 Retention" stat={data.d7} />
            <Retention label="D30 Retention" stat={data.d30} />
          </div>

          <Chart title="User growth" data={data.growth} kind="area" />
          <Chart title="Daily active users" data={data.dau} kind="area" />
          <Chart title="Logins" data={data.logins} kind="bar" />
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-display mt-1.5 text-3xl text-foreground">
        <CountUp value={value} />
      </p>
    </div>
  );
}

function Retention({ label, stat }: { label: string; stat: { eligible: number; returned: number; pct: number | null } }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {stat.pct === null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          RETENTION DATA WILL APPEAR AFTER USERS RETURN
        </p>
      ) : (
        <>
          <p className="text-display mt-1.5 text-3xl text-primary">{stat.pct}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${stat.pct}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {stat.returned} de {stat.eligible} elegíveis
          </p>
        </>
      )}
    </div>
  );
}

function Chart({
  title,
  data,
  kind,
}: {
  title: string;
  data: { date: string; value: number }[];
  kind: "area" | "bar";
}) {
  const empty = data.every((d) => d.value === 0);
  const fmt = (d: string) => d.slice(8) + "/" + d.slice(5, 7);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {empty ? (
        <p className="py-10 text-center text-xs uppercase tracking-widest text-muted-foreground">NO DATA YET</p>
      ) : (
        <div className="mt-3 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kind === "area" ? (
              <AreaChart data={data} margin={{ left: -22, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="adminFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={38} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={fmt}
                />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#adminFill)" />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ left: -22, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={38} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={fmt}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/* ----------------------------------- users ---------------------------------- */

function UsersTab({ days }: { days: Period }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "active" | "returning">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useAdminUsers({ page, search: debounced, filter, days });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou @username"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60"
        />
        <div className="flex gap-2 overflow-x-auto">
          {(
            [
              ["all", "Todos"],
              ["new", "Novos"],
              ["active", "Ativos"],
              ["returning", "Recorrentes"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setFilter(id);
                setPage(1);
              }}
              className={`press whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                filter === id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isError ? <ErrorState onRetry={() => refetch()} /> : null}
      {isLoading ? <PanelSkeleton rows={4} /> : null}

      {data && data.rows.length === 0 && !isLoading ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
          NO DATA YET
        </p>
      ) : null}

      <div className="space-y-2">
        {(data?.rows ?? []).map((u) => {
          const lvl = levelFromXp(u.xp ?? 0);
          const online = isOnline(u.last_seen_at);
          return (
            <button
              key={u.id}
              onClick={() => setSelected(u.id)}
              className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50"
            >
              <UserAvatar src={u.avatar_url} name={u.name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{u.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {u.username ? `@${u.username}` : "sem username"} · Nv {lvl.level} · {u.xp ?? 0} XP
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cadastro {fmtDate(u.created_at)} · Último acesso {fmtDate(u.last_login_at)} · {u.login_count ?? 0} logins
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                  online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {online ? "Online" : "Offline"}
              </span>
            </button>
          );
        })}
      </div>

      {data && pages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="press rounded-xl border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {page} / {pages} · {data.total} usuários
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="press rounded-xl border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      ) : null}

      {selected ? <UserDetail id={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useAdminUserDetail(id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lvl = levelFromXp(data?.profile.xp ?? 0);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-display text-xl text-foreground">USER DETAILS</h2>
          <button onClick={onClose} className="press rounded-full bg-elevated p-1.5 text-muted-foreground" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        {isLoading ? <PanelSkeleton rows={3} /> : null}
        {isError ? <ErrorState onRetry={() => refetch()} /> : null}

        {data ? (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-3">
              <UserAvatar src={data.profile.avatar_url} name={data.profile.name} className="size-16" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-foreground">{data.profile.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {data.profile.username ? `@${data.profile.username}` : "sem username"}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Nv {lvl.level} · {data.profile.xp} XP · {data.profile.equipped_title_id ?? "sem título"} ·{" "}
                  {data.profile.banner_id}
                </p>
              </div>
            </div>

            <Section title="Activity">
              <Row label="Cadastro" value={fmtDateTime(data.profile.created_at)} />
              <Row label="Primeiro login" value={fmtDateTime(data.profile.first_login_at)} />
              <Row label="Último login" value={fmtDateTime(data.profile.last_login_at)} />
              <Row label="Logins" value={String(data.profile.login_count ?? 0)} />
              <Row label="Dias ativos" value={String(data.activeDays)} />
              <Row label="Treinos" value={String(data.workouts)} />
            </Section>

            <Section title="Retention">
              {(["d1", "d7", "d30"] as const).map((k) => (
                <Row
                  key={k}
                  label={k.toUpperCase()}
                  value={
                    data.retention[k] === "returned"
                      ? "RETURNED ✓"
                      : data.retention[k] === "pending"
                        ? "PENDING"
                        : data.retention[k] === "missed"
                          ? "NOT RETURNED"
                          : "NO DATA"
                  }
                />
              ))}
            </Section>

            <Section title="Últimos acessos">
              {data.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">NO DATA YET</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {data.events.slice(0, 20).map((e) => (
                    <span key={e.login_at} className="rounded-lg bg-elevated px-2 py-1 text-[10px] text-muted-foreground">
                      {fmtDate(e.login_date)}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-elevated/40 p-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="mt-2 space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/* ----------------------------------- audit ---------------------------------- */

function AuditTab() {
  const { data, isLoading, isError, refetch } = useAuditLog();
  if (isLoading) return <PanelSkeleton rows={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data || data.length === 0)
    return (
      <p className="rounded-2xl border border-border bg-surface p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
        NO DATA YET
      </p>
    );
  return (
    <div className="space-y-2">
      {data.map((log) => (
        <div key={log.id} className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-sm font-semibold text-foreground">{log.action}</p>
          <p className="text-[11px] text-muted-foreground">
            {fmtDateTime(log.created_at)} · alvo {log.target_user_id ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------- states --------------------------------- */

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center">
      <p className="text-sm text-foreground">Não foi possível carregar os dados.</p>
      <button
        onClick={onRetry}
        className="press mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground"
      >
        Tentar de novo
      </button>
    </div>
  );
}
