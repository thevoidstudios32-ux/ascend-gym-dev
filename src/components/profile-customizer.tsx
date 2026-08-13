import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, ImageIcon, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { saveAvatar, saveBanner } from "@/lib/profile-media.functions";
import { useBanners } from "@/hooks/use-banners";
import { CATEGORY_LABEL, RARITY_STYLE, type BannerCategory, type BannerStats, type Rarity } from "@/lib/banners";

const RARITY_FALLBACK = { color: "#9CA3AF", ring: "ring-white/15", label: "Common" };
const rarityStyle = (r: string) => RARITY_STYLE[r as Rarity] ?? RARITY_FALLBACK;


type Props = {
  open: boolean;
  onClose: () => void;
  currentAvatar: string | null;
  currentBanner: string | null;
  userId: string | null;
  stats: BannerStats;
  onSaved: () => void;
};


/** Recorta a imagem em um quadrado com zoom/offset e devolve um data URL webp leve. */
function renderCrop(img: HTMLImageElement, zoom: number, dx: number, dy: number, size = 320) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, size, size);
  const base = Math.min(img.width, img.height);
  const scale = (size / base) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2 + dx, (size - h) / 2 + dy, w, h);
  return canvas.toDataURL("image/webp", 0.82);
}

export function ProfileCustomizer({
  open,
  onClose,
  currentAvatar,
  currentBanner,
  userId,

  stats,
  onSaved,
}: Props) {
  const [tab, setTab] = useState<"foto" | "banner">("foto");
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const avatarFn = useServerFn(saveAvatar);
  const bannerFn = useServerFn(saveBanner);

  // Desbloqueio e catálogo vêm do servidor (inclui itens criados no Admin Panel).
  void userId;
  void stats;
  const { data: bannersData } = useBanners();
  const allBanners = bannersData?.banners ?? [];


  useEffect(() => {
    if (!open) {
      setSrc(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setTab("foto");
    }
  }, [open]);

  const saveAvatarM = useMutation({
    mutationFn: async () => {
      const img = imgRef.current;
      if (!img) throw new Error("Selecione uma imagem");
      const dataUrl = renderCrop(img, zoom, offset.x, offset.y);
      if (dataUrl.length > 290_000) throw new Error("Imagem muito grande, tente outra");
      return avatarFn({ data: { avatar_url: dataUrl } });
    },
    onSuccess: () => {
      toast.success("Foto de perfil atualizada!");
      setSrc(null);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAvatarM = useMutation({
    mutationFn: () => avatarFn({ data: { avatar_url: null } }),
    onSuccess: () => {
      toast.success("Foto removida");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const equipM = useMutation({
    mutationFn: (id: string) => bannerFn({ data: { banner_id: id } }),
    onSuccess: () => {
      toast.success("Banner equipado!");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!/image\/(jpeg|png|webp)/.test(file.type)) {
      toast.error("Use JPG, PNG ou WEBP");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(String(reader.result));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="animate-rise max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold uppercase tracking-widest">Personalizar</h2>
          <button onClick={onClose} className="press rounded-full bg-elevated p-2" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {(["foto", "banner"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
              }`}
            >
              {t === "foto" ? "Foto de perfil" : "Banner"}
            </button>
          ))}
        </div>

        {tab === "foto" ? (
          <div className="mt-5 space-y-4">
            <div className="flex justify-center">
              <div
                className="relative size-44 overflow-hidden rounded-full border border-border bg-elevated"
                onPointerDown={(e) => {
                  dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current || !src) return;
                  setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
                }}
                onPointerUp={() => (dragRef.current = null)}
              >
                {src ? (
                  <img
                    ref={imgRef}
                    src={src}
                    alt="Pré-visualização"
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                      width: "176px",
                      height: "auto",
                    }}
                  />
                ) : currentAvatar ? (
                  <img src={currentAvatar} alt="Foto atual" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </span>
                )}
              </div>
            </div>

            {src ? (
              <>
                <label className="block text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                  Zoom
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </label>
                <p className="text-center text-[11px] text-muted-foreground">
                  Arraste a imagem para ajustar o enquadramento
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSrc(null)}
                    className="flex-1 rounded-full border border-border py-3 text-sm font-bold text-muted-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveAvatarM.mutate()}
                    disabled={saveAvatarM.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
                  >
                    <Check className="size-4" />
                    {saveAvatarM.isPending ? "Salvando…" : "Confirmar"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="press flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
                  <Camera className="size-4" /> Escolher imagem
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>
                {currentAvatar ? (
                  <button
                    onClick={() => removeAvatarM.mutate()}
                    disabled={removeAvatarM.isPending}
                    className="rounded-full border border-border py-3 text-sm font-bold text-muted-foreground"
                  >
                    Remover foto
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {(["CORE", "FORGED", "LEGACY", "VOID"] as BannerCategory[]).map((cat) => {
              const list = allBanners.filter(
                (b) => b.category === cat && (b.category !== "VOID" || b.unlocked),
              );
              if (!list.length) return null;
              return (
                <div key={cat} className="space-y-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABEL[cat]}
                    {cat === "CORE"
                      ? " · grátis"
                      : cat === "FORGED"
                        ? " · desbloqueáveis"
                        : cat === "LEGACY"
                          ? " · homenagens"
                          : " · exclusivo"}
                  </p>
                  {list.map((b) => {
                    const unlocked = b.unlocked;
                    const equipped = (currentBanner ?? "throne-hall") === b.id;
                    const style = rarityStyle(b.rarity);

                    return (
                      <div
                        key={b.id}
                        className={`overflow-hidden rounded-2xl border border-border bg-elevated ring-1 ${style.ring}`}
                      >
                        <div className="relative h-24 w-full">
                          <img
                            src={b.url}
                            alt={b.name}
                            loading="lazy"
                            style={{ objectPosition: b.position ?? "center" }}
                            className={`size-full object-cover ${unlocked ? "" : "opacity-30 grayscale"}`}
                          />
                          {!unlocked ? (
                            <span className="absolute inset-0 grid place-items-center">
                              <Lock className="size-6 text-muted-foreground" />
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{b.name}</p>
                            <p
                              className="text-[10px] font-extrabold uppercase tracking-widest"
                              style={{ color: style.color }}
                            >
                              {style.label}
                            </p>
                            {!unlocked && b.requirement ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{b.requirement.label}</p>
                            ) : null}
                          </div>
                          <button
                            disabled={!unlocked || equipped || equipM.isPending}
                            onClick={() => equipM.mutate(b.id)}
                            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                              equipped
                                ? "bg-elevated text-muted-foreground"
                                : unlocked
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-elevated text-muted-foreground"
                            } disabled:opacity-60`}
                          >
                            {equipped ? "Em uso" : unlocked ? "Usar" : "Bloqueado"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
