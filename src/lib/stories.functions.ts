import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Lista os stories ativos (24h) do usuário e dos gym bros aceitos. */
export const getStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();

    const { data: rows } = await supabase
      .from("stories")
      .select("*")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(200);

    const stories = rows ?? [];
    const ids = stories.map((s) => s.id);
    const authors = [...new Set(stories.map((s) => s.user_id))];

    const [viewsRes, profilesRes] = await Promise.all([
      ids.length
        ? supabase.from("story_views").select("*").in("story_id", ids)
        : Promise.resolve({ data: [] as never[] }),
      authors.length
        ? supabase.from("profiles").select("id,name,username,avatar_url,xp").in("id", authors)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const media: Record<string, string> = {};
    for (const s of stories) {
      if (!s.media_path) continue;
      const { data } = await supabase.storage.from("stories").createSignedUrl(s.media_path, 3600);
      if (data?.signedUrl) media[s.id] = data.signedUrl;
    }

    return {
      me: userId,
      stories,
      views: viewsRes.data ?? [],
      profiles: profilesRes.data ?? [],
      media,
    };
  });

export const createStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.string().max(20).default("text"),
        content: z.string().max(300).nullable().optional(),
        media_path: z.string().max(300).nullable().optional(),
        media_type: z.string().max(20).nullable().optional(),
        sticker: z.string().max(20).nullable().optional(),
        bg: z.string().max(20).default("ember"),
        location: z.string().max(80).nullable().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    if (data.media_path && !data.media_path.startsWith(`${context.userId}/`)) {
      throw new Error("Caminho de mídia inválido.");
    }
    if (!data.content?.trim() && !data.media_path) throw new Error("Escreva algo ou envie uma mídia.");

    const { error } = await context.supabase.from("stories").insert({
      user_id: context.userId,
      kind: data.kind,
      content: data.content ?? null,
      media_path: data.media_path ?? null,
      media_type: data.media_type ?? null,
      sticker: data.sticker ?? null,
      bg: data.bg,
      location: data.location ?? null,
      meta: (data.meta ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: story } = await context.supabase
      .from("stories")
      .select("media_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (story?.media_path) await context.supabase.storage.from("stories").remove([story.media_path]);
    await context.supabase.from("stories").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

/** Marca como visto e/ou aplica uma reação (emoji). Reagir de novo com o mesmo emoji remove. */
export const viewStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        storyId: z.string().uuid(),
        reaction: z.string().max(8).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("story_views")
      .select("id,reaction")
      .eq("story_id", data.storyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("story_views").insert({
        story_id: data.storyId,
        user_id: userId,
        reaction: data.reaction ?? null,
      });
      return { reaction: data.reaction ?? null };
    }

    if (data.reaction !== undefined) {
      const next = existing.reaction === data.reaction ? null : (data.reaction ?? null);
      await supabase.from("story_views").update({ reaction: next }).eq("id", existing.id);
      return { reaction: next };
    }
    return { reaction: existing.reaction };
  });
