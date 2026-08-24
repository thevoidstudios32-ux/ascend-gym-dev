import { useMemo, useState } from "react";
import { Eye, EyeOff, History, Pencil, Plus, Search, ShieldAlert, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { BadgeCard, BadgeIcon } from "@/components/badge-chip";
import { UserAvatar } from "@/components/user-avatar";
import { fmtDateTime } from "@/lib/admin";
import {
  BADGE_CATEGORIES,
  BADGE_RARITIES,
  VOID_BADGE_SLUG,
  rarityStyle,
  type BadgeDef,
} from "@/lib/badges";
import {
  useAdminBadges,
  useBadgeGrants,
  useBadgeLogs,
  useBadgeUserSearch,
  useGrantBadge,
  useRevokeBadge,
  useSaveBadge,
  useToggleBadge,
  type BadgeFormPayload,
  type GrantFilters,
} from "@/hooks/use-badges";

type CatalogRow = BadgeDef & { holders: number };
type Person = { id: string; name: string; username: string | null; avatar_url: string | null };

const EMPTY: BadgeFormPayload = {
  id: null,
  slug: "",
  name: "",
  description: "",
  icon_url: "",
  emoji: "🛡️",
  category: "Official",
  rarity: "Rare",
  color: "",
  is_active: true,
  admin_only: true,
  featurable: true,
  sort_order: 100,
};

const RARE_TIERS = ["Legendary", "Mythic", "Exclusive"];
const field = "w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60";
const label = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

/** Gerenciamento completo de Selos (Badges) — somente staff. */
export function BadgeManagement() {
  const [view, setView] = useState<"catalog" | "grant" | "grants" | "audit">("catalog");
  const catalog = useAdminBadges();
  const rows = (catalog.data?.rows ?? []) as CatalogRow[];
  const stats = catalog.data?.stats;

  const grantsAll = useBadgeGrants({ search: "", badgeId: null, rarity: "all", status: "active" });
  const activeGrants = grantsAll.data?.rows ?? [];
  const uniqueUsers = new Set(activeGrants.map((g) => g.user.id)).size;
  const voidCount = activeGrants.filter((g) => g.badge?.slug === VOID_BADGE_SLUG).length;

  return (
    <div className="space-y-5">
      {catalog.isError ? (
        <ErrorState onRetry={() => catalog.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Counter label="Total badges" value={stats?.total ?? 0} loading={catalog.isLoading} />
          <Counter label="Badges ativos" value={stats?.active ?? 0} loading={catalog.isLoading} />
          <Counter label="Usuários com badge" value={uniqueUsers} loading={grantsAll.isLoading} />
          <Counter label="Total de grants" value={stats?.granted ?? 0} loading={catalog.isLoading} />
          <Counter label="THE VOID" value={voidCount} loading={grantsAll.isLoading} />
          <Counter
            label="Premium / raros"
            value={rows.filter((r) => RARE_TIERS.includes(r.rarity)).length}
            loading={catalog.isLoading}
          />
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto">
        {(
          [
            ["catalog", "Catálogo"],
            ["grant", "Grant / Revoke"],
            ["grants", "Concessões"],
            ["audit", "Histórico"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`press whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              view === id
                ? "bg-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {text}
          </button>
        ))}
      </nav>

      {view === "catalog" ? <Catalog rows={rows} loading={catalog.isLoading} /> : null}
      {view === "grant" ? <GrantArea badges={rows} /> : null}
      {view === "grants" ? <GrantsTable badges={rows} /> : null}
      {view === "audit" ? <AuditHistory /> : null}
    </div>
  );
}

function Counter({ label: text, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className={label}>{text}</p>
      <p className="text-display mt-1.5 text-2xl text-foreground">{loading ? "…" : value}</p>
    </div>
  );
}

/* --------------------------------- catálogo -------------------------------- */

function Catalog({ rows, loading }: { rows: CatalogRow[]; loading: boolean }) {
  const [editing, setEditing] = useState<BadgeFormPayload | null>(null);
  const toggle = useToggleBadge();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(EMPTY)}
          className="press inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground"
        >
          <Plus className="size-3.5" /> Novo selo
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty text="Catálogo vazio — crie o primeiro selo" />
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => {
            const style = rarityStyle(b.rarity);
            return (
              <li
                key={b.id}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3 ${
                  b.is_active ? "" : "opacity-50"
                }`}
              >
                <BadgeIcon badge={b} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {b.name}
                    {b.slug === VOID_BADGE_SLUG ? (
                      <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                        super admin
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{b.description || "—"}</p>
                  <p className={`mt-0.5 text-[10px] font-black uppercase tracking-widest ${style.text}`}>
                    {b.rarity} · {b.category} · {b.holders} portador{b.holders === 1 ? "" : "es"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      toggle.mutate(
                        { id: b.id, is_active: !b.is_active },
                        {
                          onSuccess: () => toast.success(b.is_active ? "Selo desativado." : "Selo ativado."),
                          onError: () => toast.error("Não foi possível alterar o selo."),
                        },
                      )
                    }
                    className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                    aria-label={b.is_active ? "Desativar selo" : "Ativar selo"}
                  >
                    {b.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button
                    onClick={() =>
                      setEditing({
                        id: b.id,
                        slug: b.slug,
                        name: b.name,
                        description: b.description ?? "",
                        icon_url: b.icon_url ?? "",
                        emoji: b.emoji ?? "",
                        category: b.category as BadgeFormPayload["category"],
                        rarity: b.rarity as BadgeFormPayload["rarity"],
                        color: b.color ?? "",
                        is_active: b.is_active,
                        admin_only: b.admin_only,
                        featurable: b.featurable,
                        sort_order: b.sort_order,
                      })
                    }
                    className="press grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground"
                    aria-label="Editar selo"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? <BadgeEditor value={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function BadgeEditor({ value, onClose }: { value: BadgeFormPayload; onClose: () => void }) {
  const [form, setForm] = useState(value);
  const save = useSaveBadge();

  const set = <K extends keyof BadgeFormPayload>(k: K, v: BadgeFormPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={form.id ? "Editar selo" : "Novo selo"} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={label}>Nome</p>
            <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <p className={label}>Slug</p>
            <input
              className={field}
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
          </div>
        </div>
        <div>
          <p className={label}>Descrição</p>
          <input
            className={field}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={label}>Categoria</p>
            <select
              className={field}
              value={form.category}
              onChange={(e) => set("category", e.target.value as BadgeFormPayload["category"])}
            >
              {BADGE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className={label}>Rarity</p>
            <select
              className={field}
              value={form.rarity}
              onChange={(e) => set("rarity", e.target.value as BadgeFormPayload["rarity"])}
            >
              {BADGE_RARITIES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className={label}>Emoji</p>
            <input className={field} value={form.emoji ?? ""} onChange={(e) => set("emoji", e.target.value)} />
          </div>
          <div>
            <p className={label}>Cor</p>
            <input className={field} value={form.color ?? ""} onChange={(e) => set("color", e.target.value)} />
          </div>
          <div>
            <p className={label}>Ordem</p>
            <input
              className={field}
              type="number"
              value={form.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <p className={label}>Ícone (URL)</p>
          <input className={field} value={form.icon_url ?? ""} onChange={(e) => set("icon_url", e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["is_active", "Ativo"],
              ["admin_only", "Somente admin"],
              ["featurable", "Pode ser destaque"],
            ] as const
          ).map(([k, text]) => (
            <label key={k} className="flex items-center gap-2 text-xs text-foreground">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
              {text}
            </label>
          ))}
        </div>

        <button
          disabled={save.isPending || !form.name.trim() || form.slug.length < 2}
          onClick={() =>
            save.mutate(form, {
              onSuccess: () => {
                toast.success("Selo salvo.");
                onClose();
              },
              onError: () => toast.error("Não foi possível salvar o selo."),
            })
          }
          className="press w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------- grant / revoke ----------------------------- */

function GrantArea({ badges }: { badges: CatalogRow[] }) {
  const [q, setQ] = useState("");
  const [user, setUser] = useState<Person | null>(null);
  const search = useBadgeUserSearch(q);
  const grants = useBadgeGrants({ search: "", badgeId: null, rarity: "all", status: "active" });
  const grant = useGrantBadge();
  const revoke = useRevokeBadge();
  const [pending, setPending] = useState<{ badge: BadgeDef; mode: "grant" | "revoke" } | null>(null);
  const [reason, setReason] = useState("");

  const ownedIds = useMemo(
    () => new Set((grants.data?.rows ?? []).filter((g) => g.user.id === user?.id).map((g) => g.badge?.id)),
    [grants.data, user?.id],
  );

  const busy = grant.isPending || revoke.isPending;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar usuário por nome, @username ou id"
          className={`${field} pl-9`}
        />
      </div>

      {q.trim().length >= 2 && !user ? (
        search.isLoading ? (
          <div className="skeleton h-16 rounded-2xl" />
        ) : search.isError ? (
          <ErrorState onRetry={() => search.refetch()} />
        ) : (search.data?.rows ?? []).length === 0 ? (
          <Empty text="Nenhum usuário encontrado" />
        ) : (
          <ul className="space-y-2">
            {((search.data?.rows ?? []) as Person[]).map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setUser(p)}
                  className="press flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left hover:border-primary/50"
                >
                  <UserAvatar src={p.avatar_url} name={p.name} className="size-10" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.username ? `@${p.username}` : "sem username"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {user ? (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <UserAvatar src={user.avatar_url} name={user.name} className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user.username ? `@${user.username}` : "sem username"}
              </p>
            </div>
            <button
              onClick={() => setUser(null)}
              className="press rounded-full bg-elevated p-1.5 text-muted-foreground"
              aria-label="Limpar seleção"
            >
              <X className="size-4" />
            </button>
          </div>

          <div>
            <p className={label}>Selos atuais</p>
            {grants.isLoading ? (
              <div className="skeleton mt-2 h-14 rounded-2xl" />
            ) : ownedIds.size === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Este usuário ainda não possui selos.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {badges
                  .filter((b) => ownedIds.has(b.id))
                  .map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <BadgeCard badge={b} />
                      </div>
                      <button
                        onClick={() => setPending({ badge: b, mode: "revoke" })}
                        className="press grid size-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-primary"
                        aria-label={`Remover selo ${b.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div>
            <p className={label}>Conceder selo</p>
            <ul className="mt-2 space-y-2">
              {badges
                .filter((b) => b.is_active && !ownedIds.has(b.id))
                .map((b) => (
                  <li key={b.id}>
                    <BadgeCard badge={b} disabled={busy} onClick={() => setPending({ badge: b, mode: "grant" })} />
                  </li>
                ))}
              {badges.filter((b) => b.is_active && !ownedIds.has(b.id)).length === 0 ? (
                <Empty text="Nenhum selo disponível para conceder" />
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      {pending && user ? (
        <Modal
          title={pending.mode === "grant" ? "Confirmar concessão" : "Confirmar remoção"}
          onClose={() => {
            setPending(null);
            setReason("");
          }}
        >
          <div className="space-y-3">
            {pending.badge.slug === VOID_BADGE_SLUG ? (
              <div className="flex gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  THE VOID é o nível máximo de autoridade.{" "}
                  {pending.mode === "grant"
                    ? "Conceder este selo dará acesso total (super admin) ao ASCEND."
                    : "Remover este selo revoga o acesso total (super admin)."}
                </span>
              </div>
            ) : null}
            <p className="text-sm text-foreground">
              {pending.mode === "grant" ? "Conceder" : "Remover"} <b>{pending.badge.name}</b>{" "}
              {pending.mode === "grant" ? "para" : "de"} <b>{user.name}</b>?
            </p>
            <input
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (opcional)"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPending(null);
                  setReason("");
                }}
                className="press flex-1 rounded-full border border-border py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const payload = {
                    userId: user.id,
                    badgeId: pending.badge.id,
                    ...(reason.trim() ? { reason: reason.trim() } : {}),
                  };
                  const fn = pending.mode === "grant" ? grant : revoke;
                  fn.mutate(payload, {
                    onSuccess: () => {
                      toast.success(pending.mode === "grant" ? "Selo concedido." : "Selo removido.");
                      setPending(null);
                      setReason("");
                    },
                    onError: (e) =>
                      toast.error(
                        e instanceof Error && /THE VOID|ACCESS DENIED/i.test(e.message)
                          ? "Você não tem permissão para esta ação."
                          : "Não foi possível concluir a operação.",
                      ),
                  });
                }}
                className="press flex-1 rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Processando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* ------------------------------- grants table ------------------------------ */

const PAGE_SIZE = 20;

function GrantsTable({ badges }: { badges: CatalogRow[] }) {
  const [filters, setFilters] = useState<GrantFilters>({
    search: "",
    badgeId: null,
    rarity: "all",
    status: "all",
  });
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [page, setPage] = useState(1);
  const query = useBadgeGrants(filters);

  const rows = (query.data?.rows ?? [])
    .filter((r) => (category === "all" ? true : r.badge?.category === category))
    .filter((r) => (from ? r.granted_at >= from : true));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const patch = (p: Partial<GrantFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className={field}
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Usuário ou selo"
        />
        <select className={field} value={filters.badgeId ?? "all"} onChange={(e) => patch({ badgeId: e.target.value === "all" ? null : e.target.value })}>
          <option value="all">Todos os selos</option>
          {badges.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select className={field} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="all">Todas as categorias</option>
          {BADGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={field} value={filters.rarity} onChange={(e) => patch({ rarity: e.target.value })}>
          <option value="all">Todas as raridades</option>
          {BADGE_RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className={field}
          value={filters.status}
          onChange={(e) => patch({ status: e.target.value as GrantFilters["status"] })}
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="revoked">Revogados</option>
        </select>
        <input className={field} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
      </div>

      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty text="Nenhuma concessão encontrada" />
      ) : (
        <>
          <ul className="space-y-2">
            {pageRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <UserAvatar src={r.user.avatar_url} name={r.user.name} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{r.user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.badge?.name ?? "—"} · {r.badge?.category ?? "—"} · {r.badge?.rarity ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {fmtDateTime(r.granted_at)} · por {r.grantedBy?.name ?? "sistema"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                    r.revoked_at ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"
                  }`}
                >
                  {r.revoked_at ? "Revogado" : "Ativo"}
                </span>
              </li>
            ))}
          </ul>

          {pages > 1 ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="press rounded-xl border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                {page} / {pages} · {rows.length} concessões
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
        </>
      )}
    </div>
  );
}

/* ---------------------------------- audit ---------------------------------- */

function AuditHistory() {
  const query = useBadgeLogs();
  const [action, setAction] = useState<"all" | "GRANTED" | "REVOKED">("all");
  const [term, setTerm] = useState("");

  const rows = (query.data?.rows ?? [])
    .filter((l) => (action === "all" ? true : l.action === action))
    .filter((l) =>
      term
        ? `${l.user?.name ?? ""} ${l.admin?.name ?? ""} ${l.badge?.name ?? ""}`
            .toLowerCase()
            .includes(term.toLowerCase())
        : true,
    );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar no histórico" />
        <select className={field} value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
          <option value="all">Todas as ações</option>
          <option value="GRANTED">Concessões</option>
          <option value="REVOKED">Remoções</option>
        </select>
      </div>

      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty text="Nenhum histórico ainda" />
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => (
            <li key={l.id} className="rounded-2xl border border-border bg-surface p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <History className="size-3.5 text-muted-foreground" />
                {l.action === "GRANTED" ? "Concedido" : "Removido"} · {l.badge?.name ?? "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {l.user?.name ?? "—"} · por {l.admin?.name ?? "—"} · {fmtDateTime(l.created_at)}
              </p>
              {l.reason ? <p className="mt-1 text-[11px] text-muted-foreground">Motivo: {l.reason}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------- shared --------------------------------- */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-display text-xl text-foreground">{title}</h2>
          <button onClick={onClose} className="press rounded-full bg-elevated p-1.5 text-muted-foreground" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-border bg-surface p-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
      {text}
    </p>
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
