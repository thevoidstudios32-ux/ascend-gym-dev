import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Sparkle, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { analyzeProgress, deletePhoto, registerPhoto } from "@/lib/extras.functions";

export const Route = createFileRoute("/_authenticated/app/shape")({
  head: () => ({
    meta: [
      { title: "Shape Tracker · ASCEND" },
      { name: "description", content: "Fotos semanais comparadas pela IA para mostrar sua evolução muscular." },
      { property: "og:title", content: "Shape Tracker · ASCEND" },
      { property: "og:description", content: "Evolução muscular analisada por IA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShapePage,
});

function ShapePage() {
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const register = useServerFn(registerPhoto);
  const remove = useServerFn(deletePhoto);
  const analyze = useServerFn(analyzeProgress);
  const [pose, setPose] = useState("frente");
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const photos = extras?.photos ?? [];
  const latestAnalysis = analysis ?? photos.find((p) => p.analysis)?.analysis ?? null;

  async function upload(file: File) {
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${auth.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, file);
      if (error) throw new Error(error.message);
      await register({ data: { path, pose } });
      toast.success("Foto enviada!");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setUploading(false);
    }
  }

  const analyzeMutation = useMutation({
    mutationFn: () => analyze(),
    onSuccess: (res) => {
      setAnalysis(res.analysis);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => refresh(),
  });

  const scores = parseScores(latestAnalysis);

  return (
    <div className="animate-rise space-y-4">
      <header>
        <h1 className="text-display text-4xl">SHAPE TRACKER</h1>
        <p className="text-sm text-muted-foreground">
          Envie uma foto por semana. A IA compara e mostra onde você mais evoluiu.
        </p>
      </header>

      <section className="glass p-5">
        <div className="flex gap-2">
          {["frente", "lado", "costas"].map((p) => (
            <button
              key={p}
              onClick={() => setPose(p)}
              className={`press flex-1 rounded-xl py-2 text-xs font-bold capitalize ${
                pose === p ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="press mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground">
          <Upload className="size-4" />
          {uploading ? "Enviando…" : "Enviar foto da semana"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Suas fotos ficam privadas — só você tem acesso.
        </p>
      </section>

      <button
        onClick={() => analyzeMutation.mutate()}
        disabled={analyzeMutation.isPending || photos.length < 2}
        className="press flex w-full items-center justify-center gap-2 rounded-full bg-elevated py-3.5 text-sm font-bold disabled:opacity-50"
      >
        <Sparkle className="size-4 text-primary" />
        {analyzeMutation.isPending ? "Analisando…" : "Analisar evolução com IA"}
      </button>

      {scores.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-bold">Regiões que mais evoluíram</h2>
          <div className="mt-3 aspect-square w-full max-w-sm mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={scores}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Evolução"
                  dataKey="value"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  fill="#dc2626"
                  fillOpacity={0.32}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as { label: string; value: number };
                    return (
                      <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-lg">
                        <p className="font-bold">{p.label}</p>
                        <p className="text-muted-foreground">{p.value}/100</p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {latestAnalysis && (
        <section className="panel p-5">
          <h2 className="font-bold">Análise da IA</h2>
          <div className="prose prose-invert prose-sm mt-2 max-w-none">
            <ReactMarkdown>{latestAnalysis}</ReactMarkdown>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="panel overflow-hidden">
            {extras?.photoUrls[p.id] ? (
              <img
                src={extras.photoUrls[p.id]}
                alt={`Foto de evolução ${p.pose} de ${p.date}`}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            ) : (
              <div className="aspect-[3/4] w-full bg-elevated" />
            )}
            <div className="flex items-center justify-between p-2">
              <p className="text-[11px] text-muted-foreground">
                {p.date.split("-").reverse().join("/")} · {p.pose}
              </p>
              <button onClick={() => delMutation.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">Nenhuma foto enviada ainda.</p>
        )}
      </section>
    </div>
  );
}

function parseScores(text: string | null) {
  if (!text) return [];
  const out: { label: string; value: number }[] = [];
  const seen = new Set<string>();
  // Captura "Peitoral: 70", "- **Dorsais/Costas**: 85/100", "Braços — 72"
  const re = /\*{0,2}([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/]{2,28}?)\*{0,2}\s*[:—–-]\s*(\d{1,3})\s*(?:\/\s*100)?\b/g;
  for (const line of text.split("\n")) {
    const clean = line.replace(/^[-*\s]+/, "");
    for (const m of clean.matchAll(re)) {
      const label = m[1]!.trim().replace(/\s+/g, " ");
      const value = Math.max(0, Math.min(100, Number(m[2])));
      const key = label.toLowerCase();
      if (label.length < 3 || seen.has(key) || Number.isNaN(value)) continue;
      seen.add(key);
      out.push({ label, value });
    }
  }
  return out.slice(0, 8);
}

