import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Images,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Timer,
  X,
  Zap,
} from "lucide-react";

/** Feedback de alinhamento calculado a partir do frame. */
type Align = { score: number; stable: boolean };

const TIMERS = [0, 3, 5, 10] as const;

function beep(freq = 880, ms = 90) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      void ctx.close();
    }, ms);
  } catch {
    /* silencioso */
  }
}

function vibrate(ms: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(ms);
}

export type CameraCaptureProps = {
  title: string;
  hint?: string;
  /** Path SVG (viewBox 0 0 100 150) usado como guia de pose. */
  silhouette?: string;
  /** Permite burst de 3 fotos. */
  allowBurst?: boolean;
  onClose: () => void;
  onUse: (file: File) => void | Promise<void>;
  busy?: boolean;
};

export function CameraCapture({
  title,
  hint,
  silhouette,
  allowBurst = true,
  onClose,
  onUse,
  busy = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrame = useRef<Uint8ClampedArray | null>(null);
  const goodFrames = useRef(0);
  const countdownRef = useRef<number | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [burst, setBurst] = useState(false);
  const [auto, setAuto] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [align, setAlign] = useState<Align>({ score: 0, stable: false });
  const [shots, setShots] = useState<{ url: string; file: File }[]>([]);
  const [picked, setPicked] = useState(0);

  /* ------------------------------ stream ------------------------------ */
  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    setReady(false);
    setError(null);

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1440 }, height: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
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
    };
  }, [facing]);

  /* --------------------- análise de enquadramento --------------------- */
  useEffect(() => {
    if (!ready || shots.length) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = (sampleRef.current ??= document.createElement("canvas"));
      if (!video || !video.videoWidth) return;
      canvas.width = 48;
      canvas.height = 64;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 48, 64);
      const frame = ctx.getImageData(0, 0, 48, 64).data;

      // 1) contraste centro x bordas → corpo enquadrado no meio
      let center = 0;
      let edge = 0;
      let cN = 0;
      let eN = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 48; x++) {
          const i = (y * 48 + x) * 4;
          const lum = (frame[i]! * 0.3 + frame[i + 1]! * 0.59 + frame[i + 2]! * 0.11) / 255;
          const inCenter = x > 11 && x < 37 && y > 6 && y < 58;
          if (inCenter) {
            center += lum;
            cN++;
          } else {
            edge += lum;
            eN++;
          }
        }
      }
      const contrast = Math.min(1, Math.abs(center / (cN || 1) - edge / (eN || 1)) * 6);

      // 2) estabilidade → pouca variação entre frames
      let motion = 0;
      const prev = prevFrame.current;
      if (prev && prev.length === frame.length) {
        for (let i = 0; i < frame.length; i += 16) motion += Math.abs(frame[i]! - prev[i]!);
        motion = motion / (frame.length / 16) / 255;
      } else {
        motion = 1;
      }
      prevFrame.current = frame;
      const stability = Math.max(0, 1 - motion * 14);

      const score = Math.max(0, Math.min(1, contrast * 0.45 + stability * 0.55));
      const stable = score > 0.72;
      goodFrames.current = stable ? goodFrames.current + 1 : 0;
      setAlign({ score, stable });

      if (auto && goodFrames.current >= 5 && count === null) {
        goodFrames.current = 0;
        startCountdown(timer || 3);
      }
    }, 220);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, auto, timer, count, shots.length]);

  /* ------------------------------ captura ----------------------------- */
  const grab = useCallback(async (): Promise<{ url: string; file: File } | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    /* O vídeo é exibido com object-cover: recortamos exatamente a área visível
       para que a foto final seja idêntica à pré-visualização (sem "zoom"). */
    const rect = (stageRef.current ?? video).getBoundingClientRect();
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const target = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : vw / vh;
    let sw = vw;
    let sh = vh;
    if (vw / vh > target) sw = vh * target;
    else sh = vw / target;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;

    // Mantém boa resolução sem gerar arquivos gigantes.
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
    if (!blob) return null;
    const file = new File([blob], `ascend-${Date.now()}.jpg`, { type: "image/jpeg" });
    return { url: URL.createObjectURL(blob), file };
  }, [facing]);


  const shoot = useCallback(async () => {
    vibrate(20);
    beep(1046);
    const out: { url: string; file: File }[] = [];
    const total = burst && allowBurst ? 3 : 1;
    for (let i = 0; i < total; i++) {
      const shot = await grab();
      if (shot) out.push(shot);
      if (i < total - 1) await new Promise((r) => setTimeout(r, 450));
    }
    if (out.length) {
      setShots(out);
      setPicked(0);
    }
  }, [burst, allowBurst, grab]);

  const startCountdown = useCallback(
    (seconds: number) => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      if (seconds <= 0) {
        void shoot();
        return;
      }
      setCount(seconds);
      countdownRef.current = window.setInterval(() => {
        setCount((c) => {
          if (c === null) return null;
          if (c <= 1) {
            if (countdownRef.current) window.clearInterval(countdownRef.current);
            countdownRef.current = null;
            void shoot();
            return null;
          }
          beep(660, 60);
          vibrate(10);
          return c - 1;
        });
      }, 1000);
    },
    [shoot],
  );

  useEffect(
    () => () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      shots.forEach((s) => URL.revokeObjectURL(s.url));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ringColor = align.score > 0.72 ? "#22c55e" : align.score > 0.45 ? "#eab308" : "#DC2626";
  const feedback = align.score > 0.72 ? "Perfeito, segura aí!" : align.score > 0.45 ? "Quase lá — centralize o corpo" : "Afaste-se e alinhe na silhueta";

  /* ------------------------------ revisão ----------------------------- */
  if (shots.length) {
    const current = shots[picked]!;
    return (
      <div className="animate-zoom-in fixed inset-0 z-[95] flex flex-col bg-black">
        <header className="flex items-center gap-3 p-4">
          <h2 className="flex-1 text-base font-extrabold text-white">Pré-visualização</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="press rounded-full bg-white/10 p-2 text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-neutral-900">
          <img src={current.url} alt="Foto capturada" className="size-full object-contain" />
        </div>

        {shots.length > 1 ? (
          <div className="flex justify-center gap-2 p-3">
            {shots.map((s, i) => (
              <button
                key={s.url}
                onClick={() => setPicked(i)}
                className={`press overflow-hidden rounded-xl border-2 ${i === picked ? "border-primary" : "border-transparent opacity-60"}`}
              >
                <img src={s.url} alt={`Opção ${i + 1}`} className="size-16 object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3 p-4 pb-8">
          <button
            onClick={() => {
              shots.forEach((s) => URL.revokeObjectURL(s.url));
              setShots([]);
            }}
            className="press flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-4 text-sm font-bold text-white"
          >
            <RotateCcw className="size-4" /> Repetir
          </button>
          <button
            disabled={busy}
            onClick={() => void onUse(current.file)}
            className="press flex flex-[1.4] items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Usar esta foto
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ câmera ------------------------------ */
  return (
    <div className="animate-zoom-in fixed inset-0 z-[95] flex flex-col bg-black">
      <header className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <h2 className="text-base font-extrabold text-white">{title}</h2>
          {hint ? <p className="text-[11px] text-white/60">{hint}</p> : null}
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar câmera"
          className="press rounded-full bg-white/10 p-2 text-white"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl bg-neutral-950">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`size-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
        />

        {silhouette ? (
          <svg
            viewBox="0 0 100 150"
            className="pointer-events-none absolute inset-0 m-auto h-[86%] opacity-70 transition-colors duration-300"
            aria-hidden
          >
            <path
              d={silhouette}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeDasharray="4 3"
            />
          </svg>
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 rounded-3xl border-2 transition-colors duration-300"
          style={{ borderColor: ringColor }}
        />

        {count !== null ? (
          <span className="animate-pop pointer-events-none absolute inset-0 grid place-items-center text-[110px] font-black text-white drop-shadow-2xl">
            {count}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/80 to-transparent p-4">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold text-black transition-colors"
            style={{ background: ringColor }}
          >
            {error ?? feedback}
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.round(align.score * 100)}%`, background: ringColor }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 pb-8">
        <div className="flex items-center justify-center gap-2">
          {TIMERS.map((t) => (
            <button
              key={t}
              onClick={() => setTimer(t)}
              className={`press flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                timer === t ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
              }`}
            >
              <Timer className="size-3" /> {t === 0 ? "Off" : `${t}s`}
            </button>
          ))}
          {allowBurst ? (
            <button
              onClick={() => setBurst((b) => !b)}
              className={`press flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                burst ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
              }`}
            >
              <Zap className="size-3" /> Burst
            </button>
          ) : null}
          <button
            onClick={() => setAuto((a) => !a)}
            className={`press flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
              auto ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
            }`}
          >
            <Sparkles className="size-3" /> Auto
          </button>
        </div>

        <div className="flex items-center justify-between px-6">
          <label className="press flex cursor-pointer flex-col items-center gap-1 text-[10px] font-bold text-white">
            <span className="grid size-11 place-items-center rounded-full bg-white/10">
              <Images className="size-5" />
            </span>
            Galeria
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setShots([{ url: URL.createObjectURL(f), file: f }]);
                e.target.value = "";
              }}
            />
          </label>

          <button
            onClick={() => startCountdown(timer)}
            disabled={!ready || count !== null}
            aria-label="Tirar foto"
            className="press grid size-20 place-items-center rounded-full border-4 border-white/70 bg-white/10 disabled:opacity-50"
          >
            <span className="size-14 rounded-full bg-white transition-transform" />
          </button>

          <button
            onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="Trocar câmera"
            className="press flex flex-col items-center gap-1 text-[10px] font-bold text-white"
          >
            <span className="grid size-11 place-items-center rounded-full bg-white/10">
              <RefreshCw className="size-5" />
            </span>
            Virar
          </button>
        </div>
      </div>
    </div>
  );
}
