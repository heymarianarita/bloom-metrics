import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowClockwise, PaperPlaneRight, Sparkle, Stop } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { DesignTextAreaBar } from "@/components/ds/DesignInputBar";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBubble } from "@/components/ds/DesignBubble";
import { useSession } from "@/hooks/useAuth";
import type { useInsightsChat } from "@/hooks/useInsightsChat";

/** Markdown elements styled for the narrow panel (the typography plugin isn't enabled). */
const markdown: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-1">{children}</ol>,
  strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
  h1: ({ children }) => <p className="font-medium text-foreground mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-medium text-foreground mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-foreground mb-1">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1 text-xs">{children}</code>,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2 last:mb-0">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="text-left font-medium border-b border-border py-1 pr-2">{children}</th>,
  td: ({ children }) => <td className="border-b border-border py-1 pr-2 tabular-nums">{children}</td>,
};

const formatTokens = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`);

const formatSeconds = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);

/** "24s · 18.2k tokens (17.1k in, 1.1k out)" */
const statsLine = (seconds: number, input: number, output: number) =>
  `${formatSeconds(seconds)}${input + output > 0 ? ` · ${formatTokens(input + output)} tokens (${formatTokens(input)} in, ${formatTokens(output)} out)` : ""}`;

/** Seconds since `startedAt`, updated every second while an answer is being worked on. */
const useElapsed = (startedAt: number | undefined) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!startedAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
};

interface InsightsChatProps {
  chat: ReturnType<typeof useInsightsChat>;
  suggestions: string[];
}

/** "Ask the data" conversation shown in the Insights panel. */
export const InsightsChat = ({ chat, suggestions }: InsightsChatProps) => {
  const { user, loading } = useSession();
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { messages, status, pending, live, ask, stop, reset } = chat;
  const elapsed = useElapsed(live?.startedAt);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  const submit = (text = draft) => {
    if (!text.trim() || pending) return;
    ask(text);
    setDraft("");
  };

  if (!loading && !user) {
    return (
      <div className="px-5 pb-5 text-sm text-muted-foreground">
        <Link to="/auth" className="text-primary underline">
          Sign in
        </Link>{" "}
        to ask questions about the data: drill down, compare periods or get a summary.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="px-5 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 flex-1 pb-2">
            <p className="text-sm text-muted-foreground">
              Ask about anything in Bloom Metrics: drill into a segment, compare periods or libraries, or get a summary
              for a status update.
            </p>
            <div className="mt-auto flex flex-col items-end gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkle size={12} weight="fill" className="text-primary" />
                Suggested questions
              </span>
              {suggestions.map((s) => (
                <div key={s} className="max-w-[85%]">
                  <DesignBubble
                    text={s}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-[var(--bubble-sent-bg)]"
                    onClick={() => submit(s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        submit(s);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="self-end max-w-[85%]">
              <DesignBubble text={m.content} inverse />
            </div>
          ) : (
            <div
              key={i}
              className={`text-sm leading-relaxed ${m.error ? "text-destructive" : "text-muted-foreground"}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdown}>
                {m.content}
              </ReactMarkdown>
              {m.stats && (
                <p className="mt-1.5 text-xs text-muted-foreground/80 tabular-nums">
                  {statsLine(m.stats.seconds, m.stats.inputTokens, m.stats.outputTokens)}
                </p>
              )}
            </div>
          ),
        )}
        {live && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkle size={14} weight="fill" className="text-primary animate-pulse" />
            <span className={status ? "animate-pulse" : ""}>{status ?? "Writing"}…</span>
            <span className="tabular-nums">{statsLine(elapsed, live.inputTokens, live.outputTokens)}</span>
          </p>
        )}
      </div>
      <div className="px-5 pt-3 pb-5 flex flex-col gap-2">
        <DesignTextAreaBar
          value={draft}
          placeholder="Ask a question about the data"
          aria-label="Ask a question about the data"
          maxRows={4}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          suffix={
            <DesignButton
              variant="flat"
              theme="primary"
              className="w-9 px-0"
              aria-label={pending ? "Stop answering" : "Send question"}
              disabled={!pending && !draft.trim()}
              icon={pending ? <Stop size={16} weight="fill" /> : <PaperPlaneRight size={16} weight="fill" />}
              onClick={pending ? stop : () => submit()}
            />
          }
        />
        {messages.length > 0 && !pending && (
          <DesignButton
            variant="flat"
            theme="muted"
            size="small"
            className="self-start"
            icon={<ArrowClockwise size={14} />}
            onClick={reset}
          >
            New conversation
          </DesignButton>
        )}
      </div>
    </div>
  );
};

export default InsightsChat;
