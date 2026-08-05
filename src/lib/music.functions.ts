import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  preview: string | null;
};

/** Busca músicas (prévias de 30s) para trilhar os Stories. */
export const searchMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().min(1).max(60) }).parse(data))
  .handler(async ({ data }): Promise<Track[]> => {
    const url = `https://itunes.apple.com/search?media=music&limit=12&country=BR&term=${encodeURIComponent(data.q)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Busca de músicas indisponível agora.");
    const json = (await res.json()) as {
      results?: {
        trackId?: number;
        trackName?: string;
        artistName?: string;
        artworkUrl100?: string;
        previewUrl?: string;
      }[];
    };
    return (json.results ?? [])
      .filter((r) => r.trackName && r.previewUrl)
      .map((r) => ({
        id: String(r.trackId ?? r.trackName),
        title: r.trackName!,
        artist: r.artistName ?? "",
        artwork: r.artworkUrl100 ?? null,
        preview: r.previewUrl ?? null,
      }));
  });
