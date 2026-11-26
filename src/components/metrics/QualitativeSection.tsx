import * as React from "react";
import { useSectionHeading } from "@/components/metrics/sectionHeading";
import { CaretDown, CaretRight, Sparkle } from "@phosphor-icons/react";
import { DesignChip } from "@/components/ds/DesignChip";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCard } from "@/components/ds/DesignCard";
import { AnswersSheet } from "@/components/metrics/AnswersSheet";
import { BreakdownCard, ShareRow } from "@/components/metrics/BreakdownCard";
import { answeredIn, useQualitativeGroup, type QualitativeGroupView, type SegmentView } from "@/hooks/useQualitative";

type Source = QualitativeGroupView["sources"][number];
type Question = Source["questions"][number];

const ALL = "all";

const pct = (n: number, of: number) => (of > 0 ? (n / of) * 100 : 0);

/** Change in a theme's share against the compared period, and whether that's bad news for this question. */
const themeChange = (share: number, previous: { count: number; answered: number } | null, tone: Question["tone"]) => {
  const delta = previous && previous.answered > 0 ? share - pct(previous.count, previous.answered) : null;
  // For "what needs improvement" a growing theme is bad news.
  const worse = delta !== null && (tone === "positive" ? delta < 0 : tone === "improvement" ? delta > 0 : false);
  return { delta, worse };
};

/** One theme: share of answers and change against the compared period; example answers open on click. */
const ThemeLine = ({
  name,
  description,
  count,
  answered,
  previous,
  showChange,
  excerpts,
  tone,
  max,
}: {
  name: string;
  description: string;
  count: number;
  answered: number;
  previous: { count: number; answered: number } | null;
  showChange: boolean;
  excerpts: string[];
  tone: Question["tone"];
  max: number;
}) => {
  const [open, setOpen] = React.useState(false);
  const share = pct(count, answered);
  const { delta, worse } = themeChange(share, previous, tone);
  return (
    <ShareRow
      label={name}
      hint={description}
      fraction={count / Math.max(max, 1)}
      value={
        <>
          {Math.round(share)}%
          {delta !== null && showChange && Math.abs(delta) >= 1 && (
            <span className={worse ? "text-destructive" : "text-btn-success"}>
              {" "}
              {delta > 0 ? "+" : "−"}
              {Math.abs(Math.round(delta))} pts
            </span>
          )}
        </>
      }
      expanded={open}
      onToggle={excerpts.length > 0 ? () => setOpen((v) => !v) : undefined}
    >
      <ul className="mt-2 mb-1 flex flex-col gap-1.5">
        {excerpts.map((e, i) => (
          <li key={i} className="text-sm text-muted-foreground border-l-2 border-border pl-3">
            “{e}”
          </li>
        ))}
      </ul>
    </ShareRow>
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
  collapsible = false,
}: {
  question: Question;
  segment: SegmentView;
  previous: SegmentView | undefined;
  compareLabel: string | null;
  excerpts: Record<string, string[]>;
  limit?: number;
  /** Starts as one line naming the top themes, with a button to list them all. */
  collapsible?: boolean;
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const prevCounts = themeCounts(previous);
  const rows = question.themes
    .map((t) => ({
      ...t,
      count: segment.themes.find((x) => x.id === t.id)?.count ?? 0,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-2">No themes in these answers.</p>;
  const lines = rows.map((t) => (
    <ThemeLine
      key={t.id}
      name={t.name}
      description={t.description}
      count={t.count}
      answered={segment.answered}
      previous={previous ? { count: prevCounts.get(t.id) ?? 0, answered: previous.answered } : null}
      showChange={compareLabel !== null}
      excerpts={excerpts[t.id] ?? []}
      tone={question.tone}
      max={rows[0].count}
    />
  ));
  if (limit !== undefined) return <>{lines}</>;
  const collapsed = collapsible && !expanded;
  return (
    <div>
      {collapsible && (
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 basis-[28rem] flex-wrap items-center gap-1.5">
            {collapsed &&
              rows.slice(0, 3).map((t) => (
                <DesignBadge key={t.id} theme="muted" styling="light">
                  {t.name}
                </DesignBadge>
              ))}
          </div>
          {/* -ml-3 cancels the gap beside the badges and, once wrapped below them, lines the caret up with their edge. */}
          <DesignButton
            variant="flat"
            theme="primary"
            size="small"
            className="-ml-3 shrink-0"
            icon={collapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
            aria-expanded={!collapsed}
            onClick={() => setExpanded((v) => !v)}
          >
            {collapsed ? `Show ${rows.length === 1 ? "the theme" : `all ${rows.length} themes`}` : "Hide themes"}
          </DesignButton>
        </div>
      )}
      {!collapsed && <div className="mt-3 flex flex-col gap-3">{lines}</div>}
    </div>
  );
};

/** One section for the group; each qualitative metric (one free-text column) is a tab. */
const GroupView = ({
  sources,
  period,
  compare,
  segmentFilters,
  titleFromName = false,
}: {
  sources: Source[];
  period?: string;
  compare?: string;
  segmentFilters: Record<string, string>;
  /** The metric's name (the question) is the heading, instead of the section's title. */
  titleFromName?: boolean;
}) => {
  const [tab, setTab] = React.useState(0);
  const [view, setView] = React.useState(ALL);
  const [reading, setReading] = React.useState(false);
  const sectionTitle = useSectionHeading("");
  const source = sources[tab] ?? sources[0];
  const question = source?.questions[0];
  if (!source || !question) return null;
  const breakdowns = source.breakdowns.filter((b) => b.available);
  // Another tab may not offer the breakdown picked on this one.
  const activeView = view === ALL || breakdowns.some((b) => b.label === view) ? view : ALL;

  const latest = source.periods[source.periods.length - 1];
  // A section of one metric with no answers in the chosen period stays out of the way, rather
  // than showing another period's themes among this period's numbers.
  const chosen = period && !period.startsWith("__") ? period : undefined;
  if (sources.length === 1 && question.themes.length > 0 && chosen && source.periods.length > 0 && answeredIn(source, chosen) === 0) return null;
  const active = period && question.periods[period] ? period : latest;
  const compareLabel = compare && compare !== active && question.periods[compare] ? compare : null;
  const data = active ? question.periods[active] : undefined;
  const prev = compareLabel ? question.periods[compareLabel] : undefined;

  // A page filter such as Role = "Web Engineer" narrows the section to that segment.
  const filtered = Object.entries(segmentFilters).find(([label]) => breakdowns.some((b) => b.label === label));
  const focusKey = filtered ? `${filtered[0]}: ${filtered[1]}` : ALL;
  const focus = data?.segments.find((s) => s.key === focusKey) ?? data?.segments.find((s) => s.key === ALL);
  const focusPrev = prev?.segments.find((s) => s.key === focus?.key);
  const bySegment =
    activeView !== ALL && !filtered ? data?.segments.filter((s) => s.type === activeView).sort((a, b) => b.responses - a.responses) : null;
  const pending = (data?.segments.find((s) => s.key === ALL)?.untagged ?? 0) > 0;
  const hasThemes = question.themes.length > 0;
  // One question is titled by itself; several (shown as tabs) share a heading. A view section's own title wins.
  const title = titleFromName ? source.name : sectionTitle || (sources.length === 1 ? source.name : "What people are saying");

  return (
    <DesignCard radius="small" className="p-4">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-60">
            <h3 className="text-base font-medium text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[
                `${active ?? "No periods"}${compareLabel ? ` vs ${compareLabel}` : ""}`,
                focus && hasThemes
                  ? `${focus.answered} answer${focus.answered === 1 ? "" : "s"}${focus.nonAnswers > 0 ? " with feedback" : ""}`
                  : null,
                focus && hasThemes && focus.nonAnswers > 0 ? `${focus.nonAnswers} had nothing to add` : null,
                filtered ? `${filtered[0]}: ${filtered[1]}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sources.some((s) => s.runStatus === "running") && (
              <DesignBadge theme="primary" styling="light">
                Updating…
              </DesignBadge>
            )}
            {data && focus && focus.responses > 0 && (
              <DesignButton
                variant="flat"
                theme="muted"
                size="small"
                onClick={() => setReading(true)}
              >
                All answers
              </DesignButton>
            )}
            {breakdowns.length > 0 && !filtered && (
              <DesignInputSelect
                className="w-[180px]"
                size="small"
                value={activeView}
                onChange={setView}
                options={[
                  { value: ALL, label: "All respondents" },
                  ...breakdowns.map((b) => ({
                    value: b.label,
                    label: `By ${b.label.toLowerCase()}`,
                  })),
                ]}
              />
            )}
          </div>
        </div>

        {sources.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {sources.map((s, i) => (
              <DesignChip key={s.id} size="small" isActive={i === tab} aria-pressed={i === tab} onClick={() => setTab(i)}>
                {s.name}
              </DesignChip>
            ))}
          </div>
        )}

        {!hasThemes ? (
          <p className="text-sm text-muted-foreground mt-4">
            {source.runStatus === "running" ? `Finding themes… ${source.runMessage}` : "Themes appear once the answers have been analysed."}
          </p>
        ) : !data || !focus ? (
          <p className="text-sm text-muted-foreground mt-4">No answers in {active ?? "this period"}.</p>
        ) : bySegment ? (
          <div className="grid gap-3 md:grid-cols-2 mt-3">
            {bySegment.map((s) => (
              <BreakdownCard key={s.key} title={s.value} meta={`${s.answered} answer${s.answered === 1 ? "" : "s"}`} summary={s.summary}>
                <SegmentThemes
                  question={question}
                  segment={s}
                  previous={prev?.segments.find((p) => p.key === s.key)}
                  compareLabel={compareLabel}
                  excerpts={{}}
                  limit={3}
                />
              </BreakdownCard>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {focus.summary && (
              <div>
                <p className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Sparkle size={12} weight="fill" aria-hidden="true" />
                  AI summary
                </p>
                <p className="mt-1 text-sm text-foreground">{focus.summary}</p>
              </div>
            )}
            <SegmentThemes
              question={question}
              segment={focus}
              previous={focusPrev}
              compareLabel={compareLabel}
              excerpts={focus.key === ALL ? data.excerpts : {}}
              collapsible
            />
          </div>
        )}
        {pending && hasThemes && (
          <p className="text-xs text-muted-foreground mt-2">Some newer answers aren't in the themes yet; they're added on the next update.</p>
        )}
      </section>
      <AnswersSheet
        open={reading}
        onOpenChange={setReading}
        sourceId={source.id}
        title={source.name}
        period={active}
        themes={question.themes}
        breakdowns={breakdowns.map((b) => b.label)}
        filters={segmentFilters}
        nonAnswers={Object.keys(segmentFilters).filter((label) => breakdowns.some((b) => b.label === label)).length > 1 ? 0 : (focus?.nonAnswers ?? 0)}
      />
    </DesignCard>
  );
};

/** Qualitative metrics configured for a metric group (Metrics → All metrics). */
export const QualitativeSection = ({
  group,
  period,
  compare,
  segmentFilters = {},
  sourceIds,
}: {
  group: string;
  period?: string;
  compare?: string;
  segmentFilters?: Record<string, string>;
  /** Only these qualitative metrics of the group, in this order (a view places them one by one). */
  sourceIds?: string[];
}) => {
  const view = useQualitativeGroup(group);
  const all = view.data?.sources ?? [];
  const sources = sourceIds ? sourceIds.map((id) => all.find((s) => s.id === id)).filter((s): s is Source => Boolean(s)) : all;
  if (sources.length === 0) return null;
  return <GroupView sources={sources} period={period} compare={compare} segmentFilters={segmentFilters} />;
};

/** The questions of one-off datasets answered in the page's period, one after another under one heading. */
export const OneOffQuestions = ({
  sources,
  period,
  segmentFilters = {},
}: {
  /** Only the ones with answers in `period`. */
  sources: Source[];
  period: string;
  segmentFilters?: Record<string, string>;
}) => (
  <div>
    <h2 className="text-lg font-semibold leading-6">{useSectionHeading("One-off questions")}</h2>
    {/* Same 16px between questions as between a view's sections. */}
    <div className="mt-3 flex flex-col gap-4">
      {sources.map((s) => (
        <GroupView key={s.id} sources={[s]} period={period} segmentFilters={segmentFilters} titleFromName />
      ))}
    </div>
  </div>
);

export default QualitativeSection;
