import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, Heart, Loader2, Music, Pause, Play, Plus, Search, Send, Share2, Trash2, Type, Video, Volume2, VolumeX, X } from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";
import { searchMusic, type Track } from "@/lib/music.functions";
import { supabase } from "@/integrations/supabase/client";
import { BroAvatar } from "@/components/bro";
import { createStory, deleteStory, getStories, viewStory } from "@/lib/stories.functions";
import { sendDm } from "@/lib/social.functions";
import {
  backgroundCss,
  hoursLeft,
  MOTIVATION_QUOTES,
  STORY_BACKGROUNDS,
  STORY_DURATION_MS,
  STORY_REACTIONS,
  STORY_STICKERS,
  stickerOf,
} from "@/lib/stories";

type StoryRow = {
  id: string;
  user_id: string;
  kind: string;
  content: string | null;
  media_path: string | null;
  media_type: string | null;
  sticker: string | null;
  bg: string | null;
  location: string | null;
  created_at: string;
  expires_at: string;
  meta?: Record<string, unknown> | null;

};

type MiniProfile = { id: string; name: string; username: string | null; avatar_url: string | null; xp: number };

export function useStories() {
  const fetcher = useServerFn(getStories);
  return useQuery({ queryKey: ["stories"], queryFn: () => fetcher(), staleTime: 30_000 });
}

function haptic(ms = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(ms);
}

/* ------------------------------- Row ------------------------------- */

export function StoriesRow({ preset }: { preset?: StoryDraft | null }) {
  const { data, isLoading } = useStories();
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (preset) setComposing(true);
  }, [preset]);

  const groups = useMemo(() => {
    if (!data) return [] as { userId: string; stories: StoryRow[]; unseen: boolean }[];
    const map = new Map<string, StoryRow[]>();
    for (const s of data.stories as StoryRow[]) {
      map.set(s.user_id, [...(map.get(s.user_id) ?? []), s]);
    }
    const seen = new Set(
      (data.views as { story_id: string; user_id: string }[])
        .filter((v) => v.user_id === data.me)
        .map((v) => v.story_id),
    );
    return [...map.entries()]
      .map(([userId, stories]) => ({
        userId,
        stories,
        unseen: stories.some((s) => !seen.has(s.id)),
      }))
      .sort((a, b) => (a.userId === data.me ? -1 : b.userId === data.me ? 1 : Number(b.unseen) - Number(a.unseen)));
  }, [data]);

  const profileOf = (id: string) =>
    (data?.profiles as MiniProfile[] | undefined)?.find((p) => p.id === id);

  const mine = groups.find((g) => g.userId === data?.me);
  const others = groups.filter((g) => g.userId !== data?.me);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton size-16 rounded-full" />
            <div className="skeleton mx-auto h-2.5 w-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => (mine ? setOpenUser(data!.me) : setComposing(true))}
          className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="relative">
            <span
              className={`grid place-items-center rounded-full p-[2.5px] ${
                mine?.unseen ? "story-ring" : "bg-border"
              }`}
            >
              <span className="rounded-full bg-background p-[2px]">
                <BroAvatar profile={profileOf(data?.me ?? "")} size="md" />
              </span>
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
              <Plus className="size-3" />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px] font-semibold">Seu story</span>
        </button>

        {others.map((g) => (
          <button
            key={g.userId}
            onClick={() => setOpenUser(g.userId)}
            className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`grid place-items-center rounded-full p-[2.5px] ${
                g.unseen ? "story-ring" : "bg-border"
              }`}
            >
              <span className="rounded-full bg-background p-[2px]">
                <BroAvatar profile={profileOf(g.userId)} size="md" />
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] font-semibold text-muted-foreground">
              {profileOf(g.userId)?.name?.split(" ")[0] ?? "Bro"}
            </span>
          </button>
        ))}

        {others.length === 0 && (
          <div className="flex items-center pl-1 text-xs text-muted-foreground">
            Seus bros ainda não postaram stories hoje.
          </div>
        )}
      </div>

      {openUser && (
        <StoryViewer
          userId={openUser}
          onClose={() => setOpenUser(null)}
          onNextUser={(dir) => {
            const order = [...(mine ? [mine] : []), ...others];
            const idx = order.findIndex((g) => g.userId === openUser);
            const next = order[idx + dir];
            setOpenUser(next ? next.userId : null);
          }}
        />
      )}

      {composing && <StoryComposer preset={preset ?? null} onClose={() => setComposing(false)} />}
    </>
  );
}

/* ------------------------------ Viewer ------------------------------ */

function StoryViewer({
  userId,
  onClose,
  onNextUser,
}: {
  userId: string;
  onClose: () => void;
  onNextUser: (dir: number) => void;
}) {
  const qc = useQueryClient();
  const { data } = useStories();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [reply, setReply] = useState("");
  const startY = useRef<number | null>(null);

  const stories = useMemo(
    () => ((data?.stories ?? []) as StoryRow[]).filter((s) => s.user_id === userId),
    [data, userId],
  );
  const story = stories[index];
  const profile = (data?.profiles as MiniProfile[] | undefined)?.find((p) => p.id === userId);
  const isMine = data?.me === userId;
  const mediaUrl = story ? (data?.media as Record<string, string>)[story.id] : undefined;

  const myView = (data?.views as { story_id: string; user_id: string; reaction: string | null }[] | undefined)?.find(
    (v) => v.story_id === story?.id && v.user_id === data?.me,
  );

  const mark = useServerFn(viewStory);
  const react = useMutation({
    mutationFn: (input: { storyId: string; reaction?: string | null }) => mark({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
  const remove = useServerFn(deleteStory);
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story apagado.");
      onClose();
    },
  });
  const dm = useServerFn(sendDm);
  const replyMutation = useMutation({
    mutationFn: (content: string) => dm({ data: { broId: userId, content } }),
    onSuccess: () => {
      setReply("");
      toast.success("Resposta enviada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const advance = useCallback(
    (dir: number) => {
      setProgress(0);
      setIndex((i) => {
        const next = i + dir;
        if (next < 0) {
          onNextUser(-1);
          return i;
        }
        if (next >= stories.length) {
          onNextUser(1);
          return i;
        }
        return next;
      });
    },
    [stories.length, onNextUser],
  );

  useEffect(() => {
    if (story && !myView) react.mutate({ storyId: story.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  useEffect(() => {
    if (paused || !story) return;
    const step = 60;
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + (step / STORY_DURATION_MS) * 100;
        if (next >= 100) {
          advance(1);
          return 0;
        }
        return next;
      });
    }, step);
    return () => clearInterval(t);
  }, [paused, story, advance]);

  if (!story) return null;

  const sticker = stickerOf(story.sticker);
  const music = (story.meta as { music?: StoryMusic } | null | undefined)?.music ?? null;


  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black"
      style={{ transform: `translateY(${dragY}px)`, opacity: 1 - dragY / 500 }}
      onTouchStart={(e) => {
        startY.current = e.touches[0]?.clientY ?? null;
        setPaused(true);
      }}
      onTouchMove={(e) => {
        if (startY.current === null) return;
        const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
        if (dy > 0) setDragY(dy);
      }}
      onTouchEnd={() => {
        setPaused(false);
        if (dragY > 110) onClose();
        setDragY(0);
        startY.current = null;
      }}
    >
      <div className="relative flex-1 overflow-hidden">
        <div
          className="animate-zoom-in absolute inset-0"
          style={{ background: story.media_path ? "#000" : backgroundCss(story.bg) }}
        >
          {mediaUrl && story.media_type?.startsWith("video") ? (
            <video src={mediaUrl} autoPlay muted playsInline loop className="size-full object-contain" />
          ) : mediaUrl ? (
            <img src={mediaUrl} alt="Story" className="size-full object-contain" />
          ) : null}

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
            {sticker && !mediaUrl && <span className="text-6xl drop-shadow-lg">{sticker.icon}</span>}
            {story.content && (
              <p
                className={`text-balance font-extrabold leading-tight text-white drop-shadow-lg ${
                  mediaUrl ? "mt-auto mb-24 text-xl" : "text-3xl"
                }`}
              >
                {story.content}
              </p>
            )}
            {sticker && mediaUrl && (
              <span className="mb-24 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold text-white">
                {sticker.icon} {sticker.label}
              </span>
            )}
          </div>
        </div>

        {/* zonas de toque */}
        <button
          className="absolute inset-y-0 left-0 w-1/3"
          aria-label="Story anterior"
          onClick={() => advance(-1)}
        />
        <button
          className="absolute inset-y-0 right-0 w-1/3"
          aria-label="Próximo story"
          onClick={() => advance(1)}
        />

        {/* topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3 pb-10">
          <div className="flex gap-1">
            {stories.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full bg-white transition-[width] duration-75 ease-linear"
                  style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }}
                />
              </span>
            ))}
          </div>
          <div className="pointer-events-auto mt-3 flex items-center gap-3">
            <BroAvatar profile={profile} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{profile?.name ?? "Gym Bro"}</p>
              <p className="text-[11px] text-white/60">
                {hoursLeft(story.expires_at)}h restantes
                {story.location ? ` · 📍 ${story.location}` : ""}
              </p>
            </div>
            {isMine && (
              <button
                onClick={() => del.mutate(story.id)}
                className="press rounded-full bg-white/10 p-2 text-white"
                aria-label="Apagar story"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button onClick={onClose} className="press rounded-full bg-white/10 p-2 text-white" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* rodapé */}
      <div className="space-y-3 bg-black p-4 pb-6">
        <div className="flex flex-wrap justify-center gap-2">
          {STORY_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                haptic();
                react.mutate({ storyId: story.id, reaction: emoji });
              }}
              className={`press rounded-full px-3 py-1.5 text-lg ${
                myView?.reaction === emoji ? "animate-pop bg-primary/25" : "bg-white/10"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic();
              react.mutate({ storyId: story.id, reaction: "❤️" });
            }}
            className="press rounded-full bg-white/10 p-3"
            aria-label="Curtir story"
          >
            <Heart className={`size-4 ${myView?.reaction === "❤️" ? "fill-primary text-primary" : "text-white"}`} />
          </button>
          {!isMine && (
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder="Responder…"
              className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
            />
          )}
          {!isMine && (
            <button
              disabled={!reply.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate(reply.trim())}
              className="press rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"
              aria-label="Enviar resposta"
            >
              <Send className="size-4" />
            </button>
          )}
          <button
            onClick={async () => {
              const text = `${profile?.name ?? "Gym Bro"} no ASCEND: ${story.content ?? "confere esse story!"}`;
              if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share({ title: "ASCEND", text }).catch(() => {});
              } else {
                await navigator.clipboard?.writeText(text);
                toast.success("Story copiado!");
              }
            }}
            className="press ml-auto rounded-full bg-white/10 p-3 text-white"
            aria-label="Compartilhar"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Composer ----------------------------- */

export type StoryDraft = {
  kind: string;
  content: string;
  sticker?: string | null;
  bg?: string;
};

export function StoryComposer({ preset, onClose }: { preset: StoryDraft | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(preset?.content ?? "");
  const [kind, setKind] = useState(preset?.kind ?? "text");
  const [sticker, setSticker] = useState<string | null>(preset?.sticker ?? null);
  const [bg, setBg] = useState(preset?.bg ?? "ember");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [track, setTrack] = useState<StoryMusic | null>(null);

  const create = useServerFn(createStory);
  const publish = useMutation({
    mutationFn: async () => {
      let media_path: string | null = null;
      let media_type: string | null = null;
      if (file) {
        setUploading(true);
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("Sessão expirada.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        media_path = `${uid}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("stories").upload(media_path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        media_type = file.type;
      }
      return create({
        data: {
          kind: file ? (file.type.startsWith("video") ? "video" : "photo") : kind,
          content: text.trim() || null,
          media_path,
          media_type,
          sticker,
          bg,
          location: location.trim() || null,
          meta: track
            ? {
                music: {
                  title: track.title,
                  artist: track.artist,
                  artwork: track.artwork,
                  preview: track.preview,
                  start: track.start,
                  volume: track.volume,
                },
              }
            : {},

        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story publicado! Some em 24h ⏳");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  function choose(f: File | null) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 25MB).");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <header className="flex items-center gap-3 p-4">
        <h2 className="flex-1 text-lg font-extrabold text-white">Criar Story</h2>
        <button onClick={onClose} className="press rounded-full bg-white/10 p-2 text-white" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </header>

      <div
        className="animate-zoom-in relative mx-4 flex flex-1 items-center justify-center overflow-hidden rounded-3xl"
        style={{ background: file ? "#111" : backgroundCss(bg) }}
      >
        {previewUrl && file?.type.startsWith("video") ? (
          <video src={previewUrl} className="size-full object-contain" autoPlay muted loop playsInline />
        ) : previewUrl ? (
          <img src={previewUrl} alt="Prévia" className="size-full object-contain" />
        ) : null}

        {track ? (
          <div className="absolute left-4 top-4 flex max-w-[70%] items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
            {track.artwork ? (
              <img src={track.artwork} alt="" className="size-6 rounded-md" />
            ) : (
              <Music className="size-4 text-white" />
            )}
            <span className="truncate text-[11px] font-bold text-white">
              {track.title} · {track.artist}
            </span>
          </div>
        ) : null}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {sticker && <span className="text-5xl drop-shadow">{stickerOf(sticker)?.icon}</span>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            placeholder="Escreva algo…"
            rows={4}
            className="w-full resize-none bg-transparent text-center text-2xl font-extrabold text-white outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setCamera(true)}
            className="press flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-bold text-white"
          >
            <Camera className="size-4" /> Câmera
          </button>
          <label className="press flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-bold text-white">
            <Plus className="size-4" /> Galeria
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => choose(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="press flex cursor-pointer flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-bold text-white">
            <Video className="size-4" /> Vídeo
            <input
              type="file"
              accept="video/*"
              capture="user"
              className="hidden"
              onChange={(e) => choose(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={() => {
              setFile(null);
              setPreviewUrl(null);
              setKind("quote");
              setText(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]!);
            }}
            className="press flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-[11px] font-bold text-white"
          >
            <Type className="size-4" /> Frase
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STORY_STICKERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSticker(sticker === s.id ? null : s.id)}
              className={`press shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                sticker === s.id ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {!file && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STORY_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBg(b.id)}
                aria-label={b.label}
                className={`press size-9 shrink-0 rounded-full ${bg === b.id ? "ring-2 ring-primary ring-offset-2 ring-offset-black" : ""}`}
                style={{ background: b.css }}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {["🔥", "💪", "😤", "🏆", "⚡", "🥩", "😮‍💨", "🫡", "🐐"].map((e) => (
            <button
              key={e}
              onClick={() => setText((t) => (t + " " + e).slice(0, 300))}
              className="press shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-base"
            >
              {e}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMusicOpen(true)}
          className="press flex w-full items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
        >
          <Music className="size-4" />
          <span className="min-w-0 flex-1 truncate text-left">
            {track ? `${track.title} · ${track.artist}` : "Adicionar música"}
          </span>
          {track ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(ev) => {
                ev.stopPropagation();
                setTrack(null);
              }}
              onKeyDown={(ev) => ev.key === "Enter" && setTrack(null)}
              className="rounded-full bg-white/10 p-1"
              aria-label="Remover música"
            >
              <X className="size-3" />
            </span>
          ) : null}
        </button>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="📍 Marcar local (opcional)"
          className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
        />

        <button
          onClick={() => publish.mutate()}
          disabled={publish.isPending || uploading || (!text.trim() && !file)}
          className="press flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {publish.isPending || uploading ? <Loader2 className="size-4 animate-spin" /> : null}
          Publicar story
        </button>
      </div>

      {camera ? (
        <CameraCapture
          title="Foto do story"
          hint="Mostre o treino, o shape ou o momento."
          allowBurst={false}
          onClose={() => setCamera(false)}
          onUse={(f) => {
            choose(f);
            setCamera(false);
          }}
        />
      ) : null}

      {musicOpen ? (
        <MusicPicker
          onClose={() => setMusicOpen(false)}
          onPick={(t) => {
            setTrack(t);
            setMusicOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ Música ------------------------------ */

export type StoryMusic = {
  title: string;
  artist: string;
  artwork: string | null;
  preview: string | null;
  /** Trecho escolhido (segundos dentro da prévia de 30s). */
  start: number;
  /** Volume 0–1. */
  volume: number;
};

const CLIP_MAX = 30;

function MusicPicker({ onClose, onPick }: { onClose: () => void; onPick: (m: StoryMusic) => void }) {
  const search = useServerFn(searchMusic);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [duration, setDuration] = useState(CLIP_MAX);
  const [position, setPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function run() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await search({ data: { q: q.trim() } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Busca indisponível.");
    } finally {
      setLoading(false);
    }
  }

  const play = useCallback(async (from: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.volume = volume;
      if (Number.isFinite(audio.duration) && from < audio.duration) audio.currentTime = from;
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      toast.error("Não foi possível tocar a prévia. Verifique o volume do aparelho e tente de novo.");
    }
  }, [volume]);

  function choose(t: Track) {
    if (!t.preview) {
      toast.error("Esta faixa não tem prévia disponível.");
      return;
    }
    setSelected(t);
    setStart(0);
    setPosition(0);
    setPlaying(false);
    // O <audio> troca de src no próximo render; tocamos no onLoadedMetadata.
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <div className="fixed inset-0 z-[92] flex items-end bg-black/70 backdrop-blur-sm">
      <div className="animate-sheet-up max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-neutral-950 p-5">
        <div className="flex items-center gap-3">
          <h3 className="flex-1 text-lg font-extrabold text-white">Música</h3>
          <button
            onClick={() => {
              audioRef.current?.pause();
              onClose();
            }}
            aria-label="Fechar"
            className="press rounded-full bg-white/10 p-2 text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void run()}
            placeholder="Buscar artista ou faixa…"
            className="min-w-0 flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
          />
          <button
            onClick={() => void run()}
            className="press grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
            aria-label="Buscar"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </button>
        </div>

        {/* player do trecho selecionado */}
        {selected ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              {selected.artwork ? (
                <img src={selected.artwork} alt="" className="size-12 rounded-xl" />
              ) : (
                <span className="grid size-12 place-items-center rounded-xl bg-white/10 text-white">
                  <Music className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{selected.title}</p>
                <p className="truncate text-[11px] text-white/50">{selected.artist}</p>
              </div>
              <button
                onClick={() => {
                  if (playing) {
                    audioRef.current?.pause();
                    setPlaying(false);
                  } else {
                    void play(start);
                  }
                }}
                aria-label={playing ? "Pausar" : "Tocar"}
                className="press grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </div>

            <audio
              ref={audioRef}
              src={selected.preview ?? undefined}
              preload="auto"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                setDuration(Number.isFinite(d) ? d : CLIP_MAX);
                void play(start);
              }}
              onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
              onEnded={() => setPlaying(false)}
              onError={() => {
                setPlaying(false);
                toast.error("Prévia indisponível para esta faixa.");
              }}
            />

            <label className="block text-[11px] font-bold text-white/70">
              Trecho: começa em {Math.round(start)}s
              <input
                type="range"
                min={0}
                max={Math.max(0, Math.floor(duration) - 5)}
                step={1}
                value={start}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStart(v);
                  void play(v);
                }}
                className="mt-1 w-full accent-[#DC2626]"
              />
            </label>

            <div className="h-1 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${Math.min(100, (position / (duration || 1)) * 100)}%` }}
              />
            </div>

            <label className="flex items-center gap-2 text-[11px] font-bold text-white/70">
              <Volume2 className="size-3.5" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-[#DC2626]"
              />
              {Math.round(volume * 100)}%
            </label>

            <button
              onClick={() => {
                audioRef.current?.pause();
                onPick({
                  title: selected.title,
                  artist: selected.artist,
                  artwork: selected.artwork,
                  preview: selected.preview,
                  start,
                  volume,
                });
              }}
              className="press w-full rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground"
            >
              Usar este trecho
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => choose(t)}
              className={`press flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ${
                selected?.id === t.id ? "bg-primary/20" : "bg-white/5"
              }`}
            >
              {t.artwork ? (
                <img src={t.artwork} alt="" className="size-11 rounded-xl" />
              ) : (
                <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-white">
                  <Music className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">{t.title}</span>
                <span className="block truncate text-[11px] text-white/50">
                  {t.artist} · {t.preview ? "tocar prévia" : "sem prévia"}
                </span>
              </span>
              <Play className="size-4 shrink-0 text-white/60" />
            </button>
          ))}
          {!loading && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/50">
              Busque uma faixa para embalar seu story.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

