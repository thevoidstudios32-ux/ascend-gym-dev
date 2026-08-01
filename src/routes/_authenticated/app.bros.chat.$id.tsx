import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Send } from "lucide-react";
import { BroAvatar } from "@/components/bro";
import { useSocialAction } from "@/hooks/use-social";
import { getThread, sendDm } from "@/lib/social.functions";
import { timeAgo } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/app/bros/chat/$id")({
  head: () => ({
    meta: [
      { title: "Conversa · Gym Bros" },
      { name: "description", content: "Chat privado entre Gym Bros do ASCEND." },
      { property: "og:title", content: "Conversa · Gym Bros" },
      { property: "og:description", content: "Chat privado entre Gym Bros." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  const fetcher = useServerFn(getThread);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["thread", id],
    queryFn: () => fetcher({ data: { broId: id } }),
    refetchInterval: 6000,
  });

  const send = useSocialAction(useServerFn(sendDm));
  const messages = useMemo(() => data?.messages ?? [], [data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="animate-rise flex min-h-[70vh] flex-col">
      <header className="flex items-center gap-3 pb-4">
        <Link to="/app/bros" className="press rounded-xl bg-surface p-2" aria-label="Voltar">
          <ArrowLeft className="size-4" />
        </Link>
        <BroAvatar profile={data?.bro ?? undefined} />
        <div>
          <h1 className="font-extrabold leading-tight">{data?.bro?.name ?? "Gym Bro"}</h1>
          <p className="text-xs text-muted-foreground">{data?.bro?.gym ?? "Academia não informada"}</p>
        </div>
      </header>

      <div className="panel flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Manda a primeira mensagem e combina o treino.
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.recipient_id === id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-elevated"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-60">{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              send.mutate({ broId: id, content: text.trim() }, { onSuccess: () => setText("") });
            }
          }}
          placeholder="Mensagem…"
          className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm outline-none"
        />
        <button
          disabled={!text.trim() || send.isPending}
          onClick={() =>
            send.mutate({ broId: id, content: text.trim() }, { onSuccess: () => setText("") })
          }
          className="press rounded-2xl bg-primary px-4 text-primary-foreground shadow-glow disabled:opacity-40"
          aria-label="Enviar"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
