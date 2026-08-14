import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AVATAR_MAX = 300_000; // ~300KB de data URL

/** Salva a foto de perfil (data URL comprimida) do usuário autenticado. */
export const saveAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        avatar_url: z
          .string()
          .max(AVATAR_MAX, "Imagem muito grande")
          .regex(/^data:image\/(png|jpeg|webp);base64,/, "Formato inválido")
          .nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Equipa um banner de perfil (catálogo em código + itens do Admin Panel). */
export const saveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ banner_id: z.string().min(1).max(60) }).parse(data))
  .handler(async ({ context, data }) => {
    const { mergeBanners, isBannerUnlockedFor } = await import("@/lib/content");
    const { resolveImages } = await import("@/lib/content.functions");
    const { computeStreak, levelFromXp } = await import("@/lib/ascend");

    const [rowsRes, profileRes, workoutsRes, achievementsRes, roleRes] = await Promise.all([
      context.supabase.from("content_items").select("*").eq("kind", "banner"),
      context.supabase.from("profiles").select("xp,verified").eq("id", context.userId).maybeSingle(),
      context.supabase.from("workouts").select("date").eq("user_id", context.userId),
      context.supabase.from("achievements").select("code").eq("user_id", context.userId),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);

    const rows = await resolveImages(context.supabase, (rowsRes.data ?? []) as never);
    const merged = mergeBanners(rows);
    const target = merged.find((m) => m.effective.id === data.banner_id);
    if (!target) throw new Error("Banner inválido");

    const xp = profileRes.data?.xp ?? 0;
    const achievements = achievementsRes.data?.length ?? 0;
    const stats = {
      xp,
      level: levelFromXp(xp).level,
      workouts: workoutsRes.data?.length ?? 0,
      achievements,
      medals: achievements,
      streak: computeStreak((workoutsRes.data ?? []).map((w) => w.date)),
      onboarded: true,
    };

    if (
      !isBannerUnlockedFor(
        target.effective,
        target.base,
        stats,
        roleRes.data === true,
        context.userId,
        profileRes.data?.verified === true,
      )
    ) {
      throw new Error("Banner indisponível");
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({ banner_id: data.banner_id })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


