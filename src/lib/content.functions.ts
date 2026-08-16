import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeStreak, levelFromXp } from "@/lib/ascend";
import {
  CONTENT_RARITIES,
  UNLOCK_TYPES,
  isBannerUnlockedFor,
  mergeBanners,
  type ContentRow,
  type EffectiveBanner,
} from "@/lib/content";

const STORAGE_PREFIX = "storage:";
const BUCKET = "banner-images";

async function isAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  if (!(await isAdmin(context))) throw new Error("ACCESS DENIED");
}

async function audit(context: { supabase: any; userId: string }, action: string, details: unknown) {
  await context.supabase
    .from("admin_audit_log")
    .insert({ admin_id: context.userId, action, details: details as never });
}

/** Converte referências `storage:<path>` em URLs assinadas de 7 dias. */
export async function resolveImages(supabase: any, rows: ContentRow[]) {
  const paths = rows
    .map((r) => r.image_url)
    .filter((u): u is string => !!u && u.startsWith(STORAGE_PREFIX))
    .map((u) => u.slice(STORAGE_PREFIX.length));
  if (!paths.length) return rows;

  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
  const map = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);

  return rows.map((r) =>
    r.image_url && r.image_url.startsWith(STORAGE_PREFIX)
      ? { ...r, image_url: map.get(r.image_url.slice(STORAGE_PREFIX.length)) ?? null }
      : r,
  );
}

async function loadStats(supabase: any, userId: string) {
  const [profileRes, workoutsRes, achievementsRes] = await Promise.all([
    supabase.from("profiles").select("xp,verified").eq("id", userId).maybeSingle(),
    supabase.from("workouts").select("date").eq("user_id", userId),
    supabase.from("achievements").select("code").eq("user_id", userId),
  ]);
  const xp = profileRes.data?.xp ?? 0;
  const achievements = achievementsRes.data?.length ?? 0;
  return {
    verified: profileRes.data?.verified === true,
    xp,
    level: levelFromXp(xp).level,
    workouts: workoutsRes.data?.length ?? 0,
    achievements,
    medals: achievements,
    streak: computeStreak((workoutsRes.data ?? []).map((w: { date: string }) => w.date)),
    onboarded: true,
  };
}

/* --------------------------------- usuário --------------------------------- */

/** Banners efetivos (código + Admin Panel) com o estado de desbloqueio do usuário. */
export const getBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ banners: (EffectiveBanner & { unlocked: boolean })[] }> => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("content_items").select("*").eq("kind", "banner");
    const rows = await resolveImages(supabase, (data ?? []) as ContentRow[]);
    const [stats, admin] = await Promise.all([loadStats(supabase, userId), isAdmin(context)]);

    const merged = mergeBanners(rows).filter((m) => m.effective.url);
    return {
      banners: merged.map((m) => ({
        ...m.effective,
        unlocked: isBannerUnlockedFor(m.effective, m.base, stats, admin, userId, stats.verified),
      })),
    };
  });

/* ---------------------------------- admin ---------------------------------- */

const payload = z.object({
  id: z.string().uuid().nullable().optional(),
  kind: z.enum(["title", "banner"]),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  rarity: z.enum(CONTENT_RARITIES),
  unlock_type: z.enum(UNLOCK_TYPES),
  unlock_value: z.number().int().min(0).max(1_000_000).nullable().optional(),
  unlock_label: z.string().trim().max(140).nullable().optional(),
  xp_reward: z.number().int().min(0).max(100_000).default(0),
  image_url: z.string().trim().max(500).nullable().optional(),
  image_position: z.string().trim().max(40).nullable().optional(),
  category: z.enum(["CORE", "FORGED", "LEGACY", "VOID"]).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(100),
});

/** Lista completa (inclusive inativos) para o Admin Panel, com contagem de usuários. */
export const adminListContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ kind: z.enum(["title", "banner"]) }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const [itemsRes, ownersRes] = await Promise.all([
      supabase.from("content_items").select("*").eq("kind", data.kind).order("sort_order"),
      data.kind === "title"
        ? supabase.from("user_titles").select("title_id")
        : supabase.from("profiles").select("banner_id"),
    ]);

    const counts = new Map<string, number>();
    for (const row of (ownersRes.data ?? []) as Record<string, string | null>[]) {
      const key = data.kind === "title" ? row["title_id"] : row["banner_id"];
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const rows = await resolveImages(supabase, (itemsRes.data ?? []) as ContentRow[]);
    const merged =
      data.kind === "banner"
        ? new Map(mergeBanners(rows, { includeInactive: true }).map((m) => [m.effective.id, m.effective.url]))
        : null;

    return {
      rows: rows.map((r) => ({
        ...r,
        users: counts.get(r.slug) ?? 0,
        preview: merged?.get(r.slug) ?? r.image_url,
      })),
    };
  });

/** Cria ou atualiza um título/banner. Somente admin (validado no banco). */
export const adminSaveContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => payload.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { id, ...values } = data;

    const patch = {
      kind: values.kind,
      slug: values.slug,
      name: values.name,
      description: values.description ?? null,
      rarity: values.rarity,
      unlock_type: values.unlock_type,
      unlock_value: values.unlock_value ?? null,
      unlock_label: values.unlock_label || null,
      xp_reward: values.xp_reward,
      image_position: values.image_position || null,
      category: values.category ?? null,
      emoji: values.emoji || null,
      color: values.color || null,
      active: values.active,
      admin_only: values.admin_only,
      sort_order: values.sort_order,
      ...(values.image_url !== undefined ? { image_url: values.image_url || null } : {}),
    };

    if (id) {
      const { error } = await supabase.from("content_items").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      await audit(context, "content.update", { id, kind: values.kind, slug: values.slug });
      return { id };
    }

    const { data: created, error } = await supabase
      .from("content_items")
      .insert(patch)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    await audit(context, "content.create", { id: created?.id, kind: values.kind, slug: values.slug });
    return { id: created?.id ?? null };
  });

/** Ativa/desativa um item sem apagar nada dos usuários. */
export const adminToggleContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("content_items")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, data.active ? "content.enable" : "content.disable", { id: data.id });
    return { ok: true };
  });

/**
 * Exclusão segura: itens nativos ou já desbloqueados por usuários viram
 * soft delete (desativados) para não quebrar históricos.
 */
export const adminDeleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context;

    const { data: row } = await supabase
      .from("content_items")
      .select("id, kind, slug, builtin")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Item não encontrado");

    const owners =
      row.kind === "title"
        ? await supabase
            .from("user_titles")
            .select("id", { count: "exact", head: true })
            .eq("title_id", row.slug)
        : await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("banner_id", row.slug);

    const inUse = row.builtin || (owners.count ?? 0) > 0;

    if (inUse) {
      const { error } = await supabase
        .from("content_items")
        .update({ active: false, deleted_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      await audit(context, "content.soft_delete", { id: row.id, slug: row.slug, kind: row.kind });
      return { softDeleted: true };
    }

    const { error } = await supabase.from("content_items").delete().eq("id", row.id);
    if (error) throw new Error(error.message);
    await audit(context, "content.delete", { id: row.id, slug: row.slug, kind: row.kind });
    return { softDeleted: false };
  });

/** Restaura um item removido logicamente. */
export const adminRestoreContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("content_items")
      .update({ deleted_at: null, active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context, "content.restore", { id: data.id });
    return { ok: true };
  });

/** Upload da imagem do banner (base64) — apenas admin. Retorna a referência salva. */
export const adminUploadBannerImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        dataUrl: z
          .string()
          .max(3_500_000)
          .regex(/^data:image\/(png|jpeg|webp);base64,/, "Formato inválido"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [meta, b64] = data.dataUrl.split(",") as [string, string];
    const type = meta.slice(5, meta.indexOf(";"));
    const ext = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "webp";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `banners/${crypto.randomUUID()}.${ext}`;

    const { error } = await context.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);

    const { data: signed } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return { reference: `${STORAGE_PREFIX}${path}`, previewUrl: signed?.signedUrl ?? null };
  });
