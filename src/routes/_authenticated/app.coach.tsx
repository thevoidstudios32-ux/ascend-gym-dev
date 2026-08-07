import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { clearMessages, getMessages, sendMessage } from "@/lib/ascend.functions";
import { useRefreshDashboard } from "@/hooks/use-dashboard";
import { WorkoutTuner } from "@/components/workout-tuner";

export const Route = createFileRoute("/_authenticated/app/coach")({
  head: () => ({
    meta: [
      { title: "Coach IA · ASCEND" },
      { name: "description", content: "Converse com o coach de IA que conhece seus treinos." },
      { property: "og:title", content: "Coach IA · ASCEND" },
      { property: "og:description", content: "Coach de IA personalizado para seus treinos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachPage,
});

const SUGGESTIONS = [
  "Monta meu treino de hoje",
  "Como aumentar meu supino?",
  "O que comer no pós-treino?",
  "Estou sem motivação, me ajuda",
];

function CoachPage() {
  const fetchMessages = useServerFn(getMessages);
  const send = useServerFn(sendMessage);
  const clear = useServerFn(clearMessages);
  const refreshDashboard = useRefreshDashboard();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["coach-messages"],
    queryFn: () => fetchMessages(),
  });

  const mutation = useMutation({
    mutationFn: (text: string) => send({ data: { text } }),
    onSuccess: async () => {
      await refetch();
      refreshDashboard();
      inputRef.current?.focus();
    },
    onError: (e: Error) => toast.error(e.message || "O coach não respondeu. Tente de novo."),
  });

  const clearMutation = useMutation({
    mutationFn: () => clear(),
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, mutation.isPending]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || mutation.isPending) return;
    setInput("");
    mutation.mutate(value);
  }

  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-4xl">COACH IA</h1>
          <p className="text-sm text-muted-foreground">Ele conhece seus treinos, cargas e metas.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            className="text-xs font-bold text-muted-foreground hover:text-destructive"
          >
            Limpar
          </button>
        )}
      </header>

      <div className="mt-5">
        <WorkoutTuner />
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="panel p-5">
            <p className="text-sm text-muted-foreground">
              Pergunte qualquer coisa sobre treino, dieta ou recuperação.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full ember-border bg-elevated px-3 py-1.5 text-xs font-semibold"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-surface ember-border"
            }`}
          >
            {m.role === "user" ? (
              m.content
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {mutation.isPending && (
          <div className="ember-border w-24 rounded-2xl bg-surface px-4 py-3">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-bounce rounded-full bg-primary"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-24 mt-4 flex gap-2 md:bottom-4"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder="Pergunte ao coach…"
          className="flex-1 resize-none rounded-2xl bg-elevated px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
