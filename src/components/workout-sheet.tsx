import { useEffect, useState } from "react";
import { Download, Eye, FileDown, LoaderCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProgram } from "@/hooks/use-program";
import { useCustomWorkouts } from "@/hooks/use-custom";
import { useDashboard } from "@/hooks/use-dashboard";
import { estimateMinutes } from "@/lib/custom";
import { dayMinutes, WEEKDAYS } from "@/lib/program";
import type { PdfProgram, PdfWorkout } from "@/lib/workout-pdf";
import type { jsPDF } from "jspdf";

export function WorkoutSheetButton() {
  const { data: program, isLoading: programLoading } = useProgram();
  const custom = useCustomWorkouts();
  const { data, isLoading: dashboardLoading } = useDashboard();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("");
  const [document, setDocument] = useState<jsPDF | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function collect(): PdfProgram {
    const days: PdfWorkout[] = [...(program?.program?.days ?? [])]
      .sort((a, b) => {
        const ai = WEEKDAYS.indexOf(a.weekday as (typeof WEEKDAYS)[number]);
        const bi = WEEKDAYS.indexOf(b.weekday as (typeof WEEKDAYS)[number]);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      })
      .map(d => ({
        title: d.title, focus: d.focus, weekday: d.weekday,
        minutes: dayMinutes(d),
        exercises: d.exercises.map(e => ({
          name: e.name, muscle: e.muscle, sets: e.sets, reps: e.reps,
          rest: e.rest, notes: e.purpose,
        })),
      }));
    if (!days.length) days.push(...(custom.data?.workouts ?? []).map(w => ({
      title: w.name, focus: w.focus, minutes: estimateMinutes(w.exercises),
      exercises: w.exercises.map(e => ({
        name: e.name, muscle: e.muscle, sets: e.sets, reps: e.reps,
        rest: e.rest, notes: e.tip, hold: e.hold,
      })),
    })));
    return {
      athlete: data?.profile?.name || "Atleta ASCEND",
      goal: program?.program?.goal || data?.profile?.goal || undefined,
      level: data?.profile?.experience || undefined,
      version: program?.program?.version,
      days,
    };
  }

  async function prepare() {
    setStage("PREPARANDO SEU PROGRAMA");
    try {
      const { generateWorkoutPdf } = await import("@/lib/workout-pdf");
      const doc = await generateWorkoutPdf(collect(), setStage);
      const url = URL.createObjectURL(doc.output("blob"));
      setDocument(doc);
      setPreviewUrl(url);
      setPage(1);
      setStage("");
      return doc;
    } catch {
      toast.error("Não foi possível preparar o PDF. Tente novamente.");
      setStage("");
      return null;
    }
  }

  async function download() {
    const doc = document ?? await prepare();
    if (!doc) return;
    doc.save(`ascend-programa-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Programa ASCEND baixado em PDF.");
  }

  function close() {
    setOpen(false);
    setShowPreview(false);
    setDocument(null);
    setPreviewUrl(null);
  }

  const total = document?.getNumberOfPages() ?? 0;
  const busy = Boolean(stage);
  const loading = programLoading || custom.isLoading || dashboardLoading;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={loading || (!program?.program && !custom.data?.workouts.length)} className="press w-full py-6 font-bold">
        <FileDown /> Exportar programa em PDF
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); else setOpen(true); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto border-border bg-surface p-4 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="text-display text-3xl font-normal">EXPORTAR SEU PROGRAMA</DialogTitle>
            <DialogDescription>Seu plano de treinos ASCEND, personalizado com seus dados atuais.</DialogDescription>
          </DialogHeader>
          {showPreview && previewUrl && (
            <div className="min-w-0 space-y-3">
              <div className="mx-auto aspect-[210/297] max-h-[58dvh] w-full max-w-[410px] overflow-hidden border border-border bg-background">
                <iframe title={`Prévia do programa ASCEND, página ${page}`} src={`${previewUrl}#page=${page}&toolbar=0&navpanes=0`} className="h-full w-full border-0" />
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" aria-label="Página anterior" title="Página anterior" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft /></Button>
                <span className="min-w-20 text-center text-sm text-muted-foreground">{page} / {total}</span>
                <Button variant="ghost" size="icon" aria-label="Próxima página" title="Próxima página" disabled={page >= total} onClick={() => setPage(p => p + 1)}><ChevronRight /></Button>
              </div>
            </div>
          )}
          <div role="status" aria-live="polite" className="min-h-5 text-center text-xs font-bold text-primary">{stage}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={async () => {
              if (!previewUrl && !await prepare()) return;
              setShowPreview(true);
            }}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Eye />} Prévia
            </Button>
            <Button className="flex-1" disabled={busy} onClick={download}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Download />} Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
