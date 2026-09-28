import * as React from "react";
import { CaretDown, CaretRight, Sparkle } from "@phosphor-icons/react";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { useQualitativeGroup, type QualitativeGroupView, type SegmentView } from "@/hooks/useQualitative";

type Source = QualitativeGroupView["sources"][number];
type Question = Source["questions"][number];

const ALL = "all";

const pct = (n: number, of: number) => (of > 0 ? (n / of) * 100 : 0);

/** One theme: mentions, share of answers, change against the compared period, and excerpts on demand. */
const ThemeLine = ({
  name,
  description,
  count,
  answered,
  previous,
  compareLabel,
  excerpts,
  tone,
  max,
  compact = false,
}: {
  name: string;
  description: string;
  count: number;
  answered: number;
  previous: { count: number; answered: number } | null;
  compareLabel: string | null;
  excerpts: string[];
  tone: Question["tone"];
  max: number;
  /** Narrow cards: stats go under the name, without repeating the compared period. */
  compact?: boolean;
}) => {
  const [open, setOpen] = React.useState(false);
  const share = pct(count, answered);
  const delta = previous && previous.answered > 0 ? share - pct(previous.count, previous.answered) : null;
  // For "what needs improvement" a growing theme is bad news.
  const worse = delta !== null && (tone === "positive" ? delta < 0 : tone === "improvement" ? delta > 0 : false);
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className={compact ? "" : "flex items-baseline justify-between gap-3"}>
        <p className="text-sm font-medium text-foreground" title={description}>
          {name}
        </p>
        <p className={`text-xs text-muted-foreground tabular-nums ${compact ? "mt-0.5" : "whitespace-nowrap"}`}>
          {count} mention{count === 1 ? "" : "s"} · {Math.round(share)}%
          {delta !== null && compareLabel && Math.abs(delta) >= 1 && (
            <span className={worse ? "text-destructive" : "text-btn-success"}>
              {" "}
              {delta > 0 ? "+" : "−"}
              {Math.abs(Math.round(delta))} pts{compact ? "" : ` vs ${compareLabel}`}
            </span>
          )}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-muted mt-2" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (count / Math.max(max, 1)) * 100)}%` }} />
      </div>
      {excerpts.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-expanded={open}
        >
          {open ? <CaretDown size={12} /> : <CaretRight size={12} />} {open ? "Hide examples" : `Show ${excerpts.length} example${excerpts.length === 1 ? "" : "s"}`}
        </button>
      )}
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {excerpts.map((e, i) => (
            <li key={i} className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
              “{e}”
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const themeCounts = (segment: SegmentView | undefined) => new Map((segment?.themes ?? []).map((t) => [t.id, t.count]));

/** Themes for one segment of one question and period. */
const SegmentThemes = ({
  question,
  segment,
  previous,
  compareLabel,
  excerpts,
  limit,
}: {
  question: Question;
  segment: SegmentView;
  previous: SegmentView | undefined;
  compareLabel: string | null;
  excerpts: Record<string, string[]>;
  limit?: number;
}) => {
  const prevCounts = themeCounts(previous);
  const rows = question.themes
    .map((t) => ({ ...t, count: segment.themes.find((x) => x.id === t.id)?.count ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-2">No themes in these answers.</p>;
  return (
    <div>
      {rows.map((t) => (
        <ThemeLine
          key={t.id}
          name={t.name}
          description={t.description}
          count={t.count}
          answered={segment.answered}
          previous={previous ? { count: prevCounts.get(t.id) ?? 0, answered: previous.answered } : null}
          compareLabel={compareLabel}
          excerpts={excerpts[t.id] ?? []}
          tone={question.tone}
          max={rows[0].count}
          compact={limit !== undefined}
        />
      ))}
    </div>
  );
};

/** One section for the group; each qualitative metric (one free-text column) is a tab. */
const GroupView = ({
  sources,
  period,
  compare,
  segmentFilters,
}: {
  sources: Source[];
  period?: string;
  compare?: string;
  segmentFilters: Record<string, string>;
}) => {
  const [tab, setTab] = React.useState(0);
  const [view, setView] = React.useState(ALL);
  const source = sources[tab] ?? sources[0];
  const question = source?.questions[0];
  if (!source || !question) return null;
  const breakdowns = source.breakdowns.filter((b) => b.available);
  // Another tab may not offer the breakdown picked on this one.
  const activeView = view === ALL || breakdowns.some((b) => b.label === view) ? view : ALL;

  const latest = source.periods[source.periods.length - 1];
  const active = period && question.periods[period] ? period : latest;
  const compareLabel = compare && compare !== active && question.periods[compare] ? compare : null;
  const data = active ? question.periods[active] : undefined;
  const prev = compareLabel ? question.periods[compareLabel] : undefined;

  // A page filter such as Role = "Web Engineer" narrows the section to that segment.
  const filtered = Object.entries(segmentFilters).find(([label]) => breakdowns.some((b) => b.label === label));
  const focusKey = filtered ? `${filtered[0]}: ${filtered[1]}` : ALL;
  const focus = data?.segments.find((s) => s.key === focusKey) ?? data?.segments.find((s) => s.key === ALL);
  const focusPrev = prev?.segments.find((s) => s.key === focus?.key);
  const bySegment = activeView !== ALL && !filtered ? data?.segments.filter((s) => s.type === activeView).sort((a, b) => b.responses - a.responses) : null;
  const pending = (data?.segments.find((s) => s.key === ALL)?.untagged ?? 0) > 0;
  const hasThemes = question.themes.length > 0;

  return (
    <section className="pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[16px] font-medium text-foreground">What people are saying</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {`${active ?? "No periods"}${compareLabel ? ` vs ${compareLabel}` : ""}${
              focus && hasThemes ? ` · ${focus.answered} answer${focus.answered === 1 ? "" : "s"}` : ""
            }${focus && hasThemes && focus.nonAnswers > 0 ? ` (${focus.nonAnswers} like “nothing” left out)` : ""}`}
            {filtered ? ` · ${filtered[0]}: ${filtered[1]}` : ""} · AI summary of free-text answers
          </p>
        </div>
        {sources.some((s) => s.runStatus === "running") && (
          <DesignBadge theme="primary" styling="light">
            Updating…
          </DesignBadge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {sources.length > 1 &&
          sources.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(i)}
              className={`rounded-[6px] border px-3 py-1.5 text-sm transition-colors ${
                i === tab ? "border-primary text-foreground bg-muted" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={i === tab}
            >
              {s.name}
            </button>
          ))}
        {sources.length === 1 && <p className="text-sm font-medium text-foreground">{source.name}</p>}
        {breakdowns.length > 0 && !filtered && (
          <DesignInputSelect
            className="w-[200px] ml-auto"
            size="small"
            value={activeView}
            onChange={setView}
            options={[{ value: ALL, label: "All respondents" }, ...breakdowns.map((b) => ({ value: b.label, label: `By ${b.label.toLowerCase()}` }))]}
          />
        )}
      </div>

      {!hasThemes ? (
        <p className="text-sm text-muted-foreground mt-4">
          {source.runStatus === "running" ? `Finding themes… ${source.runMessage}` : "Themes appear once the answers have been analysed."}
        </p>
      ) : !data || !focus ? (
        <p className="text-sm text-muted-foreground mt-4">No answers in {active ?? "this period"}.</p>
      ) : bySegment ? (
        <div className="grid gap-3 md:grid-cols-2 mt-3">
          {bySegment.map((s) => (
            <div key={s.key} className="rounded-[8px] border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">
                  {s.answered} answer{s.answered === 1 ? "" : "s"}
                </p>
              </div>
              {s.summary && <p className="text-sm text-muted-foreground mt-1.5">{s.summary}</p>}
              <SegmentThemes
                question={question}
                segment={s}
                previous={prev?.segments.find((p) => p.key === s.key)}
                compareLabel={compareLabel}
                excerpts={{}}
                limit={3}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          {focus.summary && (
            <p className="text-sm text-foreground flex gap-2">
              <Sparkle size={16} weight="fill" className="text-primary shrink-0 mt-0.5" aria-hidden="true" />
              {focus.summary}
            </p>
          )}
          <SegmentThemes
            question={question}
            segment={focus}
            previous={focusPrev}
            compareLabel={compareLabel}
            excerpts={focus.key === ALL ? data.excerpts : {}}
          />
        </div>
      )}
      {pending && hasThemes && (
        <p className="text-xs text-muted-foreground mt-2">Some newer answers aren't in the themes yet; they're added on the next update.</p>
      )}
    </section>
  );
};

/** Qualitative metrics configured for a metric group (Settings → Metrics → Qualitative). */
export const QualitativeSection = ({
  group,
  period,
  compare,
  segmentFilters = {},
}: {
  group: string;
  period?: string;
  compare?: string;
  segmentFilters?: Record<string, string>;
}) => {
  const view = useQualitativeGroup(group);
  const sources = view.data?.sources ?? [];
  if (sources.length === 0) return null;
  return <GroupView sources={sources} period={period} compare={compare} segmentFilters={segmentFilters} />;
};

export default QualitativeSection;
