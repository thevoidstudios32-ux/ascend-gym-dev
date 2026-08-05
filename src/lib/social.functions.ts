import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSocialSnapshot, generateNudges } from "@/lib/social.server";
import { z } from "zod";

export const getSocial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildSocialSnapshot(context.supabase, context.userId));

export const searchBros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().max(40) }).parse(data))
  .handler(async ({ context, data }) => {
    // Remove PostgREST filter metacharacters (, . ( ) * \ %) to avoid filter injection.
    const q = data.q.trim().replace(/^@/, "").replace(/[^\p{L}\p{N} _-]/gu, "");
    if (q.length < 2) return [];
    const { data: rows } = await context.supabase
      .from("profiles")
      .select("id,name,username,avatar_url,bio,gym,goal,xp")
      .or(`name.ilike.%${q}%,username.ilike.%${q}%`)

      .neq("id", context.userId)
      .limit(20);
    return rows ?? [];
  });

export const requestBro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("friendships").insert({
      requester_id: context.userId,
      addressee_id: data.userId,
      status: "pending",
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const respondBro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    // Somente o destinatário pode aceitar/recusar um pedido.
    const { data: rows, error } = await context.supabase
      .from("friendships")
      .update({ status: data.accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("addressee_id", context.userId)
      .eq("status", "pending")
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("Pedido de amizade inválido.");
    return { ok: true };
  });


export const removeBro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("friendships").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.string().max(20).default("text"),
        content: z.string().min(1).max(500),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("posts").insert({
      user_id: context.userId,
      kind: data.kind,
      content: data.content,
      meta: (data.meta ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase.from("posts").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ postId: z.string().uuid(), emoji: z.string().max(12) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const existing = await context.supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .eq("emoji", data.emoji)
      .maybeSingle();
    if (existing.data) {
      await context.supabase.from("post_reactions").delete().eq("id", existing.data.id);
      return { on: false };
    }
    const { error } = await context.supabase
      .from("post_reactions")
      .insert({ post_id: data.postId, user_id: context.userId, emoji: data.emoji });
    if (error) throw new Error(error.message);
    return { on: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ postId: z.string().uuid(), content: z.string().min(1).max(300) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("post_comments")
      .insert({ post_id: data.postId, user_id: context.userId, content: data.content });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSocialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        username: z
          .string()
          .regex(/^[a-z0-9_.]{3,20}$/, "use 3-20 letras minúsculas, números, _ ou .")
          .nullable(),
        bio: z.string().max(200).nullable(),
        gym: z.string().max(60).nullable(),
        avatar_url: z.string().url().max(400).nullable(),
        training_since: z.string().nullable(),
        is_public: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message.includes("duplicate") ? "Esse @username já existe." : error.message);
    return { ok: true };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ broId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [msgs, bro] = await Promise.all([
      supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${data.broId}),and(sender_id.eq.${data.broId},recipient_id.eq.${userId})`,
        )
        .order("created_at")
        .limit(200),
      supabase
        .from("profiles")
        .select("id,name,username,avatar_url,gym,goal,xp")
        .eq("id", data.broId)
        .maybeSingle(),
    ]);
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("sender_id", data.broId)
      .is("read_at", null);
    return { messages: msgs.data ?? [], bro: bro.data };
  });

export const sendDm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        broId: z.string().uuid(),
        content: z.string().min(1).max(1000),
        attachment: z.record(z.string(), z.unknown()).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("direct_messages").insert({
      sender_id: context.userId,
      recipient_id: data.broId,
      content: data.content,
      attachment: (data.attachment ?? null) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().min(2).max(60),
        metric: z.string().max(20),
        days: z.number().int().min(1).max(90),
        invitees: z.array(z.string().uuid()).max(20),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const ends = new Date(Date.now() + data.days * 86400000).toISOString().slice(0, 10);
    const { data: row, error } = await context.supabase
      .from("challenges")
      .insert({
        owner_id: context.userId,
        title: data.title,
        metric: data.metric,
        ends_on: ends,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("challenge_participants").insert(
      [context.userId, ...data.invitees].map((user_id) => ({ challenge_id: row.id, user_id })),
    );
    return { ok: true };
  });

export const leaveChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("challenge_participants")
      .delete()
      .eq("challenge_id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const getBroNudges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => generateNudges(context.supabase, context.userId));

/** Contadores para os badges de notificação da aba Gym Bros. */
export const getSocialBadge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [dms, requests] = await Promise.all([
      supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", userId)
        .eq("status", "pending"),
    ]);
    const messages = dms.count ?? 0;
    const invites = requests.count ?? 0;
    return { messages, invites, total: messages + invites };
  });
