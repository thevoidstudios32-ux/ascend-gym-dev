import { useEffect, type RefObject } from "react";
import heroMp4 from "@/assets/landing/bench-hero.mp4.asset.json";
import heroWebm from "@/assets/landing/bench-hero.webm.asset.json";
import heroPoster from "@/assets/landing/bench-hero-poster.jpg.asset.json";
import closeMp4 from "@/assets/landing/athlete-dumbbell.mp4.asset.json";
import closeWebm from "@/assets/landing/athlete-dumbbell.webm.asset.json";
import closePoster from "@/assets/landing/athlete-dumbbell-poster.jpg.asset.json";
import milMp4 from "@/assets/exercises/desenvolvimento-militar.mp4.asset.json";
import milWebm from "@/assets/exercises/desenvolvimento-militar.webm.asset.json";
import milPoster from "@/assets/exercises/desenvolvimento-militar-poster.jpg.asset.json";
import terraMp4 from "@/assets/exercises/levantamento-terra.mp4.asset.json";
import terraWebm from "@/assets/exercises/levantamento-terra.webm.asset.json";
import terraPoster from "@/assets/exercises/levantamento-terra-poster.jpg.asset.json";
import agaMp4 from "@/assets/exercises/agachamento-livre.mp4.asset.json";
import agaWebm from "@/assets/exercises/agachamento-livre.webm.asset.json";
import agaPoster from "@/assets/exercises/agachamento-livre-poster.jpg.asset.json";

const MP4 = "video/mp4";
const WEBM = "video/webm";
type Slot = { poster: string; sources: [string, string][]; focal: string; focalMobile?: string; control?: boolean; group?: string };
const MEDIA: Record<string, Slot> = {
  hero: { poster: heroPoster.url, sources: [[heroMp4.url, MP4], [heroWebm.url, WEBM]], focal: "68% 50%", focalMobile: "74% 50%", control: true },
  closing: { poster: closePoster.url, sources: [[closeWebm.url, WEBM], [closeMp4.url, MP4]], focal: "50% 40%", focalMobile: "70% 30%", control: true },
  "demo-militar": { poster: milPoster.url, sources: [[milMp4.url, MP4], [milWebm.url, WEBM]], focal: "32% 50%", group: "demos" },
  "demo-terra": { poster: terraPoster.url, sources: [[terraMp4.url, MP4], [terraWebm.url, WEBM]], focal: "32% 50%", group: "demos" },
  "demo-agachamento": { poster: agaPoster.url, sources: [[agaMp4.url, MP4], [agaWebm.url, WEBM]], focal: "32% 50%", group: "demos" },
};

type Player = { el: HTMLElement; slot: Slot; group: string; visible: boolean; video: HTMLVideoElement | null; failed: boolean; button?: HTMLButtonElement };

export function useCinematic(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("js");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]reduced\b/.test(location.search)) root.classList.add("is-reduced");
    const reduced = root.classList.contains("is-reduced");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const saveData = !!conn?.saveData;
    const hasIO = "IntersectionObserver" in window;
    const videoAllowed = !reduced && !saveData && hasIO;
    const mobile = window.matchMedia("(max-width: 700px)");
    let pageVisible = document.visibilityState === "visible";
    const paused: Record<string, boolean> = {};
    const players: Player[] = [];
    const playerOf = new Map<Element, Player>();
    const observers: IntersectionObserver[] = [];
    const cleanups: (() => void)[] = [];
    const created: Element[] = [];

    const focal = (s: Slot) => (mobile.matches && s.focalMobile ? s.focalMobile : s.focal);
    const sync = (p: Player) => {
      if (!p.video) return;
      if (p.visible && pageVisible && !paused[p.group] && !p.failed) p.video.play()?.catch(() => {});
      else p.video.pause();
    };
    const fail = (p: Player) => { p.failed = true; p.video?.remove(); p.video = null; p.el.classList.remove("is-playing"); };
    const mount = (p: Player) => {
      if (p.video || p.failed) return;
      const video = document.createElement("video");
      video.className = "cine-video"; video.muted = true; video.loop = true; video.playsInline = true; video.preload = "metadata";
      video.setAttribute("muted", ""); video.setAttribute("playsinline", ""); video.setAttribute("aria-hidden", "true");
      video.style.objectPosition = focal(p.slot);
      p.slot.sources.forEach(([src, type]) => { const s = document.createElement("source"); s.src = src; s.type = type; video.appendChild(s); });
      video.lastElementChild?.addEventListener("error", () => fail(p));
      video.addEventListener("playing", () => { p.el.classList.add("is-playing"); if (p.button) p.button.hidden = false; }, { once: true });
      p.el.appendChild(video); p.video = video; created.push(video); sync(p);
    };

    const nearObserver = videoAllowed ? new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (!e.isIntersecting) return; const p = playerOf.get(e.target); if (p) mount(p); nearObserver!.unobserve(e.target); });
    }, { rootMargin: "300px 0px" }) : null;
    const playObserver = videoAllowed ? new IntersectionObserver((entries) => {
      entries.forEach((e) => { const p = playerOf.get(e.target); if (!p) return; p.visible = e.isIntersecting; sync(p); });
    }, { threshold: 0.2 }) : null;
    if (nearObserver) observers.push(nearObserver);
    if (playObserver) observers.push(playObserver);

    root.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
      const slot = MEDIA[el.getAttribute("data-slot") || ""];
      if (!slot) return;
      const img = document.createElement("img");
      img.className = "cine-poster"; img.alt = ""; img.decoding = "async";
      if (el.hasAttribute("data-priority")) img.setAttribute("fetchpriority", "high"); else img.loading = "lazy";
      img.src = slot.poster; img.style.objectPosition = focal(slot);
      el.insertBefore(img, el.firstChild); created.push(img);
      if (!videoAllowed) return;
      const p: Player = { el, slot, group: slot.group || el.getAttribute("data-slot")!, visible: false, video: null, failed: false };
      playerOf.set(el, p); players.push(p);
      if (slot.control) {
        const button = document.createElement("button");
        button.type = "button"; button.className = "cine-pause"; button.hidden = true;
        button.setAttribute("data-pause-group", p.group);
        el.parentNode?.appendChild(button); p.button = button; created.push(button);
      }
      nearObserver!.observe(el); playObserver!.observe(el);
    });

    const label = (b: HTMLElement) => {
      const g = b.getAttribute("data-pause-group")!; const isPaused = !!paused[g];
      b.textContent = (isPaused ? "Reproduzir " : "Pausar ") + (g === "demos" ? "demonstrações" : "vídeo de fundo");
      b.setAttribute("aria-pressed", String(isPaused)); b.classList.toggle("is-paused", isPaused);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-pause-group]").forEach((b) => {
      label(b);
      if (videoAllowed && b.getAttribute("data-pause-group") === "demos") b.hidden = false;
      const onClick = () => { const g = b.getAttribute("data-pause-group")!; paused[g] = !paused[g]; label(b); players.forEach(sync); };
      b.addEventListener("click", onClick);
      cleanups.push(() => b.removeEventListener("click", onClick));
    });

    const onVis = () => { pageVisible = document.visibilityState === "visible"; players.forEach(sync); };
    document.addEventListener("visibilitychange", onVis);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
    const onMobile = () => {
      root.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
        const slot = MEDIA[el.getAttribute("data-slot") || ""]; if (!slot) return;
        el.querySelectorAll<HTMLElement>("img.cine-poster, video").forEach((n) => { n.style.objectPosition = focal(slot); });
      });
    };
    mobile.addEventListener("change", onMobile);
    cleanups.push(() => mobile.removeEventListener("change", onMobile));

    const revealables = root.querySelectorAll<HTMLElement>("[data-reveal]");
    revealables.forEach((el) => {
      let i = 0;
      for (let n = el.previousElementSibling; n; n = n.previousElementSibling) if (n.hasAttribute("data-reveal")) i++;
      if (i) el.style.setProperty("--i", String(i));
    });
    if (reduced || !hasIO) revealables.forEach((el) => el.classList.add("is-in"));
    else {
      const ro = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add("is-in"); ro.unobserve(e.target); });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealables.forEach((el) => ro.observe(el));
      observers.push(ro);
    }

    const header = root.querySelector("[data-header]");
    const hero = root.querySelector("#topo");
    if (header && hero && hasIO) {
      const ho = new IntersectionObserver((entries) => { const e = entries[0]; if (e) header.classList.toggle("is-scrolled", !e.isIntersecting); }, { rootMargin: "-72px 0px 0px 0px" });
      ho.observe(hero); observers.push(ho);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
      cleanups.forEach((c) => c());
      players.forEach((p) => p.video?.pause());
      created.forEach((n) => n.remove());
      root.classList.remove("js", "is-reduced");
    };
  }, [rootRef]);
}
