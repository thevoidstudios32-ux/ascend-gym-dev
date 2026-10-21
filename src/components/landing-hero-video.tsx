import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import mp4 from "@/assets/landing/bench-hero.mp4.asset.json";
import webm from "@/assets/landing/bench-hero.webm.asset.json";
import poster from "@/assets/landing/bench-hero-poster.jpg.asset.json";

export { poster as landingHeroPoster };

export function LandingHeroVideo() {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
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

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (allowed && visible && pageVisible && !paused && !failed) {
      element.play().catch(() => setLoaded(false));
    } else {
      element.pause();
    }
  }, [allowed, visible, pageVisible, paused, failed]);

  return (
    <>
      <div ref={container} className="landing-hero-media" aria-hidden="true">
        <img className="landing-hero-poster" src={poster.url} alt="" fetchPriority="high" decoding="async" />
        {allowed && (visible || loaded) && !failed && (
          <video
            ref={video}
            className={`landing-hero-video${loaded ? " is-loaded" : ""}`}
            muted autoPlay loop playsInline preload="none" poster={poster.url}
            onPlaying={() => setLoaded(true)} onError={() => setFailed(true)}
          >
            <source src={webm.url} type="video/webm" />
            <source src={mp4.url} type="video/mp4" />
          </video>
        )}
      </div>
      {allowed && loaded && !failed && (
        <Button
          variant="ghost" size="icon" className="landing-video-control"
          aria-label={paused ? "Reproduzir vídeo de fundo" : "Pausar vídeo de fundo"}
          title={paused ? "Reproduzir vídeo de fundo" : "Pausar vídeo de fundo"}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      )}
    </>
  );
}