import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff, getAccess } from "@/lib/roles.server";
import { BADGE_CATEGORIES, BADGE_RARITIES, VOID_BADGE_SLUG, type OwnedBadge } from "@/lib/badges";

const BADGE_COLS =
  "id, slug, name, description, icon_url, emoji, category, rarity, color, is_active, admin_only, featurable, sort_order";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function mapOwned(rows: any[]): OwnedBadge[] {
  return rows
    .filter((r) => r.badges)
    .map((r) => ({
      badge: r.badges,
      granted_at: r.granted_at,
      granted_by: r.granted_by ?? null,
      is_featured: !!r.is_featured,
      seen: !!r.seen_at,
    }))
    .sort((a, b) => a.badge.sort_order - b.badge.sort_order);
}

/* --------------------------------- usuário --------------------------------- */

/** Selos do usuário autenticado + pendentes de animação "BADGE UNLOCKED". */
export const getMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_badges")
      .select(`granted_at, granted_by, is_featured, seen_at, badges (${BADGE_COLS})`)
      .eq("user_id", context.userId)
      .is("revoked_at", null);

    const owned = mapOwned((data ?? []) as any[]).filter((o) => o.badge.is_active);
    return {
      owned,
      featured: owned.find((o) => o.is_featured)?.badge.id ?? null,
      pending: owned.filter((o) => !o.seen).map((o) => o.badge.id),
    };
  });

/** Selos públicos de qualquer perfil. */
export const getUserBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("user_badges")
      .select(`granted_at, granted_by, is_featured, seen_at, badges (${BADGE_COLS})`)
      .eq("user_id", data.userId)
      .is("revoked_at", null);
    const owned = mapOwned((rows ?? []) as any[]).filter((o) => o.badge.is_active);
    return { owned, featured: owned.find((o) => o.is_featured)?.badge.id ?? null };
  });

/** Escolhe o selo em destaque — só entre selos que o usuário realmente possui. */
export const setFeaturedBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ badgeId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const db = await admin();
    await db.from("user_badges").update({ is_featured: false }).eq("user_id", context.userId);

    if (data.badgeId) {
      const { data: row } = await db
        .from("user_badges")
        .select("id, badges (featurable, is_active)")
        .eq("user_id", context.userId)
        .eq("badge_id", data.badgeId)
        .is("revoked_at", null)
        .maybeSingle();
      const badge = (row as any)?.badges;
      if (!row || !badge?.is_active || !badge?.featurable) throw new Error("Selo indisponível");
      await db.from("user_badges").update({ is_featured: true }).eq("id", (row as any).id);
    }
    return { ok: true };
  });

/** Marca a animação como vista (não concede XP). */
export const markBadgesSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ badgeIds: z.array(z.string().uuid()).max(20) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!data.badgeIds.length) return { ok: true };
    const db = await admin();
    await db
      .from("user_badges")
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .in("badge_id", data.badgeIds);
    return { ok: true };
  });

/* ---------------------------------- admin ---------------------------------- */

const badgePayload = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(240).nullable().optional(),
  icon_url: z.string().trim().max(500).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  category: z.enum(BADGE_CATEGORIES),
  rarity: z.enum(BADGE_RARITIES),
  color: z.string().trim().max(40).nullable().optional(),
  is_active: z.boolean().default(true),
  admin_only: z.boolean().default(true),
  featurable: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(100),
});

async function logBadge(
  db: any,
  entry: { user_id: string; badge_id: string | null; admin_id: string; action: string; reason?: string | null },
) {
  await db.from("badge_audit_logs").insert({ ...entry, reason: entry.reason ?? null });
}

/** Catálogo completo (inclusive inativos) + contagem de portadores. */
export const adminListBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const [items, owners] = await Promise.all([
      db.from("badges").select(BADGE_COLS).order("sort_order"),
      db.from("user_badges").select("badge_id, revoked_at"),
    ]);
    const counts = new Map<string, number>();
    let revoked = 0;
    for (const row of (owners.data ?? []) as any[]) {
      if (row.revoked_at) {
        revoked += 1;
        continue;
      }
      counts.set(row.badge_id, (counts.get(row.badge_id) ?? 0) + 1);
    }
    const rows = ((items.data ?? []) as any[]).map((b) => ({ ...b, holders: counts.get(b.id) ?? 0 }));
    return {
      rows,
      stats: {
        total: rows.length,
        active: rows.filter((r) => r.is_active).length,
        granted: [...counts.values()].reduce((a, b) => a + b, 0),
        revoked,
      },
    };
  });

export const adminSaveBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => badgePayload.parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...values } = data;
    const patch = {
      slug: values.slug,
      name: values.name,
      description: values.description || null,
      icon_url: values.icon_url || null,
      emoji: values.emoji || null,
      category: values.category,
      rarity: values.rarity,
      color: values.color || null,
      is_active: values.is_active,
      admin_only: values.admin_only,
      featurable: values.featurable,
      sort_order: values.sort_order,
    };
    if (id) {
      const { error } = await db.from("badges").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await db.from("badges").insert(patch).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { id: created?.id ?? null };
  });

export const adminToggleBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const db = await admin();
    const { error } = await db.from("badges").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Busca de usuários para conceder selos (nome, @username ou id). */
export const adminSearchBadgeUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(60) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const db = await admin();
    const term = data.q.replace(/[,%()*]/g, "").trim();
    let query = db.from("profiles").select("id, name, username, avatar_url").limit(10);
    if (/^[0-9a-f-]{36}$/i.test(term)) query = query.eq("id", term);
    else if (term) query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%`);
    const { data: rows } = await query;
    return { rows: (rows ?? []) as any[] };
  });

/** Concede um selo. THE VOID também concede a role real `super_admin`. */
export const adminGrantBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        badgeId: z.string().uuid(),
        reason: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const access = await assertStaff(context);
    const db = await admin();

    const { data: badge } = await db.from("badges").select(BADGE_COLS).eq("id", data.badgeId).maybeSingle();
    if (!badge) throw new Error("Selo não encontrado");

    if (badge.slug === VOID_BADGE_SLUG) {
      const { count } = await db
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      // Bootstrap: enquanto não existir nenhum super admin, o owner (admin) pode conceder.
      if (!access.isSuperAdmin && (count ?? 0) > 0) throw new Error("Somente THE VOID pode conceder este selo");
    }

    const { error } = await db
      .from("user_badges")
      .upsert(
        {
          user_id: data.userId,
          badge_id: data.badgeId,
          granted_by: context.userId,
          granted_at: new Date().toISOString(),
          revoked_at: null,
          revoked_by: null,
          seen_at: null,
        },
        { onConflict: "user_id,badge_id" },
      );
    if (error) throw new Error(error.message);

    if (badge.slug === VOID_BADGE_SLUG) {
      await db.from("user_roles").upsert(
        { user_id: data.userId, role: "super_admin" },
        { onConflict: "user_id,role" },
      );
    }
    if (badge.slug === "verified") {
      await db
        .from("profiles")
        .update({ verified: true, verified_at: new Date().toISOString(), verified_by: context.userId })
        .eq("id", data.userId);
    }

    await logBadge(db, {
      user_id: data.userId,
      badge_id: data.badgeId,
      admin_id: context.userId,
      action: "GRANTED",
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

/** Revoga um selo. Remover THE VOID também remove a role `super_admin`. */
export const adminRevokeBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        badgeId: z.string().uuid(),
        reason: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const access = await assertStaff(context);
    const db = await admin();

    const { data: badge } = await db.from("badges").select("id, slug").eq("id", data.badgeId).maybeSingle();
    if (!badge) throw new Error("Selo não encontrado");
    if (badge.slug === VOID_BADGE_SLUG && !access.isSuperAdmin)
      throw new Error("Somente THE VOID pode remover este selo");

    const { error } = await db
      .from("user_badges")
      .update({ revoked_at: new Date().toISOString(), revoked_by: context.userId, is_featured: false })
      .eq("user_id", data.userId)
      .eq("badge_id", data.badgeId);
    if (error) throw new Error(error.message);

    if (badge.slug === VOID_BADGE_SLUG) {
      await db.from("user_roles").delete().eq("user_id", data.userId).eq("role", "super_admin");
    }
    if (badge.slug === "verified") {
      await db.from("profiles").update({ verified: false, verified_at: null }).eq("id", data.userId);
    }

    await logBadge(db, {
      user_id: data.userId,
      badge_id: data.badgeId,
      admin_id: context.userId,
      action: "REVOKED",
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

/** Tabela de concessões com filtros. */
export const adminListGrants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(60).default(""),
        badgeId: z.string().uuid().nullable().default(null),
        rarity: z.string().max(20).default("all"),
        status: z.enum(["all", "active", "revoked"]).default("all"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const db = await admin();

    let query = db
      .from("user_badges")
      .select(`id, user_id, granted_by, granted_at, revoked_at, badges (${BADGE_COLS})`)
      .order("granted_at", { ascending: false })
      .limit(200);
    if (data.badgeId) query = query.eq("badge_id", data.badgeId);
    if (data.status === "active") query = query.is("revoked_at", null);
    if (data.status === "revoked") query = query.not("revoked_at", "is", null);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = new Set<string>();
    for (const r of (rows ?? []) as any[]) {
      ids.add(r.user_id);
      if (r.granted_by) ids.add(r.granted_by);
    }
    const { data: people } = ids.size
      ? await db.from("profiles").select("id, name, username, avatar_url").in("id", [...ids])
      : { data: [] as any[] };
    const byId = new Map(((people ?? []) as any[]).map((p) => [p.id, p]));

    const term = data.search.toLowerCase();
    const list = ((rows ?? []) as any[])
      .map((r) => ({
        id: r.id,
        badge: r.badges,
        user: byId.get(r.user_id) ?? { id: r.user_id, name: r.user_id, username: null, avatar_url: null },
        grantedBy: r.granted_by ? (byId.get(r.granted_by) ?? null) : null,
        granted_at: r.granted_at,
        revoked_at: r.revoked_at,
      }))
      .filter((r) => (data.rarity === "all" ? true : r.badge?.rarity === data.rarity))
      .filter((r) =>
        term
          ? `${r.user.name ?? ""} ${r.user.username ?? ""} ${r.badge?.name ?? ""}`.toLowerCase().includes(term)
          : true,
      );

    return { rows: list };
  });

/** Histórico/auditoria de selos. */
export const adminBadgeLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: logs } = await db
      .from("badge_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const ids = new Set<string>();
    for (const l of (logs ?? []) as any[]) {
      ids.add(l.user_id);
      ids.add(l.admin_id);
    }
    const { data: people } = ids.size
      ? await db.from("profiles").select("id, name, username").in("id", [...ids])
      : { data: [] as any[] };
    const byId = new Map(((people ?? []) as any[]).map((p) => [p.id, p]));

    const { data: badges } = await db.from("badges").select("id, name, rarity");
    const badgeById = new Map(((badges ?? []) as any[]).map((b) => [b.id, b]));

    return {
      rows: ((logs ?? []) as any[]).map((l) => ({
        id: l.id,
        action: l.action as "GRANTED" | "REVOKED",
        reason: l.reason as string | null,
        created_at: l.created_at as string,
        badge: l.badge_id ? (badgeById.get(l.badge_id) ?? null) : null,
        user: byId.get(l.user_id) ?? null,
        admin: byId.get(l.admin_id) ?? null,
      })),
    };
  });
