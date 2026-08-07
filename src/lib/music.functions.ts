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

async function fetchJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "ASCEND/1.0 (stories music search)" },
    });
    // 429 é recuperável: deixamos o próximo provedor tentar em vez de abortar a busca.
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error(`upstream_${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Cache de resultados por termo (mesma instância de servidor) para poupar o upstream. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; tracks: Track[] }>();

function readCache(key: string): Track[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.tracks;
}

async function fromItunes(q: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?media=music&limit=15&country=BR&term=${encodeURIComponent(q)}`;
  const json = (await fetchJson(url)) as {
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
      id: `it_${r.trackId ?? r.trackName}`,
      title: r.trackName!,
      artist: r.artistName ?? "",
      artwork: r.artworkUrl100 ? r.artworkUrl100.replace("100x100", "200x200") : null,
      preview: r.previewUrl ?? null,
    }));
}

async function fromDeezer(q: string): Promise<Track[]> {
  const url = `https://api.deezer.com/search?limit=15&q=${encodeURIComponent(q)}`;
  const json = (await fetchJson(url)) as {
    data?: {
      id?: number;
      title?: string;
      preview?: string;
      artist?: { name?: string };
      album?: { cover_medium?: string };
    }[];
  };
  return (json.data ?? [])
    .filter((r) => r.title && r.preview)
    .map((r) => ({
      id: `dz_${r.id ?? r.title}`,
      title: r.title!,
      artist: r.artist?.name ?? "",
      artwork: r.album?.cover_medium ?? null,
      preview: r.preview ?? null,
    }));
}

/** Busca músicas (prévias de 30s) para trilhar os Stories. iTunes com fallback Deezer. */
export const searchMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().min(1).max(60) }).parse(data))
  .handler(async ({ data }): Promise<Track[]> => {
    const q = data.q.trim();
    if (!q) return [];

    const key = q.toLowerCase();
    const cached = readCache(key);
    if (cached) return cached;

    const errors: string[] = [];
    for (const provider of [fromItunes, fromDeezer]) {
      try {
        const tracks = await provider(q);
        if (tracks.length > 0) {
          cache.set(key, { at: Date.now(), tracks });
          return tracks;
        }
        errors.push("sem resultados");
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "erro desconhecido");
      }
    }

    if (errors.every((e) => e === "sem resultados")) {
      cache.set(key, { at: Date.now(), tracks: [] });
      return [];
    }
    if (errors.every((e) => e === "rate_limited"))
      throw new Error("Muitas buscas seguidas. Aguarde alguns segundos e tente de novo.");
    if (errors.some((e) => e.includes("abort")))
      throw new Error("A busca demorou demais. Verifique sua conexão e tente de novo.");
    throw new Error("Serviço de músicas indisponível no momento. Tente novamente em instantes.");
  });
