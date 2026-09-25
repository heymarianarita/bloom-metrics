import * as React from "react";
import { Users, Eye, Timer, ChartLineUp, ChartBar, UsersThree } from "@phosphor-icons/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/layout/AppShell";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useParams } from "react-router-dom";
import { changeKind, DECLINE_THRESHOLD, InsightsPanel, type Insight } from "@/components/metrics/InsightsPanel";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { Search, X } from "lucide-react";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import {
  ga4PropertySlug,
  useGa4Analytics,
  type Ga4DailyPoint,
  type Ga4Property,
  type Ga4Totals,
} from "@/hooks/useGa4Analytics";

type DocumentationPlatformRow = Ga4Property & {
  rowTotals?: Ga4Totals;
  rowPreviousTotals?: Ga4Totals;
  viewsPerUser: number;
  /** Relative change in active users versus the previous period. */
  growth: number;
  fastest: boolean;
};

interface TopPageRow {
  id: string;
  platform: string;
  title: string;
  path: string;
  pageViews: number;
  activeUsers: number;
  previousPageViews?: number;
  delta: number;
}


const numberFormatter = new Intl.NumberFormat("en-US");

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const formatDate = (date?: string) => (date ? new Date(date).toLocaleString() : "—");

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00:00";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
};

const formatDayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const EMPTY_TOTALS: Ga4Totals = {
  activeUsers: 0,
  newUsers: 0,
  sessions: 0,
  pageViews: 0,
  engagementDurationSeconds: 0,
  engagementRate: 0,
  avgEngagementPerSession: 0,
  totalUsers: 0,
  engagedSessions: 0,
  avgSessionDurationSeconds: 0,
  sessionsPerUser: 0,
};

const addTotals = (a: Ga4Totals, b?: Ga4Totals): Ga4Totals => {
  if (!b) return a;
  const sessions = a.sessions + b.sessions;
  const activeUsers = a.activeUsers + b.activeUsers;
  const engagementDurationSeconds = a.engagementDurationSeconds + b.engagementDurationSeconds;
  const weightedSessionDuration =
    a.avgSessionDurationSeconds! * a.sessions + (b.avgSessionDurationSeconds ?? 0) * b.sessions;
  const weightedEngagementRate = a.engagementRate * a.sessions + b.engagementRate * b.sessions;
  return {
    activeUsers,
    totalUsers: (a.totalUsers ?? 0) + (b.totalUsers ?? 0),
    newUsers: a.newUsers + b.newUsers,
    sessions,
    engagedSessions: (a.engagedSessions ?? 0) + (b.engagedSessions ?? 0),
    pageViews: a.pageViews + b.pageViews,
    engagementDurationSeconds,
    engagementRate: sessions ? weightedEngagementRate / sessions : 0,
    avgEngagementPerSession: sessions ? engagementDurationSeconds / sessions : 0,
    avgSessionDurationSeconds: sessions ? weightedSessionDuration / sessions : 0,
    sessionsPerUser: activeUsers ? sessions / activeUsers : 0,
  };
};

/** Totals for one property in the selected period (falls back to the snapshot totals). */
const periodTotals = (property: Ga4Property, periodKey: string) =>
  property.periods?.[periodKey]?.totals ?? property.totals;

const previousPeriodTotals = (property: Ga4Property, periodKey: string) =>
  property.periods?.[periodKey]?.previousTotals;

const sumTotals = (properties: Ga4Property[], pick: (p: Ga4Property) => Ga4Totals | undefined) =>
  properties.reduce((acc, property) => addTotals(acc, pick(property)), EMPTY_TOTALS);

const GA4_PERIOD_OPTIONS = [
  { value: "last_30", label: "Last 30 days" },
  { value: "last_60", label: "Last 60 days" },
  { value: "this_quarter", label: "This quarter" },
  { value: "last_quarter", label: "Last quarter" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
];

const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

interface DateRange {
  startDate: string;
  endDate: string;
}

const quarterRange = (year: number, quarter: number): DateRange => ({
  startDate: iso(new Date(Date.UTC(year, quarter * 3, 1))),
  endDate: iso(new Date(Date.UTC(year, quarter * 3 + 3, 0))),
});

/** Current and previous range for the selected period option. */
const resolvePeriod = (value: string): { current: DateRange; previous: DateRange } => {
  const today = new Date();
  const year = today.getUTCFullYear();
  const quarter = Math.floor(today.getUTCMonth() / 3);

  if (value === "last_30" || value === "last_60") {
    const days = value === "last_30" ? 30 : 60;
    const end = today;
    const start = addDays(end, -days + 1);
    return {
      current: { startDate: iso(start), endDate: iso(end) },
      previous: { startDate: iso(addDays(start, -days)), endDate: iso(addDays(start, -1)) },
    };
  }

  if (value === "this_quarter" || value === "last_quarter") {
    const offset = value === "this_quarter" ? 0 : -1;
    const index = quarter + offset;
    const q = ((index % 4) + 4) % 4;
    const y = year + Math.floor(index / 4);
    const prevIndex = index - 1;
    const pq = ((prevIndex % 4) + 4) % 4;
    const py = year + Math.floor(prevIndex / 4);
    return { current: quarterRange(y, q), previous: quarterRange(py, pq) };
  }

  const y = value === "this_year" ? year : year - 1;
  return {
    current: { startDate: iso(new Date(Date.UTC(y, 0, 1))), endDate: iso(new Date(Date.UTC(y, 11, 31))) },
    previous: {
      startDate: iso(new Date(Date.UTC(y - 1, 0, 1))),
      endDate: iso(new Date(Date.UTC(y - 1, 11, 31))),
    },
  };
};

const deltaLabel = (current: number, previous: number, format: (value: number) => string) => {
  const delta = current - previous;
  if (!Number.isFinite(delta)) return undefined;
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${format(Math.abs(delta))} vs prev.`;
};

/** Relative change; when there is no baseline a rise counts as a full swing. */
const pctChange = (current: number, previous: number) => {
  if (previous > 0) return (current - previous) / previous;
  return current > 0 ? 1 : 0;
};

const signedPercent = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(1)}%`;

const yearAgoNote = (current: number, yearAgo?: number) => {
  if (yearAgo === undefined) return undefined;
  if (yearAgo <= 0) return "No data a year ago";
  return `${signedPercent(pctChange(current, yearAgo))} vs last year`;
};

const THRESHOLD_OPTIONS = [
  { value: "0", label: "Never flag" },
  { value: "0.05", label: "Over 5%" },
  { value: "0.1", label: "Over 10%" },
  { value: "0.2", label: "Over 20%" },
  { value: "0.5", label: "Over 50%" },
];

const MOVERS_OPTIONS = [
  { value: "gaining", label: "Gaining most" },
  { value: "losing", label: "Losing most" },
];


const Documentation = () => {
  const { propertySlug } = useParams();
  const [period, setPeriod] = React.useState("last_30");
  const [threshold, setThreshold] = React.useState("0.2");
  const [moversDirection, setMoversDirection] = React.useState("gaining");
  const [moversSearch, setMoversSearch] = React.useState("");
  const thresholdValue = Number(threshold) || 0;

  const { current: ga4Range, previous: ga4PreviousRange } = React.useMemo(
    () => resolvePeriod(period),
    [period],
  );
  const {
    data: ga4Data,
    isLoading: isGa4Loading,
    isFetching: isGa4Fetching,
    error: ga4Error,
    refetch: refetchGa4,
  } = useGa4Analytics(ga4Range);
  const allGa4Properties = React.useMemo(() => ga4Data?.properties ?? [], [ga4Data]);
  const hasPeriodData = React.useMemo(
    () => allGa4Properties.some((property) => property.periods?.[period]),
    [allGa4Properties, period],
  );
  // Older snapshots have no per-period breakdown: fall back to a second request.
  const { data: ga4PreviousData } = useGa4Analytics(ga4PreviousRange, undefined, {
    enabled: !isGa4Loading && !hasPeriodData,
  });

  const selectedProperty = React.useMemo(
    () => (propertySlug ? allGa4Properties.find((p) => ga4PropertySlug(p) === propertySlug) : undefined),
    [allGa4Properties, propertySlug],
  );
  const ga4Properties = React.useMemo(
    () => (propertySlug ? (selectedProperty ? [selectedProperty] : []) : allGa4Properties),
    [allGa4Properties, propertySlug, selectedProperty],
  );

  const ga4Totals = React.useMemo(
    () => sumTotals(ga4Properties, (p) => periodTotals(p, period)),
    [ga4Properties, period],
  );
  const previousTotals = React.useMemo(() => {
    if (hasPeriodData) return sumTotals(ga4Properties, (p) => previousPeriodTotals(p, period));
    const list = ga4PreviousData?.properties ?? [];
    const scoped = propertySlug ? list.filter((p) => ga4PropertySlug(p) === propertySlug) : list;
    return sumTotals(scoped, (p) => p.totals);
  }, [ga4Properties, ga4PreviousData, hasPeriodData, period, propertySlug]);

  /** Same period one year earlier — only available on newer snapshots. */
  const hasYearAgo = React.useMemo(
    () => ga4Properties.some((p) => p.periods?.[period]?.yearAgoTotals),
    [ga4Properties, period],
  );
  const yearAgoTotals = React.useMemo(
    () => sumTotals(ga4Properties, (p) => p.periods?.[period]?.yearAgoTotals),
    [ga4Properties, period],
  );
  const yearAgoOf = (pick: (totals: Ga4Totals) => number) =>
    hasYearAgo ? pick(yearAgoTotals) : undefined;
  const isFlagged = (current: number, previous: number) =>
    thresholdValue > 0 && Math.abs(pctChange(current, previous)) >= thresholdValue;


  /** Daily series for the selected period, summed across the visible properties. */
  const dailySeries = React.useMemo(() => {
    const byDate = new Map<string, Ga4DailyPoint>();
    ga4Properties.forEach((property) => {
      (property.daily ?? []).forEach((point) => {
        if (point.date < ga4Range.startDate || point.date > ga4Range.endDate) return;
        const existing = byDate.get(point.date);
        byDate.set(
          point.date,
          existing
            ? {
                date: point.date,
                activeUsers: existing.activeUsers + point.activeUsers,
                totalUsers: existing.totalUsers + point.totalUsers,
                sessions: existing.sessions + point.sessions,
                engagedSessions: existing.engagedSessions + point.engagedSessions,
                pageViews: existing.pageViews + point.pageViews,
                engagementDurationSeconds:
                  existing.engagementDurationSeconds + point.engagementDurationSeconds,
              }
            : { ...point },
        );
      });
    });
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((point) => ({ ...point, label: formatDayLabel(point.date) }));
  }, [ga4Properties, ga4Range.endDate, ga4Range.startDate]);
  const hasDaily = dailySeries.length > 1;
  const chartTickInterval = Math.max(0, Math.floor(dailySeries.length / 8) - 1);

  const ga4SetupMessage = ga4Error
    ? (ga4Error as Error).message
    : ga4Data?.status === "snapshot_needed"
      ? ga4Data.details ?? "Run pushGa4Reports in Apps Script to send the first Google Analytics snapshot."
      : undefined;

  const ga4Rows: DocumentationPlatformRow[] = React.useMemo(() => {
    const rows = ga4Properties.map((property) => {
      const rowTotals = periodTotals(property, period);
      const rowPreviousTotals = previousPeriodTotals(property, period);
      return {
        ...property,
        rowTotals,
        rowPreviousTotals,
        viewsPerUser:
          rowTotals && rowTotals.activeUsers > 0 ? rowTotals.pageViews / rowTotals.activeUsers : 0,
        growth: pctChange(rowTotals?.activeUsers ?? 0, rowPreviousTotals?.activeUsers ?? 0),
        fastest: false,
      };
    });
    const best = rows.reduce<DocumentationPlatformRow | undefined>(
      (top, row) =>
        row.rowPreviousTotals && (!top || row.growth > top.growth) && row.growth > 0 ? row : top,
      undefined,
    );
    return rows.map((row) => ({ ...row, fastest: best ? row === best : false }));
  }, [ga4Properties, period]);
  const hasGa4Data = ga4Rows.length > 0;

  /** Pages for the selected period; newer snapshots also carry previous-period views. */
  const pageRows: TopPageRow[] = React.useMemo(
    () =>
      ga4Properties.flatMap((property) =>
        (property.periods?.[period]?.pages ?? property.topPages ?? []).map((page) => ({
          id: `${property.id || property.label}-${page.path}`,
          platform: property.label,
          title: page.title || page.path,
          path: page.path,
          pageViews: page.pageViews,
          activeUsers: page.activeUsers,
          previousPageViews: page.previousPageViews,
          delta: page.pageViews - (page.previousPageViews ?? 0),
        })),
      ),
    [ga4Properties, period],
  );

  const topPages = React.useMemo(
    () => [...pageRows].sort((a, b) => b.pageViews - a.pageViews).slice(0, 25),
    [pageRows],
  );

  const hasMovers = React.useMemo(
    () => pageRows.some((row) => row.previousPageViews !== undefined),
    [pageRows],
  );
  const movers = React.useMemo(() => {
    const comparable = pageRows.filter((row) => row.previousPageViews !== undefined);
    const sorted = [...comparable].sort((a, b) =>
      moversDirection === "gaining" ? b.delta - a.delta : a.delta - b.delta,
    );
    return sorted
      .filter((row) => (moversDirection === "gaining" ? row.delta > 0 : row.delta < 0))
      .slice(0, 15);
  }, [pageRows, moversDirection]);

  /** Insights derived from the same GA4 numbers the page shows. */
  const insights: Insight[] = React.useMemo(() => {
    const out: Insight[] = [];
    if (!hasGa4Data) return out;
    const change = (label: string, cur: number, prev: number, fmt: (v: number) => string) => {
      if (prev <= 0 && cur <= 0) return;
      const pct = pctChange(cur, prev);
      out.push({
        kind: changeKind(cur - prev, pct, Math.abs(pct) < 0.005),
        title: `${label} ${pct >= 0 ? "up" : "down"} ${signedPercent(pct).replace(/^[+−]/, "")}`,
        body: `${fmt(cur)} against ${fmt(prev)} in the previous period.`,
      });
    };
    const n = (v: number) => numberFormatter.format(Math.round(v));
    change("Active users", ga4Totals.activeUsers, previousTotals.activeUsers, n);
    change("Page views", ga4Totals.pageViews, previousTotals.pageViews, n);
    change("Engagement rate", ga4Totals.engagementRate, previousTotals.engagementRate, (v) =>
      percentFormatter.format(v),
    );
    const fastest = ga4Rows.find((r) => r.fastest);
    if (fastest && ga4Rows.length > 1) {
      out.unshift({
        kind: "Top mover",
        title: `${fastest.label} is growing fastest`,
        body: `Users ${signedPercent(fastest.growth)} versus the previous period.`,
      });
    }
    const comparable = pageRows.filter((r) => r.previousPageViews !== undefined);
    const gain = [...comparable].sort((a, b) => b.delta - a.delta)[0];
    if (gain && gain.delta > 0) {
      out.push({
        kind: "Growth",
        title: `Biggest gain: ${gain.title}`,
        body: `+${n(gain.delta)} views (${gain.platform}).`,
      });
    }
    const loss = [...comparable].sort((a, b) => a.delta - b.delta)[0];
    if (loss && loss.delta < 0) {
      out.push({
        kind: loss.previousPageViews && Math.abs(loss.delta) / loss.previousPageViews >= DECLINE_THRESHOLD ? "Decline" : "Dip",
        title: `Biggest drop: ${loss.title}`,
        body: `−${n(Math.abs(loss.delta))} views (${loss.platform}).`,
      });
    }
    return out;
  }, [hasGa4Data, ga4Totals, previousTotals, ga4Rows, pageRows]);

  const ga4Columns: DataTableColumn<DocumentationPlatformRow>[] = [
    {
      key: "label",
      header: "Platform",
      sortable: true,
      width: "1.4fr",
      render: (row) => (
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{row.label}</span>
          {row.fastest && (
            <DesignBadge theme="success" styling="light">
              Fastest growing
            </DesignBadge>
          )}
        </span>
      ),
    },
    {
      key: "activeUsers",
      header: "Users",
      sortable: true,
      width: "0.8fr",
      render: (row) => (row.rowTotals ? numberFormatter.format(row.rowTotals.activeUsers) : "—"),
    },
    {
      key: "growth",
      header: "User change",
      sortable: true,
      width: "0.9fr",
      render: (row) =>
        row.rowPreviousTotals ? (
          <DesignBadge theme={row.growth >= 0 ? "success" : "error"} styling="light">
            {signedPercent(row.growth)}
          </DesignBadge>
        ) : (
          "—"
        ),
    },
    {
      key: "sessions",
      header: "Sessions",
      sortable: true,
      width: "0.8fr",
      render: (row) => (row.rowTotals ? numberFormatter.format(row.rowTotals.sessions) : "—"),
    },
    {
      key: "pageViews",
      header: "Views",
      sortable: true,
      width: "0.8fr",
      render: (row) => (row.rowTotals ? numberFormatter.format(row.rowTotals.pageViews) : "—"),
    },
    {
      key: "engagementRate",
      header: "Engagement",
      sortable: true,
      width: "0.8fr",
      render: (row) => (row.rowTotals ? percentFormatter.format(row.rowTotals.engagementRate) : "—"),
    },
    {
      key: "status",
      header: "Status",
      width: "0.8fr",
      render: (row) => (
        <DesignBadge theme={row.error ? "error" : "success"} styling="light">
          {row.error ? "Error" : "Synced"}
        </DesignBadge>
      ),
    },
  ];

  const moverColumns: DataTableColumn<TopPageRow>[] = [
    { key: "title", header: "Page", sortable: true, width: "2fr" },
    { key: "platform", header: "Platform", sortable: true, width: "1fr" },
    {
      key: "previousPageViews",
      header: "Previous",
      sortable: true,
      width: "0.7fr",
      render: (row) => numberFormatter.format(row.previousPageViews ?? 0),
    },
    {
      key: "pageViews",
      header: "Views",
      sortable: true,
      width: "0.7fr",
      render: (row) => numberFormatter.format(row.pageViews),
    },
    {
      key: "delta",
      header: "Change",
      sortable: true,
      width: "0.8fr",
      render: (row) => (
        <DesignBadge theme={row.delta >= 0 ? "success" : "error"} styling="light">
          {`${row.delta > 0 ? "+" : row.delta < 0 ? "−" : ""}${numberFormatter.format(Math.abs(row.delta))}`}
        </DesignBadge>
      ),
    },
  ];


  const topPageColumns: DataTableColumn<TopPageRow>[] = [
    { key: "title", header: "Page", sortable: true, width: "2fr" },
    { key: "platform", header: "Platform", sortable: true, width: "1fr" },
    {
      key: "pageViews",
      header: "Views",
      sortable: true,
      width: "0.7fr",
      render: (row) => numberFormatter.format(row.pageViews),
    },
    {
      key: "activeUsers",
      header: "Users",
      sortable: true,
      width: "0.7fr",
      render: (row) => numberFormatter.format(row.activeUsers),
    },
  ];

  const currentAvgSession = ga4Totals.avgSessionDurationSeconds ?? 0;
  const previousAvgSession = previousTotals.avgSessionDurationSeconds ?? 0;

  /** Tiny trend line for a stat card, taken from the daily series. */
  const spark = (key: keyof Ga4DailyPoint) =>
    hasDaily ? dailySeries.map((point) => Number(point[key] ?? 0)) : undefined;


  const chartCards: {
    title: string;
    lines: { key: keyof Ga4DailyPoint; name: string; color: string; dashed?: boolean; width?: number }[];
  }[] = [
    {
      title: "Users",
      lines: [
        { key: "totalUsers", name: "Total users", color: "var(--primary)" },
        { key: "activeUsers", name: "Active users", color: "#8B5CF6" },
      ],
    },
    {
      title: "Sessions",
      lines: [
        { key: "sessions", name: "Sessions", color: "#2F7FD1" },
        { key: "engagedSessions", name: "Engaged sessions", color: "#28865A" },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader
          title={selectedProperty?.label ?? "Documentation"}
          subtitle={
            selectedProperty
              ? "Google Analytics usage for this documentation property"
              : "Documentation site usage from Google Analytics"
          }
        />
        <DesignSpacer size="medium" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[12px] items-start">
        <DesignCard variant="default" className="lg:col-span-2 min-w-0 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <DesignInputSelect
            className="w-[200px]"
            size="small"
            label="Period"
            options={GA4_PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
          />
          <DesignInputSelect
            className="w-[200px]"
            size="small"
            label="Flag changes"
            options={THRESHOLD_OPTIONS}
            value={threshold}
            onChange={setThreshold}
          />
        </div>

        <DesignSpacer size="medium" />

        {ga4SetupMessage && (
          <>
            <DesignInfoBanner
              type="warning"
              title="Google Analytics snapshot needed"
              description={ga4SetupMessage}
              actionLabel="Refresh"
              onAction={() => refetchGa4()}
            />
            <DesignSpacer size="medium" />
          </>
        )}

        <div className="rounded-[6px] border border-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-[rgba(21,25,26,0.06)] overflow-hidden items-stretch auto-rows-fr">
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Active users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.activeUsers)}
            change={deltaLabel(ga4Totals.activeUsers, previousTotals.activeUsers, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.activeUsers >= previousTotals.activeUsers}
            note={yearAgoNote(ga4Totals.activeUsers, yearAgoOf((t) => t.activeUsers))}
            sparkline={spark("activeUsers")}
            flagged={isFlagged(ga4Totals.activeUsers, previousTotals.activeUsers)}
            icon={<Users size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Total users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.totalUsers ?? 0)}
            change={deltaLabel(ga4Totals.totalUsers ?? 0, previousTotals.totalUsers ?? 0, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={(ga4Totals.totalUsers ?? 0) >= (previousTotals.totalUsers ?? 0)}
            note={yearAgoNote(ga4Totals.totalUsers ?? 0, yearAgoOf((t) => t.totalUsers ?? 0))}
            sparkline={spark("totalUsers")}
            flagged={isFlagged(ga4Totals.totalUsers ?? 0, previousTotals.totalUsers ?? 0)}
            icon={<UsersThree size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="New users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.newUsers)}
            change={deltaLabel(ga4Totals.newUsers, previousTotals.newUsers, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.newUsers >= previousTotals.newUsers}
            note={yearAgoNote(ga4Totals.newUsers, yearAgoOf((t) => t.newUsers))}
            flagged={isFlagged(ga4Totals.newUsers, previousTotals.newUsers)}
            icon={<Users size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Sessions"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.sessions)}
            change={deltaLabel(ga4Totals.sessions, previousTotals.sessions, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.sessions >= previousTotals.sessions}
            note={yearAgoNote(ga4Totals.sessions, yearAgoOf((t) => t.sessions))}
            sparkline={spark("sessions")}
            flagged={isFlagged(ga4Totals.sessions, previousTotals.sessions)}
            icon={<ChartLineUp size={18} />}
          />
        </div>

        <DesignSpacer size="medium" />

        <div className="rounded-[6px] border border-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-[rgba(21,25,26,0.06)] overflow-hidden items-stretch auto-rows-fr">
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Page views"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.pageViews)}
            change={deltaLabel(ga4Totals.pageViews, previousTotals.pageViews, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.pageViews >= previousTotals.pageViews}
            note={yearAgoNote(ga4Totals.pageViews, yearAgoOf((t) => t.pageViews))}
            sparkline={spark("pageViews")}
            flagged={isFlagged(ga4Totals.pageViews, previousTotals.pageViews)}
            icon={<Eye size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Engaged sessions"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.engagedSessions ?? 0)}
            change={deltaLabel(ga4Totals.engagedSessions ?? 0, previousTotals.engagedSessions ?? 0, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={(ga4Totals.engagedSessions ?? 0) >= (previousTotals.engagedSessions ?? 0)}
            note={yearAgoNote(ga4Totals.engagedSessions ?? 0, yearAgoOf((t) => t.engagedSessions ?? 0))}
            sparkline={spark("engagedSessions")}
            flagged={isFlagged(ga4Totals.engagedSessions ?? 0, previousTotals.engagedSessions ?? 0)}
            icon={<ChartLineUp size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Average session duration"
            value={isGa4Loading ? "—" : formatDuration(currentAvgSession)}
            change={deltaLabel(currentAvgSession, previousAvgSession, formatDuration)}
            changeUp={currentAvgSession >= previousAvgSession}
            note={yearAgoNote(currentAvgSession, yearAgoOf((t) => t.avgSessionDurationSeconds ?? 0))}
            flagged={isFlagged(currentAvgSession, previousAvgSession)}
            icon={<Timer size={18} />}
          />
          <DesignStatCard
            className="border-0 rounded-none bg-background"
            label="Engagement rate"
            value={isGa4Loading ? "—" : percentFormatter.format(ga4Totals.engagementRate)}
            change={deltaLabel(
              ga4Totals.engagementRate * 100,
              previousTotals.engagementRate * 100,
              (v) => `${v.toFixed(1)} pp`,
            )}
            changeUp={ga4Totals.engagementRate >= previousTotals.engagementRate}
            note={yearAgoNote(ga4Totals.engagementRate, yearAgoOf((t) => t.engagementRate))}
            flagged={isFlagged(ga4Totals.engagementRate, previousTotals.engagementRate)}
            icon={<ChartBar size={18} />}
          />
        </div>


        <DesignSpacer size="medium" />

        {isGa4Loading && (
          <DesignCard radius="small" className="p-12 flex justify-center">
            <DesignLoader />
          </DesignCard>
        )}

        {!isGa4Loading && hasDaily && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {chartCards.map((card) => (
                <section key={card.title} className="pt-2">
                  <p className="text-[16px] font-medium text-foreground">{card.title}</p>
                  <DesignSpacer size="small" />
                  <div className="h-[292px] w-full rounded-[6px] border border-border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          interval={chartTickInterval}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                        />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {card.lines.map((line) => (
                          <Line
                            key={line.key as string}
                            type="monotone"
                            dataKey={line.key as string}
                            name={line.name}
                            stroke={line.color}
                            strokeWidth={line.width ?? (line.dashed ? 2 : 3)}
                            strokeDasharray={line.dashed ? "5 4" : undefined}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              ))}
            </div>
            <DesignSpacer size="medium" />
          </>
        )}

        {!isGa4Loading && hasGa4Data && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Google Analytics: {ga4Range.startDate} → {ga4Range.endDate} · refreshed {formatDate(ga4Data?.refreshedAt)}
              </p>
              {isGa4Fetching && <DesignBadge theme="muted" styling="light">Refreshing</DesignBadge>}
            </div>
            <DesignSpacer size="small" />
            {!propertySlug && (
              <>
                <section className="pt-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[16px] font-medium text-foreground">{"Documentation platforms"}</p>
                  <p className="text-[12px] text-muted-foreground">{ga4Rows.length} platforms</p>
                </div>
                <DesignSpacer size="small" />
                <DesignCard radius="small" className="overflow-hidden">
                <DesignDataTable
                  columns={ga4Columns}
                  data={ga4Rows}
                  rowKey={(row) => row.id || row.label}
                  hidePagination
                  totalResultsLabel={`${ga4Rows.length} platforms`}
                  searchPlaceholder="Search platforms"
                  emptyTitle="No Google Analytics data yet"
                  emptyBody="Run pushGa4Reports in Apps Script to send the first snapshot."
                />
                </DesignCard>
                </section>
                <DesignSpacer size="medium" />
              </>
            )}
          </>
        )}

        {!isGa4Loading && hasMovers && (
          <>
            <section className="pt-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[16px] font-medium text-foreground">
                {moversDirection === "gaining" ? "Pages gaining the most views" : "Pages losing the most views"}
              </p>
              <div className="flex items-center gap-2">
                <div className="w-[200px]">
                  <DesignInputBar
                    size="small"
                    placeholder="Search pages"
                    leftIcon={<Search className="w-4 h-4" />}
                    rightIcon={moversSearch ? <X className="w-3.5 h-3.5 cursor-pointer" /> : undefined}
                    onRightIconClick={() => setMoversSearch("")}
                    value={moversSearch}
                    onChange={(e) => setMoversSearch(e.target.value)}
                  />
                </div>
                <DesignInputSelect
                  className="w-[200px]"
                  size="small"
                  options={MOVERS_OPTIONS}
                  value={moversDirection}
                  onChange={setMoversDirection}
                />
              </div>
            </div>
            <DesignSpacer size="small" />
            <DesignCard radius="small" className="overflow-hidden">
            <DesignDataTable
              columns={moverColumns}
              data={movers}
              rowKey={(row) => `mover-${row.id}`}
              pageSize={10}
              totalResultsLabel={`${movers.length} pages`}
              hideToolbar
              search={moversSearch}
              emptyTitle={moversSearch ? "No matching pages" : "No movers in this period"}
              emptyBody="No page changed enough versus the previous period."
            />
            </DesignCard>
            </section>
            <DesignSpacer size="medium" />
          </>
        )}

        {!isGa4Loading && topPages.length > 0 && (
          <section className="pt-2">
          <p className="text-[16px] font-medium text-foreground">Most viewed pages</p>
          <DesignSpacer size="small" />
          <DesignCard radius="small" className="overflow-hidden">
          <DesignDataTable
            columns={topPageColumns}
            data={topPages}
            rowKey={(row) => row.id}
            pageSize={10}
            totalResultsLabel={`${topPages.length} pages`}
            searchPlaceholder="Search pages"
            emptyTitle="No pages yet"
            emptyBody="Page-level data arrives with the next Google Analytics snapshot."
          />
          </DesignCard>
          </section>
        )}


        {!isGa4Loading && !hasGa4Data && (
          <DesignCard radius="small">
            <DesignEmptyState
              icon={<ChartBar size={40} />}
              title="No Google Analytics data yet"
              body="Connect Google Analytics in Settings → Dynamic sources, then send a snapshot to see documentation usage here."
            />
          </DesignCard>
        )}
        </DesignCard>
        <InsightsPanel
          subject={selectedProperty?.label ?? "Documentation"}
          insights={insights}
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)]"
        />
        </div>
      </div>
    </AppShell>
  );
};

export default Documentation;
