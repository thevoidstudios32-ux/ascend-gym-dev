import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode, Check, Images, Loader2, X, Zap } from "lucide-react";

type DetectedBarcode = { rawValue: string };
type DetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

function getDetector(): DetectorLike | null {
  const Ctor = (
    window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => DetectorLike }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: FORMATS });
  } catch {
    try {
      return new Ctor();
    } catch {
      return null;
    }
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(pattern);
}

export type BarcodeScannerProps = {
  /** Chamado com o código lido (apenas dígitos). */
  onCode: (code: string) => void | Promise<void>;
  /** Fallback: nenhuma leitura nativa disponível → envia a foto para a IA. */
  onPhoto?: (file: File) => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
};

export function BarcodeScanner({ onCode, onPhoto, onClose, busy = false }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const lockRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [supported, setSupported] = useState(true);

  /* --------------------------- câmera --------------------------- */
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        trackRef.current = s.getVideoTracks()[0] ?? null;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        setReady(true);
      })
      .catch(() => setError("Não foi possível acessar a câmera. Use a galeria abaixo."));

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, []);

  /* ------------------------ leitura contínua ------------------------ */
  const accept = useCallback(
    async (raw: string) => {
      const code = raw.replace(/\D/g, "");
      if (!code || lockRef.current) return;
      lockRef.current = true;
      setFound(code);
      vibrate([30, 40, 30]);
      await onCode(code);
    },
    [onCode],
  );

  useEffect(() => {
    if (!ready) return;
    const detector = getDetector();
    if (!detector) {
      setSupported(false);
      return;
    }
    let alive = true;
    const id = window.setInterval(async () => {
      const video = videoRef.current;
      if (!alive || !video || !video.videoWidth || lockRef.current) return;
      try {
        const results = await detector.detect(video);
        const hit = results.find((r) => r.rawValue && /\d{6,}/.test(r.rawValue));
        if (hit) await accept(hit.rawValue);
      } catch {
        /* frame ignorado */
      }
    }, 250);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [ready, accept]);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] } as MediaTrackConstraints);
      setTorch((t) => !t);
    } catch {
      /* dispositivo sem lanterna */
    }
  }

  async function shootForAi() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !onPhoto) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (!blob) return;
    lockRef.current = true;
    await onPhoto(new File([blob], `barcode-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  return (
    <div className="animate-zoom-in fixed inset-0 z-[95] flex flex-col bg-black">
      <header className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
            <Barcode className="size-4" /> Escanear código de barras
          </h2>
          <p className="text-[11px] text-white/60">
            {error ?? (found ? "Código encontrado!" : "Alinhe o código dentro da moldura")}
          </p>
        </div>
        {ready ? (
          <button
            onClick={() => void toggleTorch()}
            aria-label="Lanterna"
            className={`press rounded-full p-2 ${torch ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"}`}
          >
            <Zap className="size-4" />
          </button>
        ) : null}
        <button onClick={onClose} aria-label="Fechar" className="press rounded-full bg-white/10 p-2 text-white">
          <X className="size-4" />
        </button>
      </header>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-neutral-950">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />

        {/* máscara escura + moldura */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-black/55" />
          <div
            className={`absolute left-1/2 top-1/2 h-[38%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-colors duration-200 ${
              found ? "ring-4 ring-emerald-500" : "ring-2 ring-white/70"
            }`}
          >
            {/* cantos */}
            {[
              "left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
              "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
              "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl",
              "right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl",
            ].map((c) => (
              <span
                key={c}
                className={`absolute size-9 ${c} ${found ? "border-emerald-500" : "border-primary"}`}
              />
            ))}
            {!found ? (
              <span className="animate-scanline absolute inset-x-3 h-[3px] rounded-full bg-primary shadow-[0_0_14px_3px_rgba(220,38,38,0.8)]" />
            ) : (
              <span className="animate-pop absolute inset-0 grid place-items-center text-emerald-400">
                <Check className="size-14" />
              </span>
            )}
          </div>
        </div>

        {found ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/90 to-transparent p-5">
            <span className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-extrabold text-black">
              {found}
            </span>
            {busy ? <Loader2 className="size-4 animate-spin text-white" /> : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4 pb-8">
        {!supported ? (
          <p className="text-center text-[11px] text-white/60">
            Seu navegador não lê códigos automaticamente — tire uma foto que a IA identifica.
          </p>
        ) : null}
        <div className="flex items-center justify-center gap-3">
          <label className="press flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-bold text-white">
            <Images className="size-4" /> Galeria
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && onPhoto) void onPhoto(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() => void shootForAi()}
            disabled={!ready || busy}
            className="press flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Barcode className="size-4" />}
            Ler com a IA
          </button>
        </div>
      </div>
    </div>
  );
}
