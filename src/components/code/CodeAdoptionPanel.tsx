import * as React from "react";
import { useSectionHeading } from "@/components/metrics/sectionHeading";
import { useNavigate } from "react-router-dom";
import { Code } from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DesignStatGroup } from "@/components/ds/DesignStatGroup";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import type { Insight } from "@/components/metrics/InsightsPanel";
import {
  useCodeAdoption,
  useCodeAdoptionScan,
  type CodeAdoptionDetail,
  type CodeAdoptionDomain,
  type CodeAdoptionRepo,
  type CodeAdoptionSnapshot,
} from "@/hooks/useCodeAdoption";
import { LINE_COLORS } from "@/lib/chartColors";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import {
  DEFAULT_CODE_ADOPTION_CHARTS,
  reportRepo,
  type CodeAdoptionCharts,
  type TrendChart,
} from "../../../server/shared/codeAdoptionCharts.ts";
import type { CodeSection } from "@/hooks/useViewItems";
import { bucketPeriod, comparePeriods, type Periodicity } from "../../../server/shared/periods.ts";

/** The four shares every ds-analyzer report splits UI elements into; they add up to 100%. */
const SHARES = [
  { key: "ds_percent", domainKey: "dsPercent", label: "Bloom components", higherIsBetter: true },
  { key: "tagged_percent", domainKey: "taggedPercent", label: "Greenhouse (tagged)", higherIsBetter: true },
  { key: "native_percent", domainKey: "nativePercent", label: "Native HTML", higherIsBetter: false },
  { key: "untagged_percent", domainKey: "untaggedCustomPercent", label: "Untagged custom UI", higherIsBetter: false },
] as const;

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v.toFixed(1)}%`);
const pts = (d: number) => `${d >= 0 ? "+" : ""}${d.toFixed(1)} pts`;
/** "vinted/checkout-web" → "checkout-web"; files without a CODEOWNERS entry come as "unknown". */
const teamName = (domain: string) => (domain === "unknown" ? "No owner" : domain.replace(/^vinted\//, ""));

type TeamRow = {
  key: string;
  team: string;
  files: number;
  bloom: number;
  ds: number | null;
  change: number | null;
  greenhouse: number | null;
  native: number | null;
  untagged: number | null;
};

export interface CodeAdoptionContext {
  insights: Insight[];
  view: Record<string, unknown>;
}

/** Scans of a repo bucketed into the page's periods (e.g. 2026-Q3). */
export const scanPeriod = (scan: CodeAdoptionSnapshot, periodicity: Periodicity) =>
  bucketPeriod(scan.generated_at, periodicity);

const teamRows = (current?: CodeAdoptionDetail | null, compared?: CodeAdoptionDetail | null): TeamRow[] => {
  const before = new Map((compared?.domains ?? []).map((d) => [d.domain, d]));
  return (current?.domains ?? []).map((d: CodeAdoptionDomain) => {
    const prev = before.get(d.domain);
    return {
      key: d.domain,
      team: teamName(d.domain),
      files: d.fileCount,
      bloom: d.elements.ds,
      ds: d.dsPercent,
      change: d.dsPercent !== null && prev?.dsPercent != null ? Number((d.dsPercent - prev.dsPercent).toFixed(2)) : null,
      greenhouse: d.taggedPercent,
      native: d.nativePercent,
      untagged: d.untaggedCustomPercent,
    };
  });
};

/** Teams with this many UI elements or fewer are too small for "lowest adoption" call-outs. */
const MIN_ELEMENTS = 50;
const elementsOf = (detail: CodeAdoptionDetail | null | undefined, domain: string) => {
  const e = detail?.domains.find((d) => d.domain === domain)?.elements;
  return e ? e.ds + e.greenhouse + e.native + e.untagged : 0;
};

/** The scans being compared, and how to say when the earlier one was ("this week", "since 2026-Q2"). */
interface Shown {
  snaps: CodeAdoptionSnapshot[];
  last: CodeAdoptionSnapshot;
  prev?: CodeAdoptionSnapshot;
  detail?: CodeAdoptionDetail | null;
  since: string;
}

function buildInsights(repo: CodeAdoptionRepo, rows: TeamRow[], shown: Shown): Insight[] {
  const out: Insight[] = [];
  const { last, prev, snaps, detail, since } = shown;
  const first = snaps[0];
  if (last?.ds_percent != null && prev?.ds_percent != null) {
    const d = last.ds_percent - prev.ds_percent;
    out.push({
      kind: d >= 0 ? "Growth" : "Decline",
      title: d >= 0 ? `Bloom share up ${pts(d)} ${since}` : `Bloom share down ${pts(Math.abs(d))} ${since}`,
      body: `${pct(last.ds_percent)} of UI elements in ${repo.repo} use Bloom, against ${pct(prev.ds_percent)} in the ${formatDate(prev.generated_at)} scan${
        first && first !== prev && first !== last && first.ds_percent != null ? ` and ${pct(first.ds_percent)} on ${formatDate(first.generated_at)}` : ""
      }.`,
    });
  }
  const sized = rows.filter((r) => r.key !== "unknown" && r.ds !== null && elementsOf(detail, r.key) > MIN_ELEMENTS);
  const lowest = [...sized].sort((a, b) => (a.ds ?? 0) - (b.ds ?? 0)).slice(0, 3);
  if (lowest.length) {
    out.push({
      kind: "Risk",
      title: `Lowest Bloom adoption: ${lowest.map((r) => r.team).join(", ")}`,
      body: `${lowest.map((r) => `${r.team} ${pct(r.ds)}`).join(", ")} — among teams with more than ${MIN_ELEMENTS} UI elements.`,
    });
  }
  const movers = rows.filter((r) => r.change !== null && Math.abs(r.change) >= 1).sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  if (movers[0] && (movers[0].change ?? 0) > 0) {
    out.push({
      kind: "Top mover",
      title: `${movers[0].team} moved most towards Bloom`,
      body: `${pts(movers[0].change!)} to ${pct(movers[0].ds)} since the ${prev ? `${formatDate(prev.generated_at)} ` : "previous "}scan.`,
    });
  }
  const unused = (detail?.greenhouse ?? []).filter((g) => g.count === 0);
  if (unused.length) {
    out.push({
      kind: "Needs attention",
      title: `${unused.length} Greenhouse component${unused.length === 1 ? " is" : "s are"} never used`,
      body: `${unused.map((g) => g.name).join(", ")} — registered but with no usages in ${repo.repo}.`,
    });
  }
  return out;
}

const TEAM_VIEWS = [
  { id: "all", label: "All teams", match: () => true },
  { id: "below", label: "Below 50% Bloom", match: (r: TeamRow) => (r.ds ?? 0) < 50 },
  { id: "up", label: "Improved", match: (r: TeamRow) => (r.change ?? 0) > 0 },
  { id: "down", label: "Declined", match: (r: TeamRow) => (r.change ?? 0) < 0 },
];

const sortRows = <T extends Record<string, unknown>>(rows: T[], key: string, dir: "asc" | "desc" | null) => {
  if (!dir) return rows;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    const cmp = typeof x === "number" || typeof y === "number" ? Number(x ?? -Infinity) - Number(y ?? -Infinity) : String(x).localeCompare(String(y));
    return dir === "asc" ? cmp : -cmp;
  });
};

const tooltipStyle = { borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 };
const percentAxis = {
  tick: { fontSize: 12 },
  stroke: "var(--muted-foreground)",
  domain: [0, 100] as [number, number],
  // Shares add up to 100%; rounding in a report must not stretch the axis past it.
  allowDataOverflow: true,
  tickFormatter: (v: number) => `${v}%`,
};

/** The four shares per weekly scan, as a line, stacked area or 100% stacked bar chart. */
const TrendChartView = ({ kind, data }: { kind: TrendChart; data: Record<string, string | number | null>[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    {kind === "area" ? (
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis {...percentAxis} width={44} />
        <Tooltip formatter={(v: number) => pct(v)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SHARES.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.label}
            stackId="shares"
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            fill={LINE_COLORS[i % LINE_COLORS.length]}
            fillOpacity={0.35}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    ) : kind === "stacked_bar" ? (
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis {...percentAxis} width={44} />
        <Tooltip formatter={(v: number) => pct(v)} contentStyle={tooltipStyle} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SHARES.map((s, i) => (
          <Bar key={s.key} dataKey={s.label} stackId="shares" fill={LINE_COLORS[i % LINE_COLORS.length]} maxBarSize={48} />
        ))}
      </BarChart>
    ) : (
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis {...percentAxis} width={44} />
        <Tooltip formatter={(v: number) => pct(v)} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {SHARES.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.label}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
            activeDot={{ r: 6, strokeWidth: 2, fill: "var(--background)" }}
            connectNulls
          />
        ))}
      </LineChart>
    )}
  </ResponsiveContainer>
);

/** Bars shown at most in the team and Greenhouse charts; the tables list everything. */
const MAX_BARS = 15;
const BAR_ROW = 28;

/** Each team's split of UI elements as one 100% stacked bar, biggest teams first. */
const TeamsChartView = ({ detail, rows }: { detail?: CodeAdoptionDetail | null; rows: TeamRow[] }) => {
  const byDomain = new Map((detail?.domains ?? []).map((d) => [d.domain, d]));
  const data = [...rows]
    .sort((a, b) => b.files - a.files)
    .slice(0, MAX_BARS)
    .map((r) => {
      const d = byDomain.get(r.key);
      return { team: r.team, ...Object.fromEntries(SHARES.map((s) => [s.label, d?.[s.domainKey] ?? null])) };
    });
  if (data.length === 0) return null;
  return (
    <div style={{ height: data.length * BAR_ROW + 72 }} className="w-full rounded-[6px] border border-border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...percentAxis} />
          <YAxis type="category" dataKey="team" width={140} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" interval={0} />
          <Tooltip formatter={(v: number) => pct(v)} contentStyle={tooltipStyle} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SHARES.map((s, i) => (
            <Bar key={s.key} dataKey={s.label} stackId="shares" fill={LINE_COLORS[i % LINE_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Usages per Greenhouse component, most used first. */
const GreenhouseChartView = ({ rows }: { rows: { name: string; count: number }[] }) => {
  const data = [...rows].sort((a, b) => b.count - a.count).slice(0, MAX_BARS);
  if (data.length === 0) return null;
  return (
    <div style={{ height: data.length * BAR_ROW + 48 }} className="w-full rounded-[6px] border border-border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" interval={0} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--border)", opacity: 0.4 }} />
          <Bar dataKey="count" name="Usages" fill={LINE_COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** A section heading with a short note on the right, as used above each chart. */
const SectionTitle = ({ title, note }: { title: string; note?: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <p className="text-[16px] font-medium text-foreground shrink-0">{useSectionHeading(title)}</p>
    {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
  </div>
);

/** Code adoption for the product repos whose report is pointed at `metricGroupId`; nothing when none is. */
const CodeAdoptionPanel = ({
  metricGroupId,
  reportPath,
  sections,
  chartOverrides,
  onContextChange,
  period,
  compare,
  periodicity = "quarterly",
  bare,
}: {
  /** Every report pointed at this metric (sub)group, with a switch between them. */
  metricGroupId?: string;
  /** Or exactly one report (a view's placed sections). */
  reportPath?: string;
  /** Only these parts of the report, in this order; all of them when left out. */
  sections?: CodeSection[];
  /** How a view draws each part, over the report's own chart choices. */
  chartOverrides?: Partial<CodeAdoptionCharts>;
  onContextChange?: (ctx: CodeAdoptionContext) => void;
  /**
   * The page's period filter: shows the last scan in `period` against the last scan in
   * `compare`, with the trend between the two. Without it, the latest scan against the one before.
   */
  period?: string;
  compare?: string;
  periodicity?: Periodicity;
  /** Without the scan line and sync banners: a later part of a report already drawn above. */
  bare?: boolean;
}) => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCodeAdoption();
  const targeted = React.useMemo(
    () =>
      (data?.reports ?? []).filter((r) => (reportPath ? r.path === reportPath : r.metricGroupId === metricGroupId)),
    [data?.reports, metricGroupId, reportPath],
  );
  const repos = React.useMemo(
    () =>
      (data?.repos ?? []).filter((r) =>
        reportPath ? r.repo === reportRepo(reportPath) : r.metricGroupId === metricGroupId,
      ),
    [data?.repos, metricGroupId, reportPath],
  );
  const [repoName, setRepoName] = React.useState<string>();
  const repo = repos.find((r) => r.repo === repoName) ?? repos[0];

  const allSnaps = React.useMemo(() => repo?.snapshots ?? [], [repo]);
  const filtered = Boolean(period && compare);
  // Scans to show: the last one in the period against the last one in the compared period
  // (or, comparing a period with itself, against its first scan), with the trend in between.
  const { snaps, last, prev } = React.useMemo(() => {
    if (!filtered) {
      return {
        snaps: allSnaps,
        last: allSnaps[allSnaps.length - 1] as CodeAdoptionSnapshot | undefined,
        prev: allSnaps[allSnaps.length - 2] as CodeAdoptionSnapshot | undefined,
      };
    }
    const inPeriod = (p: string) => allSnaps.filter((s) => scanPeriod(s, periodicity) === p);
    const current = inPeriod(period!);
    const last = current[current.length - 1];
    const earlier = compare === period ? current[0] : inPeriod(compare!).at(-1);
    const [from, to] = comparePeriods(compare!, period!) <= 0 ? [compare!, period!] : [period!, compare!];
    return {
      snaps: allSnaps.filter((s) => {
        const p = scanPeriod(s, periodicity);
        return comparePeriods(p, from) >= 0 && comparePeriods(p, to) <= 0;
      }),
      last,
      prev: earlier && earlier !== last ? earlier : undefined,
    };
  }, [allSnaps, filtered, period, compare, periodicity]);
  const since = !filtered ? "this week" : compare === period ? `during ${period}` : `since ${compare}`;
  const rangeNote = !filtered
    ? ""
    : compare === period
      ? ` · ${period}`
      : comparePeriods(compare!, period!) < 0
        ? ` · ${compare}–${period}`
        : ` · ${period}–${compare}`;

  // Team and Greenhouse breakdowns come with the latest two scans; any other one is fetched.
  const known = (s?: CodeAdoptionSnapshot) =>
    !s ? null : [repo?.latest, repo?.previous].find((d) => d?.generated_at === s.generated_at);
  const lastFetch = useCodeAdoptionScan(repo?.repo, last && !known(last) ? last.generated_at : undefined);
  const prevFetch = useCodeAdoptionScan(repo?.repo, prev && !known(prev) ? prev.generated_at : undefined);
  const lastDetail = last ? (known(last) ?? lastFetch.data ?? null) : null;
  const prevDetail = prev ? (known(prev) ?? prevFetch.data ?? null) : null;

  const rows = React.useMemo(() => teamRows(lastDetail, prevDetail), [lastDetail, prevDetail]);
  const [view, setView] = React.useState("all");
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" | null }>({ key: "files", dir: "desc" });
  const views = TEAM_VIEWS.map((v) => ({ ...v, rows: rows.filter(v.match) }));
  const active = views.find((v) => v.id === view) ?? views[0];

  const greenhouseRows = React.useMemo(() => {
    const before = new Map((prevDetail?.greenhouse ?? []).map((g) => [g.name, g.count]));
    return (lastDetail?.greenhouse ?? []).map((g) => ({
      key: g.name,
      name: g.name,
      count: g.count,
      change: before.has(g.name) ? g.count - before.get(g.name)! : null,
    }));
  }, [lastDetail, prevDetail]);
  const [ghSort, setGhSort] = React.useState<{ key: string; dir: "asc" | "desc" | null }>({ key: "count", dir: "desc" });

  const charts = { ...(repo?.charts ?? DEFAULT_CODE_ADOPTION_CHARTS), ...chartOverrides };
  const chartData = snaps.map((s) => ({
    period: formatDate(s.generated_at),
    ...Object.fromEntries(SHARES.map((sh) => [sh.label, s[sh.key]])),
  }));

  React.useEffect(() => {
    if (!onContextChange) return;
    if (!repo || !last) {
      onContextChange({ insights: [], view: {} });
      return;
    }
    onContextChange({
      insights: buildInsights(repo, rows, { snaps, last, prev, detail: lastDetail, since }),
      view: {
        repo: repo.repo,
        repository: repo.repository,
        ...(filtered ? { period, comparedWith: compare, comparedScan: prev?.generated_at ?? null } : {}),
        latestScan: last && { date: last.generated_at, ...Object.fromEntries(SHARES.map((s) => [s.label, last[s.key]])), summary: last.summary },
        history: snaps.map((s) => ({ date: formatDate(s.generated_at), bloomPercent: s.ds_percent, greenhousePercent: s.tagged_percent, nativePercent: s.native_percent, untaggedCustomPercent: s.untagged_percent })),
        teams: rows.map(({ key: _k, ...r }) => r),
        greenhouseComponents: greenhouseRows.map(({ key: _k, ...g }) => g),
      },
    });
  }, [onContextChange, repo, rows, greenhouseRows, snaps, last, prev, lastDetail, since, filtered, period, compare]);

  const teamColumns: DataTableColumn<TeamRow>[] = [
    { key: "team", header: "Team", sortable: true, width: "2fr" },
    { key: "files", header: "Files", sortable: true, width: "0.7fr", render: (r) => r.files.toLocaleString() },
    {
      key: "ds",
      header: "Bloom",
      sortable: true,
      width: "0.8fr",
      render: (r) => <span className={(r.ds ?? 0) < 50 ? "text-destructive font-medium" : ""}>{pct(r.ds)}</span>,
    },
    {
      key: "change",
      header: "Change",
      sortable: true,
      width: "0.8fr",
      render: (r) =>
        r.change === null || r.change === 0 ? "—" : (
          <span className={r.change > 0 ? "text-[var(--btn-success)]" : "text-destructive"}>{pts(r.change)}</span>
        ),
    },
    { key: "untagged", header: "Custom UI", sortable: true, width: "0.8fr", render: (r) => pct(r.untagged) },
  ];

  const ghColumns: DataTableColumn<(typeof greenhouseRows)[number]>[] = [
    { key: "name", header: "Component", sortable: true, width: "2fr" },
    { key: "count", header: "Usages", sortable: true, width: "1fr", render: (r) => r.count.toLocaleString() },
    {
      key: "change",
      header: "Change",
      sortable: true,
      width: "1fr",
      render: (r) => (r.change === null || r.change === 0 ? "—" : `${r.change > 0 ? "+" : ""}${r.change.toLocaleString()}`),
    },
  ];

  // The sections to draw, in order: those placed in the view, or all of them by the report's chart choices.
  const shownSections: CodeSection[] = sections ?? ["shares", "trend", "teams", "greenhouse"];
  // A placed section is always drawn: "Don't show" falls back to the default chart.
  const trendChart = charts.trend === "hidden" ? (sections ? DEFAULT_CODE_ADOPTION_CHARTS.trend : null) : charts.trend;
  const teamsChart = charts.teams === "hidden" ? (sections ? DEFAULT_CODE_ADOPTION_CHARTS.teams : null) : charts.teams;
  const greenhouseChart =
    charts.greenhouse === "hidden" ? (sections ? DEFAULT_CODE_ADOPTION_CHARTS.greenhouse : null) : charts.greenhouse;

  const renderSection = (section: CodeSection) => {
    if (!last) return null;
    switch (section) {
      case "shares":
        return (
          <DesignStatGroup className="mx-5 mb-3">
            {SHARES.map((s) => {
              const cur = last[s.key];
              const before = prev?.[s.key];
              const d = cur !== null && before != null ? cur - before : null;
              return (
                <DesignStatCard
                  key={s.key}
                  label={s.label}
                  value={pct(cur)}
                  change={d === null ? undefined : pts(d)}
                  changeUp={d === null ? true : s.higherIsBetter ? d >= 0 : d <= 0}
                  note={d === null ? undefined : `vs ${formatDate(prev!.generated_at)} scan`}
                />
              );
            })}
          </DesignStatGroup>
        );
      case "trend":
        return (
          trendChart && (
            <section className="px-5 pb-3 pt-2">
              <SectionTitle
                title="Evolution over time"
                note={`One ${trendChart === "stacked_bar" ? "bar" : "point"} per weekly scan${rangeNote}`}
              />
              <DesignSpacer size="small" />
              <div className="h-[256px] w-full rounded-[6px] border border-border p-4">
                <TrendChartView kind={trendChart} data={chartData} />
              </div>
            </section>
          )
        );
      case "teams":
        return (
          <>
            {(teamsChart === "stacked_bar" || teamsChart === "both") && (
              <section className="px-5 pb-3 pt-2">
                <SectionTitle
                  title="Adoption by team"
                  note={rows.length > MAX_BARS ? `The ${MAX_BARS} teams with most files` : "Share of UI elements per team"}
                />
                <DesignSpacer size="small" />
                <TeamsChartView detail={lastDetail} rows={rows} />
              </section>
            )}
            {(teamsChart === "table" || teamsChart === "both") && (
              <DesignDataTable
                title={teamsChart === "both" ? "Teams" : "Adoption by team"}
                searchInTitle
                columns={teamColumns}
                data={sortRows(active.rows, sort.key, sort.dir)}
                tabs={views.map((v) => ({ id: v.id, label: v.label, count: v.rows.length }))}
                activeTab={active.id}
                onTabChange={setView}
                sortKey={sort.key}
                sortDirection={sort.dir}
                onSortChange={(key, dir) => setSort({ key, dir })}
                rowKey={(r) => r.key}
                searchPlaceholder="Search teams"
                pageSize={10}
                totalResultsLabel={`${active.rows.length} teams`}
                emptyTitle="No teams found"
                emptyBody="No teams match this view."
              />
            )}
          </>
        );
      case "greenhouse":
        return greenhouseChart === "bar" ? (
          <section className="px-5 pb-3 pt-4">
            <SectionTitle
              title="Greenhouse components"
              note={greenhouseRows.length > MAX_BARS ? `The ${MAX_BARS} most used` : "Usages in the latest scan"}
            />
            <DesignSpacer size="small" />
            <GreenhouseChartView rows={greenhouseRows} />
          </section>
        ) : greenhouseChart === "table" ? (
          <>
            <DesignSpacer size="medium" />
            <DesignDataTable
              title="Greenhouse components"
              searchInTitle
              columns={ghColumns}
              data={sortRows(greenhouseRows, ghSort.key, ghSort.dir)}
              sortKey={ghSort.key}
              sortDirection={ghSort.dir}
              onSortChange={(key, dir) => setGhSort({ key, dir })}
              rowKey={(r) => r.key}
              searchPlaceholder="Search components"
              pageSize={10}
              totalResultsLabel={`${greenhouseRows.length} components`}
              emptyTitle="No Greenhouse components"
              emptyBody="This report lists no Greenhouse components."
            />
          </>
        ) : null;
    }
  };

  if (!isLoading && !error && targeted.length === 0 && repos.length === 0) return null;

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <DesignLoader />
      </div>
    );
  }

  const lastRunFailed = data?.lastRun?.status === "error";

  return (
    <>
      {!bare && (
        <>
          <div className="px-5 pt-5 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {repos.length > 1 &&
              repos.map((r) => (
                <DesignButton
                  key={r.repo}
                  size="small"
                  variant={r.repo === repo?.repo ? "filled" : "outlined"}
                  theme={r.repo === repo?.repo ? "primary" : "muted"}
                  onClick={() => setRepoName(r.repo)}
                >
                  {r.repo}
                </DesignButton>
              ))}
            {last && (
              <p className="text-[12px] text-muted-foreground">
                {repo?.repo} · scanned {formatDate(last.generated_at)} · {last.summary.totalFiles.toLocaleString()} files ·{" "}
                {snaps.length} weekly report{snaps.length === 1 ? "" : "s"}
                {filtered ? ` shown, of ${allSnaps.length}` : ""} from {repo?.repository}
              </p>
            )}
          </div>

          {error && (
            <div className="px-5 pb-3">
              <DesignInfoBanner type="error" title="Could not load code adoption" description={(error as Error).message} />
            </div>
          )}

          {data && !data.configured && (
            <div className="px-5 pb-3">
              <DesignInfoBanner
                type="warning"
                title="GitHub is not connected yet"
                description={`Add a read-only GitHub token for ${[...new Set(targeted.map((r) => r.repository))].join(", ")} in Settings → Dynamic sources → Code adoption. Reports are then pulled automatically every day.`}
                actionLabel="Open data sources"
                onAction={() => navigate("/settings/data-sources?source=code_adoption")}
                showCloseButton={false}
              />
            </div>
          )}

          {data?.configured && lastRunFailed && (
            <div className="px-5 pb-3">
              <DesignInfoBanner
                type="error"
                title={`Last GitHub sync failed (${formatDateTime(data.lastRun!.ran_at)})`}
                description={data.lastRun!.message}
              />
            </div>
          )}
        </>
      )}

      {repo && allSnaps.length > 0 && !last ? (
        <div className="p-5">
          <DesignEmptyState
            icon={<Code size={40} />}
            title={`No code scan in ${period}`}
            body={`Weekly reports for ${repo.repo} run from ${formatDate(allSnaps[0].generated_at)} to ${formatDate(
              allSnaps[allSnaps.length - 1].generated_at,
            )}. Pick a period in that range.`}
          />
        </div>
      ) : !repo || !last ? (
        data && (
          <div className="p-5">
            <DesignEmptyState
              icon={<Code size={40} />}
              title="No code adoption reports yet"
              body={
                data.configured
                  ? "Reports are pulled from GitHub when the app starts and every morning. Use Sync now in Settings → Dynamic sources to fetch them straight away."
                  : "Connect GitHub to pull the weekly ds-analyzer reports."
              }
            />
          </div>
        )
      ) : (
        <>
          {shownSections.map((section) => (
            <React.Fragment key={section}>{renderSection(section)}</React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

export default CodeAdoptionPanel;
