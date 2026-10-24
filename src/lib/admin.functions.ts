import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { addDays, daysBetween, utcDate, type AdminMetrics, type RetentionStat, type SeriesPoint } from "@/lib/admin";

/* ------------------------------ acesso / role ------------------------------ */

/** Retorna se o usuário autenticado é admin (validado no banco, nunca no cliente). */
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: await checkAdmin(context) };
  });

/** Verifica o papel de admin lendo a tabela de papéis (protegida por RLS). */
export async function checkAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "super_admin"])
    .limit(1);
  return !!(data && data.length > 0);
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  if (!(await checkAdmin(context))) throw new Error("ACCESS DENIED");
}

/* ------------------------------ login tracking ----------------------------- */

/**
 * Registra o login do usuário atual. Idempotente: no máximo um evento por dia
 * (UNIQUE user_id+login_date), então refresh/abas extras não duplicam nada.
 */
export const trackLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const inserted = await supabase
      .from("login_events")
      .insert({ user_id: userId, login_at: now, login_date: today })
      .select("id")
      .maybeSingle();

    const isNewSession = !inserted.error && !!inserted.data;

    const profile = await supabase
      .from("profiles")
      .select("first_login_at, login_count")
      .eq("id", userId)
      .maybeSingle();

    const patch = {
      last_seen_at: now,
      ...(isNewSession
        ? {
            last_login_at: now,
            login_count: (profile.data?.login_count ?? 0) + 1,
            ...(profile.data?.first_login_at ? {} : { first_login_at: now }),
          }
        : {}),
    };
    // Campos de sistema: o usuário não tem permissão de coluna para eles, então
    // a gravação é feita pelo client de serviço, sempre restrita ao próprio userId.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update(patch).eq("id", userId);

    return { tracked: isNewSession };
  });

/** Heartbeat leve: só atualiza last_seen_at (status ONLINE/OFFLINE). */
export const touchPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

/* --------------------------------- métricas -------------------------------- */

function series(dates: string[], from: string, to: string): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1);
  const out: SeriesPoint[] = [];
  for (let d = from; daysBetween(d, to) >= 0; d = addDays(d, 1)) {
    out.push({ date: d, value: counts.get(d) ?? 0 });
  }
  return out;
}

function retention(
  firstByUser: Map<string, string>,
  datesByUser: Map<string, Set<string>>,
  today: string,
  day: number,
  tolerance: number,
): RetentionStat {
  let eligible = 0;
  let returned = 0;
  for (const [user, first] of firstByUser) {
    if (daysBetween(first, today) < day) continue; // ainda não teve tempo
    eligible += 1;
    const set = datesByUser.get(user);
    if (!set) continue;
    for (let off = day - tolerance; off <= day + tolerance; off += 1) {
      if (off <= 0) continue;
      if (set.has(addDays(first, off))) {
        returned += 1;
        break;
      }
    }
  }
  return { eligible, returned, pct: eligible ? Math.round((returned / eligible) * 100) : null };
}

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ days: z.number().int().min(0).max(365) }).parse(data))
  .handler(async ({ context, data }): Promise<AdminMetrics> => {
    await assertAdmin(context);
    const { supabase } = context;
    const today = utcDate(new Date());

    const [profilesRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("id, created_at, first_login_at, last_seen_at, last_login_at"),
      supabase.from("login_events").select("user_id, login_date"),
    ]);

    const profiles = profilesRes.data ?? [];
    const events = eventsRes.data ?? [];

    const datesByUser = new Map<string, Set<string>>();
    for (const e of events) {
      const set = datesByUser.get(e.user_id) ?? new Set<string>();
      set.add(e.login_date);
      datesByUser.set(e.user_id, set);
    }

    const firstByUser = new Map<string, string>();
    for (const p of profiles) {
      const fromEvents = datesByUser.get(p.id);
      const first = p.first_login_at
        ? utcDate(p.first_login_at)
        : fromEvents
          ? [...fromEvents].sort()[0]!
          : null;
      if (first) firstByUser.set(p.id, first);
    }

    const activeToday = new Set(events.filter((e) => e.login_date === today).map((e) => e.user_id)).size;
    const newToday = profiles.filter((p) => utcDate(p.created_at) === today).length;
    const returningUsers = [...datesByUser.values()].filter((s) => s.size > 1).length;

    const span = data.days === 0 ? 90 : data.days;
    const from = addDays(today, -(span - 1));
    const inRange = (d: string) => daysBetween(from, d) >= 0;

    const growth = series(
      profiles.map((p) => utcDate(p.created_at)).filter(inRange),
      from,
      today,
    );
    const loginDates = events.map((e) => e.login_date).filter(inRange);
    const logins = series(loginDates, from, today);
    const dau = logins; // 1 evento por usuário/dia → logins do dia = usuários ativos

    return {
      totalUsers: profiles.length,
      newToday,
      activeToday,
      returningUsers,
      d1: retention(firstByUser, datesByUser, today, 1, 0),
      d7: retention(firstByUser, datesByUser, today, 7, 1),
      d30: retention(firstByUser, datesByUser, today, 30, 3),
      growth,
      dau,
      logins,
    };
  });

/* --------------------------------- usuários -------------------------------- */

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        page: z.number().int().min(1).max(1000).default(1),
        search: z.string().max(60).default(""),
        filter: z.enum(["all", "new", "active", "returning"]).default("all"),
        days: z.number().int().min(0).max(365).default(30),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const pageSize = 20;
    const today = utcDate(new Date());
    const from = data.days === 0 ? null : addDays(today, -(data.days - 1));

    let query = supabase
      .from("profiles")
      .select(
        "id, name, username, avatar_url, created_at, first_login_at, last_login_at, last_seen_at, login_count, xp, equipped_title_id, banner_id",
        { count: "exact" },
      );

    const term = data.search.replace(/[,%()*]/g, "").trim();
    if (term) query = query.or(`name.ilike.%${term}%,username.ilike.%${term}%`);

    if (data.filter === "new" && from) query = query.gte("created_at", `${from}T00:00:00Z`);
    if (data.filter === "active") query = query.gte("last_login_at", `${addDays(today, -1)}T00:00:00Z`);
    if (data.filter === "returning") query = query.gte("login_count", 2);

    const start = (data.page - 1) * pageSize;
    const { data: rows, count, error } = await query
      .order("created_at", { ascending: false })
      .range(start, start + pageSize - 1);
    if (error) throw new Error(error.message);

    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize };
  });

export const getAdminUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [profileRes, eventsRes, workoutsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("login_events")
        .select("login_at, login_date")
        .eq("user_id", data.id)
        .order("login_date", { ascending: false })
        .limit(60),
      supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", data.id),
    ]);

    if (!profileRes.data) throw new Error("Usuário não encontrado");
    const events = eventsRes.data ?? [];
    const dates = new Set(events.map((e) => e.login_date));
    const today = utcDate(new Date());
    const first = profileRes.data.first_login_at
      ? utcDate(profileRes.data.first_login_at)
      : [...dates].sort()[0] ?? null;

    function flag(day: number, tolerance: number) {
      if (!first) return "no-data" as const;
      if (daysBetween(first, today) < day) return "pending" as const;
      for (let off = day - tolerance; off <= day + tolerance; off += 1) {
        if (off > 0 && dates.has(addDays(first, off))) return "returned" as const;
      }
      return "missed" as const;
    }

    return {
      profile: profileRes.data,
      events,
      activeDays: dates.size,
      workouts: workoutsRes.count ?? 0,
      retention: { d1: flag(1, 0), d7: flag(7, 1), d30: flag(30, 3) },
    };
  });

/* -------------------------------- audit log -------------------------------- */

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
