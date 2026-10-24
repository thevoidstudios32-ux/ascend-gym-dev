import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Arte da hero (gerada no Astra 6): o toque dos dedos, com folhas planando em código. */
const HERO_IMAGE = "/landing/criacao-hero.webp";
export const landingHeroPoster = { url: HERO_IMAGE };

type Leaf = {
  x: number; y: number; depth: number; size: number; vx: number; vy: number;
  rot: number; spin: number; phase: number; sway: number; hue: number; alpha: number;
};

function makeLeaf(width: number, height: number, scatter: boolean): Leaf {
  const depth = Math.random();
  return {
    x: scatter ? Math.random() * width : Math.random() * width * 0.7 - width * 0.1,
    y: scatter ? Math.random() * height : -40,
    depth,
    size: 6 + depth * 14,
    vx: 0.35 + depth * 0.6,
    vy: 0.25 + depth * 0.7,
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.03,
    phase: Math.random() * Math.PI * 2,
    sway: 0.6 + Math.random() * 1.2,
    hue: 60 + Math.random() * 25,
    alpha: 0.45 + depth * 0.45,
  };
}

export function LandingHeroVideo() {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const updateMotion = () => setAllowed(!motion.matches && !connection?.saveData);
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateMotion();
    updateVisibility();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { threshold: 0.15 });
    const element = container.current;
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const running = allowed && visible && pageVisible && !paused;

  // Folhas em 3 profundidades: as mais próximas são maiores, mais rápidas e levemente desfocadas.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !running) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = el.width = el.clientWidth * dpr;
      height = el.height = el.clientHeight * dpr;
    };
    resize();
    const count = el.clientWidth < 700 ? 14 : 28;
    const leaves = Array.from({ length: count }, () => makeLeaf(width, height, true));
    let frame = 0;
    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);
      for (const leaf of leaves) {
        const gust = Math.sin(t * 0.6 + leaf.phase) * leaf.sway;
        leaf.x += (leaf.vx + gust * 0.6) * dpr;
        leaf.y += (leaf.vy + Math.cos(t * 1.3 + leaf.phase) * 0.25) * dpr;
        leaf.rot += leaf.spin + gust * 0.004;
        if (leaf.y > height + 40 || leaf.x > width + 60) Object.assign(leaf, makeLeaf(width, height, false));
        const s = leaf.size * dpr;
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.scale(1, Math.abs(Math.cos(t * 1.7 + leaf.phase)) * 0.7 + 0.3);
        ctx.globalAlpha = leaf.alpha;
        ctx.filter = leaf.depth > 0.8 ? "blur(1.5px)" : "none";
        const fill = ctx.createLinearGradient(-s, 0, s, 0);
        fill.addColorStop(0, `hsl(${leaf.hue} 45% 22%)`);
        fill.addColorStop(1, `hsl(${leaf.hue} 55% 46%)`);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(0, -s * 0.55, s, 0);
        ctx.quadraticCurveTo(0, s * 0.55, -s, 0);
        ctx.fill();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [running]);

  return (
    <>
      <div ref={container} className={`landing-hero-media${running ? " is-animated" : ""}`} aria-hidden="true">
        <div className="landing-hero-scene">
          <img className="landing-hero-poster" src={HERO_IMAGE} alt="" fetchPriority="high" decoding="async" />
          <div className="landing-hero-glow" />
        </div>
        <canvas ref={canvas} className="landing-hero-leaves" />
      </div>
      {allowed && (
        <Button
          variant="ghost" size="icon" className="landing-video-control"
          aria-label={paused ? "Reproduzir animação de fundo" : "Pausar animação de fundo"}
          title={paused ? "Reproduzir animação de fundo" : "Pausar animação de fundo"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      )}
    </>
  );
}
