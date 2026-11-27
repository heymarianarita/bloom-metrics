import * as React from "react";
import { Users, Eye, Timer, ChartLineUp, ChartBar, UsersThree, ArrowSquareOut } from "@phosphor-icons/react";
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
import { DesignStatGroup } from "@/components/ds/DesignStatGroup";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useParams } from "react-router-dom";
import { changeKind, DECLINE_THRESHOLD, InsightsPanel, type Insight } from "@/components/metrics/InsightsPanel";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { Ga4SyncButton } from "@/components/metrics/Ga4SyncButton";
import { Search, X } from "lucide-react";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import {
  ga4PropertySlug,
  useGa4Analytics,
  type Ga4DailyPoint,
  type Ga4Property,
  type Ga4Totals,
} from "@/hooks/useGa4Analytics";
import { formatDateTime } from "@/lib/formatDate";
import { EditViewButton } from "@/components/metrics/EditViewButton";

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
  /** Full address of the page, when the snapshot knows its host. */
  url?: string;
  /** Title and path together, so the Page column sorts and searches on both. */
  page: string;
  pageViews: number;
  activeUsers: number;
  previousPageViews?: number;
  delta: number;
}


const numberFormatter = new Intl.NumberFormat("en-US");

/**
 * A readable page name from its URL path, for sites that give every page the same title.
 * Zeroheight paths look like /2b590eb39/p/644213-dialog/b/973172: the slug after the
 * page id is the name, and a trailing /b/<id> is a tab inside that page.
 */
function pageNameFromPath(path: string): string {
  const segments = path.split(/[?#]/)[0].split("/").filter(Boolean);
  if (segments.length === 0) return "Home page";
  const zeroheightPage = segments.indexOf("p");
  const isZeroheight = zeroheightPage >= 0 && zeroheightPage + 1 < segments.length;
  const slug = isZeroheight
    ? segments[zeroheightPage + 1].replace(/^[0-9a-f]{6}-/, "")
    : segments[segments.length - 1].replace(/\.html?$/, "");
  const words = decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  if (!words) return path;
  const name = words.charAt(0).toUpperCase() + words.slice(1);
  return isZeroheight && segments.includes("b") ? `${name} (tab)` : name;
}

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00:00";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
};

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
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${format(Math.abs(delta))}`;
};

const quarterLabel = (range: DateRange) => `${range.startDate.slice(0, 4)}-Q${Math.floor(Number(range.startDate.slice(5, 7)) / 3) + 1}`;

/** What the period is compared with, in words: the quarter or year itself where it is one. */
const rangeLabel = (period: string, range: DateRange, fallback: string) =>
  period.endsWith("_quarter") ? quarterLabel(range) : period.endsWith("_year") ? range.startDate.slice(0, 4) : fallback;

const yearBefore = (range: DateRange): DateRange => {
  const back = (date: string) => `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
  return { startDate: back(range.startDate), endDate: back(range.endDate) };
};

/** Relative change; when there is no baseline a rise counts as a full swing. */
const pctChange = (current: number, previous: number) => {
  if (previous > 0) return (current - previous) / previous;
  return current > 0 ? 1 : 0;
};

const signedPercent = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(1)}%`;


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


/** Table section header: title on the left; search (and optional controls) on the right, outside the table card. */
const TableSectionHeader = ({
  title,
  search,
  onSearch,
  placeholder,
  children,
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <p className="text-base font-medium text-foreground">{title}</p>
    <div className="flex items-center gap-2">
      <div className="w-[200px]">
        <DesignInputBar
          size="small"
          placeholder={placeholder}
          leftIcon={<Search className="w-4 h-4" />}
          rightIcon={search ? <X className="w-3.5 h-3.5 cursor-pointer" /> : undefined}
          onRightIconClick={() => onSearch("")}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {children}
    </div>
  </div>
);

const Documentation = () => {
  const { propertySlug } = useParams();
  const [period, setPeriod] = React.useState("last_30");
  const [compare, setCompare] = React.useState<"previous" | "year_ago">("previous");
  const [threshold, setThreshold] = React.useState("0.2");
  const [moversDirection, setMoversDirection] = React.useState("gaining");
  const [moversSearch, setMoversSearch] = React.useState("");
  const [platformSearch, setPlatformSearch] = React.useState("");
  const [topPagesSearch, setTopPagesSearch] = React.useState("");
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
    // A year period's previous period already is the year before.
  const canCompareYearAgo = hasYearAgo && !period.endsWith("_year");
  const comparing = compare === "year_ago" && canCompareYearAgo ? "year_ago" : "previous";
  const baseline = comparing === "year_ago" ? yearAgoTotals : previousTotals;
  const days = period.startsWith("last_") && !period.endsWith("_quarter") && !period.endsWith("_year") ? period.slice(5) : "";
  const previousLabel = rangeLabel(period, ga4PreviousRange, `Previous ${days} days`);
  const yearAgoLabel = rangeLabel(period, yearBefore(ga4Range), "Same days last year");
  const compareOptions = [
    { value: "previous", label: previousLabel },
    ...(canCompareYearAgo ? [{ value: "year_ago", label: yearAgoLabel }] : []),
  ];
  const chosenLabel = comparing === "year_ago" ? yearAgoLabel : previousLabel;
  /** The comparison mid-sentence: "previous 30 days", "2026-Q2". */
  const baselineLabel = chosenLabel.charAt(0).toLowerCase() + chosenLabel.slice(1);
  /** The relative change under each card, against the chosen comparison. */
  const changeNote = (current: number, previous: number) => {
    if (isGa4Loading) return undefined;
    if (previous <= 0) return `No data for ${baselineLabel}`;
    return `${signedPercent(pctChange(current, previous))} vs ${baselineLabel}`;
  };
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
      .map((point) => ({ ...point, label: point.date }));
  }, [ga4Properties, ga4Range.endDate, ga4Range.startDate]);
  const hasDaily = dailySeries.length > 1;
  const chartTickInterval = Math.max(0, Math.floor(dailySeries.length / 8) - 1);

  const ga4SetupMessage = ga4Error
    ? (ga4Error as Error).message
    : ga4Data?.status === "snapshot_needed"
      ? ga4Data.details ?? "An editor can click Sync Google Analytics to send the first snapshot."
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
      ga4Properties.flatMap((property) => {
        const pages = property.periods?.[period]?.pages ?? property.topPages ?? [];
        // A title used by several paths is the site-wide title, not the page's own name.
        const pathsByTitle = new Map<string, Set<string>>();
        for (const page of pages) {
          if (!page.title) continue;
          pathsByTitle.set(page.title, (pathsByTitle.get(page.title) ?? new Set()).add(page.path));
        }
        return pages.map((page) => {
          const title =
            page.title && (pathsByTitle.get(page.title)?.size ?? 0) <= 1 ? page.title : pageNameFromPath(page.path);
          return {
            id: `${property.id || property.label}-${page.path}`,
            platform: property.label,
            title,
            path: page.path,
            url: page.host ? `https://${page.host}${page.path.startsWith("/") ? "" : "/"}${page.path}` : undefined,
            page: `${title} ${page.path}`,
            pageViews: page.pageViews,
            activeUsers: page.activeUsers,
            previousPageViews: page.previousPageViews,
            delta: page.pageViews - (page.previousPageViews ?? 0),
          };
        });
      }),
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
      const flat = Math.abs(pct) < 0.005;
      out.push({
        kind: changeKind(cur - prev, pct, flat),
        title: `${label} ${pct >= 0 ? "up" : "down"} ${signedPercent(pct).replace(/^[+−]/, "")}`,
        body: `${fmt(cur)} against ${fmt(prev)} for ${baselineLabel}.`,
        change: {
          label,
          value: fmt(cur),
          delta: flat ? "No change" : signedPercent(pct),
          direction: flat ? "flat" : pct > 0 ? "up" : "down",
          tone: flat ? "neutral" : pct > 0 ? "good" : "bad",
          period: "This range",
          previousPeriod: baselineLabel,
        },
      });
    };
    const n = (v: number) => numberFormatter.format(Math.round(v));
    change("Active users", ga4Totals.activeUsers, baseline.activeUsers, n);
    change("Page views", ga4Totals.pageViews, baseline.pageViews, n);
    change("Engagement rate", ga4Totals.engagementRate, baseline.engagementRate, (v) =>
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
  }, [hasGa4Data, ga4Totals, baseline, baselineLabel, ga4Rows, pageRows]);

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

  /** Many docs pages share one site-wide title, so the path underneath tells them apart. */
  const pageColumn: DataTableColumn<TopPageRow> = {
    key: "page",
    header: "Page",
    sortable: true,
    width: "2fr",
    render: (row) => (
      <span className="flex min-w-0 flex-col">
        {row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-1 hover:underline"
            title={`Open ${row.url}`}
          >
            <span className="truncate">{row.title}</span>
            <ArrowSquareOut size={12} className="shrink-0 text-muted-foreground" />
          </a>
        ) : (
          <span className="truncate" title={row.title}>{row.title}</span>
        )}
        {row.path !== row.title && (
          <span className="truncate text-xs text-muted-foreground" title={row.path}>
            {row.path}
          </span>
        )}
      </span>
    ),
  };

  const moverColumns: DataTableColumn<TopPageRow>[] = [
    pageColumn,
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
    pageColumn,
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
  const baselineAvgSession = baseline.avgSessionDurationSeconds ?? 0;

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
          primaryAction={<EditViewButton tabSlug="documentation" />}
          title={selectedProperty?.label ?? "Documentation"}
          subtitle={
            selectedProperty
              ? "Google Analytics usage for this documentation property"
              : "Documentation site usage from Google Analytics"
          }
        />
        <DesignSpacer size="medium" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
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
          <span className="text-xs text-muted-foreground whitespace-nowrap pb-2">vs</span>
          <DesignInputSelect
            className="w-[200px]"
            size="small"
            label="Compared with"
            options={compareOptions}
            value={comparing}
            onChange={(value) => setCompare(value as "previous" | "year_ago")}
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
            <div className="flex justify-end mb-2">
              <Ga4SyncButton />
            </div>
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

        <DesignStatGroup>
          <DesignStatCard
            label="Active users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.activeUsers)}
            change={deltaLabel(ga4Totals.activeUsers, baseline.activeUsers, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.activeUsers >= baseline.activeUsers}
            note={changeNote(ga4Totals.activeUsers, baseline.activeUsers)}
            sparkline={spark("activeUsers")}
            flagged={isFlagged(ga4Totals.activeUsers, baseline.activeUsers)}
            icon={<Users size={18} />}
          />
          <DesignStatCard
            label="Total users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.totalUsers ?? 0)}
            change={deltaLabel(ga4Totals.totalUsers ?? 0, baseline.totalUsers ?? 0, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={(ga4Totals.totalUsers ?? 0) >= (baseline.totalUsers ?? 0)}
            note={changeNote(ga4Totals.totalUsers ?? 0, baseline.totalUsers ?? 0)}
            sparkline={spark("totalUsers")}
            flagged={isFlagged(ga4Totals.totalUsers ?? 0, baseline.totalUsers ?? 0)}
            icon={<UsersThree size={18} />}
          />
          <DesignStatCard
            label="New users"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.newUsers)}
            change={deltaLabel(ga4Totals.newUsers, baseline.newUsers, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.newUsers >= baseline.newUsers}
            note={changeNote(ga4Totals.newUsers, baseline.newUsers)}
            flagged={isFlagged(ga4Totals.newUsers, baseline.newUsers)}
            icon={<Users size={18} />}
          />
          <DesignStatCard
            label="Sessions"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.sessions)}
            change={deltaLabel(ga4Totals.sessions, baseline.sessions, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.sessions >= baseline.sessions}
            note={changeNote(ga4Totals.sessions, baseline.sessions)}
            sparkline={spark("sessions")}
            flagged={isFlagged(ga4Totals.sessions, baseline.sessions)}
            icon={<ChartLineUp size={18} />}
          />
        </DesignStatGroup>

        <DesignSpacer size="medium" />

        <DesignStatGroup>
          <DesignStatCard
            label="Page views"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.pageViews)}
            change={deltaLabel(ga4Totals.pageViews, baseline.pageViews, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={ga4Totals.pageViews >= baseline.pageViews}
            note={changeNote(ga4Totals.pageViews, baseline.pageViews)}
            sparkline={spark("pageViews")}
            flagged={isFlagged(ga4Totals.pageViews, baseline.pageViews)}
            icon={<Eye size={18} />}
          />
          <DesignStatCard
            label="Engaged sessions"
            value={isGa4Loading ? "—" : numberFormatter.format(ga4Totals.engagedSessions ?? 0)}
            change={deltaLabel(ga4Totals.engagedSessions ?? 0, baseline.engagedSessions ?? 0, (v) =>
              numberFormatter.format(Math.round(v)),
            )}
            changeUp={(ga4Totals.engagedSessions ?? 0) >= (baseline.engagedSessions ?? 0)}
            note={changeNote(ga4Totals.engagedSessions ?? 0, baseline.engagedSessions ?? 0)}
            sparkline={spark("engagedSessions")}
            flagged={isFlagged(ga4Totals.engagedSessions ?? 0, baseline.engagedSessions ?? 0)}
            icon={<ChartLineUp size={18} />}
          />
          <DesignStatCard
            label="Average session duration"
            value={isGa4Loading ? "—" : formatDuration(currentAvgSession)}
            change={deltaLabel(currentAvgSession, baselineAvgSession, formatDuration)}
            changeUp={currentAvgSession >= baselineAvgSession}
            note={changeNote(currentAvgSession, baselineAvgSession)}
            flagged={isFlagged(currentAvgSession, baselineAvgSession)}
            icon={<Timer size={18} />}
          />
          <DesignStatCard
            label="Engagement rate"
            value={isGa4Loading ? "—" : percentFormatter.format(ga4Totals.engagementRate)}
            change={deltaLabel(
              ga4Totals.engagementRate * 100,
              baseline.engagementRate * 100,
              (v) => `${v.toFixed(1)} pp`,
            )}
            changeUp={ga4Totals.engagementRate >= baseline.engagementRate}
            note={changeNote(ga4Totals.engagementRate, baseline.engagementRate)}
            flagged={isFlagged(ga4Totals.engagementRate, baseline.engagementRate)}
            icon={<ChartBar size={18} />}
          />
        </DesignStatGroup>


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
                  <p className="text-base font-medium text-foreground">{card.title}</p>
                  <DesignSpacer size="small" />
                  <div className="h-[292px] w-full rounded-md border border-border p-4">
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
                Google Analytics: {ga4Range.startDate} → {ga4Range.endDate} · refreshed {formatDateTime(ga4Data?.refreshedAt)}
              </p>
              <div className="flex items-center gap-2">
                {isGa4Fetching && <DesignBadge theme="muted" styling="light">Refreshing</DesignBadge>}
                <Ga4SyncButton />
              </div>
            </div>
            <DesignSpacer size="small" />
            {!propertySlug && (
              <>
                <section className="pt-2">
                <TableSectionHeader
                  title="Documentation platforms"
                  search={platformSearch}
                  onSearch={setPlatformSearch}
                  placeholder="Search platforms"
                />
                <DesignSpacer size="small" />
                <div>
                <DesignDataTable
                  columns={ga4Columns}
                  data={ga4Rows}
                  rowKey={(row) => row.id || row.label}
                  hidePagination
                  hideToolbar
                  search={platformSearch}
                  emptyTitle={platformSearch ? "No matching platforms" : "No Google Analytics data yet"}
                  emptyBody="An editor can click Sync Google Analytics to send the first snapshot."
                />
                </div>
                </section>
                <DesignSpacer size="medium" />
              </>
            )}
          </>
        )}

        {!isGa4Loading && hasMovers && (
          <>
            <section className="pt-2">
            <TableSectionHeader
              title={moversDirection === "gaining" ? "Pages gaining the most views" : "Pages losing the most views"}
              search={moversSearch}
              onSearch={setMoversSearch}
              placeholder="Search pages"
            >
              <DesignInputSelect
                className="w-[152px]"
                size="small"
                options={MOVERS_OPTIONS}
                value={moversDirection}
                onChange={setMoversDirection}
              />
            </TableSectionHeader>
            <DesignSpacer size="small" />
            <div>
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
            </div>
            </section>
            <DesignSpacer size="medium" />
          </>
        )}

        {!isGa4Loading && topPages.length > 0 && (
          <section className="pt-2">
          <TableSectionHeader
            title="Most viewed pages"
            search={topPagesSearch}
            onSearch={setTopPagesSearch}
            placeholder="Search pages"
          />
          <DesignSpacer size="small" />
          <div>
          <DesignDataTable
            columns={topPageColumns}
            data={topPages}
            rowKey={(row) => row.id}
            pageSize={10}
            totalResultsLabel={`${topPages.length} pages`}
            hideToolbar
            search={topPagesSearch}
            emptyTitle={topPagesSearch ? "No matching pages" : "No pages yet"}
            emptyBody="Page-level data arrives with the next Google Analytics snapshot."
          />
          </div>
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
          chat={{
            page: "Metrics › Documentation (Google Analytics for the docs sites)",
            view: {
              period,
              range: ga4Range,
              previousRange: ga4PreviousRange,
              property: selectedProperty?.label ?? "All properties",
              totals: ga4Totals,
              previousTotals,
              ...(hasYearAgo && { yearAgoTotals }),
              comparedWith: baselineLabel,
              perProperty: ga4Rows.map((r) => ({ label: r.label, totals: r.rowTotals, previousTotals: r.rowPreviousTotals })),
              topPages: topPages.slice(0, 10).map((p) => ({ path: p.path, pageViews: p.pageViews, previousPageViews: p.previousPageViews })),
            },
            suggestions: [
              "Summarise documentation usage for a status update",
              "Which pages gained or lost the most views, and why might that be?",
              "Compare the platforms: which docs site is growing fastest?",
            ],
          }}
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)]"
        />
        </div>
      </div>
    </AppShell>
  );
};

export default Documentation;
