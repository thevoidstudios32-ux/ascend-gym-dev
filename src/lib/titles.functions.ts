import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeStreak, levelFromXp } from "@/lib/ascend";
import { type TitleStats } from "@/lib/titles";
import { mergeTitles, shouldUnlockTitle, type ContentRow, type EffectiveTitle } from "@/lib/content";
import { z } from "zod";

type OwnedRow = { title_id: string; reward_shown: boolean; xp_awarded: number; unlocked_at: string };

/**
 * Lê os títulos do usuário (catálogo em código + itens do Admin Panel),
 * desbloqueia os que já atendem aos requisitos e concede XP no primeiro desbloqueio.
 */
export const getTitles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, workoutsRes, achievementsRes, ownedRes, contentRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("xp,onboarded,equipped_title_id,verified").eq("id", userId).maybeSingle(),
      supabase.from("workouts").select("date").eq("user_id", userId),
      supabase.from("achievements").select("code").eq("user_id", userId),
      supabase.from("user_titles").select("title_id,reward_shown,xp_awarded,unlocked_at").eq("user_id", userId),
      supabase.from("content_items").select("*").eq("kind", "title"),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    ]);

    let xp = profileRes.data?.xp ?? 0;
    let equipped = profileRes.data?.equipped_title_id ?? null;
    const owned: OwnedRow[] = (ownedRes.data ?? []) as OwnedRow[];
    const ownedIds = new Set(owned.map((o) => o.title_id));
    const isAdminUser = !!roleRes.data;
    const isVerified = profileRes.data?.verified === true;

    const stats: TitleStats = {
      xp,
      level: levelFromXp(xp).level,
      workouts: workoutsRes.data?.length ?? 0,
      achievements: achievementsRes.data?.length ?? 0,
      streak: computeStreak((workoutsRes.data ?? []).map((w) => w.date)),
      onboarded: profileRes.data?.onboarded ?? false,
    };

    const merged = mergeTitles((contentRes.data ?? []) as ContentRow[]);
    const catalog: EffectiveTitle[] = merged.map((m) => m.effective);

    // Desbloqueios pendentes (posse validada aqui, no servidor).
    const toUnlock = merged.filter(
      (m) =>
        !ownedIds.has(m.effective.id) &&
        shouldUnlockTitle(m.effective, m.base, stats, isAdminUser, userId, isVerified),
    );

    for (const m of toUnlock) {
      const t = m.effective;
      const { error } = await supabase
        .from("user_titles")
        .insert({ user_id: userId, title_id: t.id, xp_awarded: t.xpReward });
      if (error) continue;
      owned.push({
        title_id: t.id,
        reward_shown: false,
        xp_awarded: t.xpReward,
        unlocked_at: new Date().toISOString(),
      });
      ownedIds.add(t.id);
      xp += t.xpReward;
    }

    if (xp !== (profileRes.data?.xp ?? 0)) {
      await supabase.from("profiles").update({ xp }).eq("id", userId);
    }

    // Equipa automaticamente o primeiro título quando ainda não há nenhum.
    if (!equipped && owned.length > 0) {
      const first = owned[0]!.title_id;
      await supabase.from("profiles").update({ equipped_title_id: first }).eq("id", userId);
      equipped = first;
    }

    return {
      owned: owned.map((o) => ({
        id: o.title_id,
        reward_shown: o.reward_shown,
        xp_awarded: o.xp_awarded,
        unlocked_at: o.unlocked_at,
      })),
      equipped,
      equippedVisual: catalog.find((t) => t.id === equipped) ?? null,
      catalog,
      xp,
      stats: { ...stats, xp, level: levelFromXp(xp).level },
      pending: owned.filter((o) => !o.reward_shown).map((o) => o.title_id),
    };
  });

/** Equipa um título — só funciona se o usuário realmente possuir o título. */
export const equipTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ titleId: z.string().min(1).max(60) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("user_titles")
      .select("title_id")
      .eq("user_id", userId)
      .eq("title_id", data.titleId)
      .maybeSingle();
    if (!row) throw new Error("Você ainda não desbloqueou esse título");

    const { error } = await supabase
      .from("profiles")
      .update({ equipped_title_id: data.titleId })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { equipped: data.titleId };
  });

/** Marca a animação de desbloqueio como exibida, para não repetir. */
export const markTitleRewardShown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ titleId: z.string().min(1).max(60) }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_titles")
      .update({ reward_shown: true })
      .eq("user_id", userId)
      .eq("title_id", data.titleId);
    return { ok: true };
  });
