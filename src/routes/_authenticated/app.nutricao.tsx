import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Barcode, Camera, Droplets, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";
import { useDashboard, useExtras, useRefreshDashboard } from "@/hooks/use-dashboard";
import { addMeal, deleteMeal, setWater } from "@/lib/extras.functions";
import { analyzeMealPhoto, scanBarcode } from "@/lib/nutrition.functions";
import { nutritionTargets, todayISO, waterTarget } from "@/lib/ascend";

export const Route = createFileRoute("/_authenticated/app/nutricao")({
  head: () => ({
    meta: [
      { title: "Alimentação · ASCEND" },
      { name: "description", content: "Calorias, proteínas, carboidratos, gorduras e controle de água." },
      { property: "og:title", content: "Alimentação · ASCEND" },
      { property: "og:description", content: "Plano alimentar e hidratação personalizados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NutricaoPage,
});

type Review = {
  title: string;
  items: { name: string; qty: string; kcal: number; protein: number; carbs: number; fat: number }[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence: number;
  notes: string;
};

/** Reduz e converte a foto em data URL para enviar à IA. */
async function toDataUrl(file: File, max = 1100): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Tenta ler o código de barras no próprio navegador antes de recorrer à IA. */
async function detectBarcode(file: File): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (s: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    const found = await detector.detect(await createImageBitmap(file));
    return found[0]?.rawValue?.replace(/\D/g, "") || null;
  } catch {
    return null;
  }
}

function NutricaoPage() {
  const { data } = useDashboard();
  const { data: extras } = useExtras();
  const refresh = useRefreshDashboard();
  const water = useServerFn(setWater);
  const add = useServerFn(addMeal);
  const del = useServerFn(deleteMeal);
  const analyze = useServerFn(analyzeMealPhoto);
  const scan = useServerFn(scanBarcode);

  const [mode, setMode] = useState<"photo" | "barcode" | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "" });

  const profile = data?.profile;
  const targets = nutritionTargets({
    weight_kg: profile?.weight_kg ?? null,
    height_cm: profile?.height_cm ?? null,
    age: profile?.age ?? null,
    goal: profile?.goal ?? "hipertrofia",
  });

  const meals = extras?.meals ?? [];
  const eaten = meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const todayWater = extras?.water.find((w) => w.date === todayISO())?.ml ?? 0;
  const wTarget = waterTarget(profile?.weight_kg ? Number(profile.weight_kg) : null);

  const waterMutation = useMutation({
    mutationFn: (ml: number) => water({ data: { ml: Math.max(0, ml) } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: (meal: { name: string; kcal: number; protein: number; carbs: number; fat: number }) =>
      add({ data: meal }),
    onSuccess: () => {
      setReview(null);
      setNotes("");
      setForm({ name: "", kcal: "", protein: "", carbs: "", fat: "" });
      toast.success("Refeição registrada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => refresh(),
  });

  async function handleCapture(file: File) {
    setBusy(true);
    try {
      const image = await toDataUrl(file);
      if (mode === "barcode") {
        const code = await detectBarcode(file);
        const result = await scan({ data: code ? { code } : { image } });
        setReview(result);
      } else {
        setReview(await analyze({ data: { image, notes } }));
      }
      setMode(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui analisar agora.");
    } finally {
      setBusy(false);
    }
  }

  /** Código lido ao vivo pelo scanner dedicado. */
  async function handleCode(code: string) {
    setBusy(true);
    try {
      setReview(await scan({ data: { code } }));
      setMode(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Produto não encontrado para este código.");
    } finally {
      setBusy(false);
    }
  }


  const field = "w-full rounded-xl bg-elevated px-3 py-2.5 text-sm outline-none ring-ring focus:ring-2";
  const macros = [
    { l: "Proteína", v: eaten.protein, t: targets.protein, u: "g" },
    { l: "Carbo", v: eaten.carbs, t: targets.carbs, u: "g" },
    { l: "Gordura", v: eaten.fat, t: targets.fat, u: "g" },
  ];

  return (
    <div className="animate-rise space-y-4">
      {mode ? (
        <CameraCapture
          title={mode === "barcode" ? "Escanear código de barras" : "Foto da refeição"}
          hint={
            mode === "barcode"
              ? "Enquadre o código de barras da embalagem e mantenha firme."
              : "Fotografe o prato de cima, com boa luz. A IA estima os macros."
          }
          allowBurst={false}
          busy={busy}
          onClose={() => setMode(null)}
          onUse={(f) => handleCapture(f)}
        />
      ) : null}

      {review ? (
        <ReviewSheet
          review={review}
          onChange={setReview}
          saving={saveMutation.isPending}
          onClose={() => setReview(null)}
          onSave={() =>
            saveMutation.mutate({
              name: review.title || "Refeição",
              kcal: review.kcal,
              protein: review.protein,
              carbs: review.carbs,
              fat: review.fat,
            })
          }
        />
      ) : null}

      <header>
        <h1 className="text-display text-4xl">ALIMENTAÇÃO</h1>
        <p className="text-sm text-muted-foreground">Metas calculadas a partir do seu perfil e objetivo.</p>
      </header>

      <section className="glass p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Calorias de hoje
            </p>
            <p className="text-display text-4xl">
              {eaten.kcal} <span className="text-2xl text-muted-foreground">/ {targets.kcal}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            restam <b className="text-foreground">{Math.max(0, targets.kcal - eaten.kcal)}</b> kcal
          </p>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (eaten.kcal / targets.kcal) * 100)}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {macros.map((m) => (
            <div key={m.l} className="rounded-xl bg-elevated p-3 text-center">
              <p className="text-sm font-extrabold">
                {m.v}
                <span className="text-muted-foreground">/{m.t}{m.u}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles className="size-4 text-primary" /> Dieta Inteligente
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="Observações (ex: 150g de arroz, frango grelhado sem óleo) — ajuda a IA a acertar."
          className={`${field} resize-none`}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("photo")}
            className="press flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Camera className="size-4" /> Foto da comida
          </button>
          <button
            onClick={() => setMode("barcode")}
            className="press flex items-center justify-center gap-2 rounded-2xl bg-elevated py-4 text-sm font-bold"
          >
            <Barcode className="size-4" /> Código de barras
          </button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          A IA reconhece os alimentos, estima porções e você revisa antes de salvar.
        </p>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Droplets className="size-4 text-primary" /> Água
          </h2>
          <p className="text-sm text-muted-foreground">
            <b className="text-foreground">{todayWater}</b> / {wTarget} ml
          </p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (todayWater / wTarget) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex gap-2">
          {[200, 300, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => waterMutation.mutate(todayWater + ml)}
              className="press flex-1 rounded-xl bg-elevated py-2.5 text-sm font-bold"
            >
              +{ml} ml
            </button>
          ))}
          <button
            onClick={() => waterMutation.mutate(0)}
            className="press rounded-xl bg-elevated px-3 text-xs font-bold text-muted-foreground"
          >
            zerar
          </button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-bold">Refeições de hoje</h2>
        <div className="mt-3 space-y-2">
          {meals.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-elevated p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.kcal} kcal · P{m.protein} C{m.carbs} G{m.fat}
                </p>
              </div>
              <button
                onClick={() => delMutation.mutate(m.id)}
                aria-label="Remover refeição"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {meals.length === 0 && <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>}
        </div>

        <button
          onClick={() => setManual((v) => !v)}
          className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-elevated py-3 text-xs font-bold text-muted-foreground"
        >
          <Pencil className="size-3.5" /> {manual ? "Fechar registro manual" : "Registrar manualmente"}
        </button>

        {manual ? (
          <div className="mt-3 space-y-2">
            <input
              className={field}
              placeholder="Refeição (ex: Frango com arroz)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-4 gap-2">
              {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                <input
                  key={k}
                  className={field}
                  type="number"
                  placeholder={k === "kcal" ? "kcal" : k === "protein" ? "P" : k === "carbs" ? "C" : "G"}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              ))}
            </div>
            <button
              onClick={() =>
                saveMutation.mutate({
                  name: form.name.trim() || "Refeição",
                  kcal: Number(form.kcal) || 0,
                  protein: Number(form.protein) || 0,
                  carbs: Number(form.carbs) || 0,
                  fat: Number(form.fat) || 0,
                })
              }
              disabled={saveMutation.isPending}
              className="press flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="size-4" /> Adicionar refeição
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/* -------------------- Revisão inteligente (editável) -------------------- */

function ReviewSheet({
  review,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  review: Review;
  onChange: (r: Review) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  function patchItem(index: number, patch: Partial<Review["items"][number]>) {
    const items = review.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    const sum = (k: "kcal" | "protein" | "carbs" | "fat") => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
    onChange({ ...review, items, kcal: sum("kcal"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") });
  }

  function removeItem(index: number) {
    const items = review.items.filter((_, i) => i !== index);
    const sum = (k: "kcal" | "protein" | "carbs" | "fat") => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
    onChange({ ...review, items, kcal: sum("kcal"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat") });
  }

  const cell = "w-full rounded-lg bg-elevated px-2 py-1.5 text-center text-xs outline-none";

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-black/70 backdrop-blur-sm">
      <div className="animate-sheet-up max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Revisão inteligente · {review.confidence}% de confiança
            </p>
            <input
              value={review.title}
              onChange={(e) => onChange({ ...review, title: e.target.value })}
              className="w-full bg-transparent text-xl font-extrabold outline-none"
            />
          </div>
          <button onClick={onClose} aria-label="Fechar" className="press rounded-full bg-elevated p-2">
            <X className="size-4" />
          </button>
        </div>

        {review.notes ? <p className="mt-2 text-xs text-muted-foreground">{review.notes}</p> : null}

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {([
            ["kcal", "kcal"],
            ["protein", "P"],
            ["carbs", "C"],
            ["fat", "G"],
          ] as const).map(([key, label]) => (
            <div key={key} className="rounded-xl bg-elevated p-3">
              <input
                type="number"
                value={review[key]}
                onChange={(e) => onChange({ ...review, [key]: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-center text-lg font-extrabold outline-none"
              />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Fibras estimadas: {review.fiber} g</p>

        <div className="mt-4 space-y-2">
          {review.items.map((item, i) => (
            <div key={`${item.name}-${i}`} className="rounded-xl bg-elevated/60 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={item.name}
                  onChange={(e) => patchItem(i, { name: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
                />
                <input
                  value={item.qty}
                  onChange={(e) => patchItem(i, { qty: e.target.value })}
                  placeholder="qtd"
                  className="w-20 rounded-lg bg-elevated px-2 py-1 text-center text-[11px] outline-none"
                />
                <button
                  onClick={() => removeItem(i)}
                  aria-label={`Remover ${item.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                  <input
                    key={k}
                    type="number"
                    value={item[k]}
                    onChange={(e) => patchItem(i, { [k]: Math.max(0, Number(e.target.value) || 0) })}
                    className={cell}
                  />
                ))}
              </div>
            </div>
          ))}
          {review.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item detectado — ajuste os totais acima.</p>
          ) : null}
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Salvar refeição
        </button>
      </div>
    </div>
  );
}
