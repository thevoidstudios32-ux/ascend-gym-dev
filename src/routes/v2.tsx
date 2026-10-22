import { createFileRoute } from "@tanstack/react-router";
import heroPoster from "@/assets/landing/bench-hero-poster.jpg.asset.json";
import { CinematicLanding } from "@/components/cinematic/cinematic-landing";

const title = "ASCEND · Treino com direção";
const description = "Treino personalizado, Coach IA, alimentação e progresso em um único sistema. Crie sua conta no ASCEND.";

export const Route = createFileRoute("/v2")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "preload", as: "image", href: heroPoster.url, fetchpriority: "high" }],
  }),
  component: CinematicLanding,
});
