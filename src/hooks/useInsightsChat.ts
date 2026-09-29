import * as React from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Set when the answer failed; the message is shown but not sent back as history. */
  error?: boolean;
  /** For answers: how long it took and the tokens it used (all turns, including tool lookups). */
  stats?: AnswerStats;
}

export interface AnswerStats {
  seconds: number;
  inputTokens: number;
  outputTokens: number;
}

/** The answer being worked on: when it started and the tokens used so far. */
export interface LiveAnswer {
  startedAt: number;
  inputTokens: number;
  outputTokens: number;
}

/** What the person is looking at, sent with each question so "this" and "here" make sense. */
export interface ChatContext {
  page: string;
  subject?: string;
  view?: Record<string, unknown>;
}

/**
 * Talks to POST /api/insights/chat and streams the answer in as it arrives.
 * The conversation lives in memory for as long as the panel is mounted.
 */
export const useInsightsChat = (context: ChatContext) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [status, setStatus] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [live, setLive] = React.useState<LiveAnswer | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const contextRef = React.useRef(context);
  contextRef.current = context;

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const appendToAnswer = (text: string, error = false) =>
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role !== "assistant") return [...prev, { role: "assistant", content: text, error }];
      return [...prev.slice(0, -1), { ...last, content: last.content + text, error: error || last.error }];
    });

  const ask = React.useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || pending) return;
      const history = [...messages.filter((m) => !m.error && m.content), { role: "user" as const, content: text }];
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setPending(true);
      setStatus("Thinking");
      const startedAt = Date.now();
      const tokens = { inputTokens: 0, outputTokens: 0 };
      setLive({ startedAt, ...tokens });
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/insights/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            context: contextRef.current,
          }),
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          appendToAnswer(body.error ?? "Something went wrong. Try again.", true);
          return;
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const raw of events) {
            if (!raw.startsWith("data: ")) continue;
            const event = JSON.parse(raw.slice(6));
            if (event.type === "text") {
              setStatus(null);
              appendToAnswer(event.text);
            } else if (event.type === "status") {
              setStatus(event.text);
              // Separate text written before and after a data lookup.
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role !== "assistant" || !last.content || last.content.endsWith("\n\n")) return prev;
                return [...prev.slice(0, -1), { ...last, content: `${last.content}\n\n` }];
              });
            } else if (event.type === "usage") {
              tokens.inputTokens = event.inputTokens;
              tokens.outputTokens = event.outputTokens;
              setLive({ startedAt, ...tokens });
            } else if (event.type === "error") {
              appendToAnswer(`${event.message}`, true);
            }
          }
        }
      } catch (err) {
        if (!abort.signal.aborted) appendToAnswer("The connection was interrupted. Try again.", true);
      } finally {
        const stats: AnswerStats = { seconds: Math.round((Date.now() - startedAt) / 1000), ...tokens };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last?.role === "assistant" ? [...prev.slice(0, -1), { ...last, stats }] : prev;
        });
        setPending(false);
        setStatus(null);
        setLive(null);
        abortRef.current = null;
      }
    },
    [messages, pending],
  );

  const stop = React.useCallback(() => abortRef.current?.abort(), []);
  const reset = React.useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, status, pending, live, ask, stop, reset };
};
