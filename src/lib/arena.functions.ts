import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { XP_PER_WIN } from "@/lib/arena";
import { applyWinRewards, buildArena, buildRanking, pickBattle, refreshBestRank } from "@/lib/arena.server";

export const getArena = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildArena(context.supabase, context.userId));

export const getBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ category: z.string().min(1).max(20) }).parse(data))
  .handler(async ({ context, data }) => pickBattle(context.supabase, context.userId, data.category));

export const getRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().min(1).max(20),
        range: z.enum(["today", "week", "month", "all"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return buildRanking(context.supabase, supabaseAdmin, data.category, data.range);
  });

export const joinBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().min(1).max(20),
        path: z.string().min(3).max(300),
        description: z.string().max(200).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) throw new Error("Arquivo inválido.");

    await supabase
      .from("battle_entries")
      .update({ status: "retired" })
      .eq("user_id", userId)
      .eq("category", data.category)
      .eq("status", "active");

    const { data: row, error } = await supabase
      .from("battle_entries")
      .insert({
        user_id: userId,
        category: data.category,
        media_path: data.path,
        media_type: "photo",
        description: data.description?.trim() || null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id ?? null };
  });

export const leaveBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("battle_entries")
      .update({ status: "retired" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const castVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        winnerId: z.string().uuid(),
        loserId: z.string().uuid(),
        category: z.string().min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.winnerId === data.loserId) throw new Error("Confronto inválido.");

    const { data: pair } = await supabase
      .from("battle_entries")
      .select("id,user_id,category,status")
      .in("id", [data.winnerId, data.loserId]);
    if (!pair || pair.length !== 2) throw new Error("Batalha indisponível.");
    if (pair.every((e) => e.user_id === userId)) throw new Error("Você não pode votar em si mesmo.");
    if (pair.some((e) => e.status !== "active" || e.category !== data.category))
      throw new Error("Batalha indisponível.");

    const { error } = await supabase.from("battle_votes").insert({
      voter_id: userId,
      winner_entry_id: data.winnerId,
      loser_entry_id: data.loserId,
      category: data.category,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "Você já votou neste confronto." : error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await applyWinRewards(supabaseAdmin, data.winnerId, XP_PER_WIN);
    await refreshBestRank(supabase, supabaseAdmin, data.winnerId);
    return { ok: true };
  });
