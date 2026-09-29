import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Code } from "@phosphor-icons/react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  type CodeAdoptionDomain,
  type CodeAdoptionRepo,
  type CodeAdoptionSnapshot,
} from "@/hooks/useCodeAdoption";
import { LINE_COLORS } from "@/lib/chartColors";
import { formatDate, formatDateTime } from "@/lib/formatDate";

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

const teamRows = (repo: CodeAdoptionRepo): TeamRow[] => {
  const before = new Map((repo.previous?.domains ?? []).map((d) => [d.domain, d]));
  return (repo.latest?.domains ?? []).map((d: CodeAdoptionDomain) => {
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
const elementsOf = (r: CodeAdoptionRepo, domain: string) => {
  const e = r.latest?.domains.find((d) => d.domain === domain)?.elements;
  return e ? e.ds + e.greenhouse + e.native + e.untagged : 0;
};

function buildInsights(repo: CodeAdoptionRepo, rows: TeamRow[]): Insight[] {
  const out: Insight[] = [];
  const snaps = repo.snapshots;
  const last = snaps[snaps.length - 1];
  const prev = snaps[snaps.length - 2];
  const first = snaps[0];
  if (last?.ds_percent != null && prev?.ds_percent != null) {
    const d = last.ds_percent - prev.ds_percent;
    out.push({
      kind: d >= 0 ? "Growth" : "Decline",
      title: d >= 0 ? `Bloom share up ${pts(d)} this week` : `Bloom share down ${pts(Math.abs(d))} this week`,
      body: `${pct(last.ds_percent)} of UI elements in ${repo.repo} use Bloom, against ${pct(prev.ds_percent)} in the ${formatDate(prev.generated_at)} scan${
        first && first !== prev && first.ds_percent != null ? ` and ${pct(first.ds_percent)} on ${formatDate(first.generated_at)}` : ""
      }.`,
    });
  }
  const sized = rows.filter((r) => r.key !== "unknown" && r.ds !== null && elementsOf(repo, r.key) > MIN_ELEMENTS);
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
      body: `${pts(movers[0].change!)} to ${pct(movers[0].ds)} since the previous scan.`,
    });
  }
  const unused = (repo.latest?.greenhouse ?? []).filter((g) => g.count === 0);
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

/** Code adoption for the product repos whose report is pointed at `metricGroupId`; nothing when none is. */
const CodeAdoptionPanel = ({
  metricGroupId,
  onContextChange,
}: {
  metricGroupId: string;
  onContextChange?: (ctx: CodeAdoptionContext) => void;
}) => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCodeAdoption();
  const targeted = React.useMemo(
    () => (data?.reports ?? []).filter((r) => r.metricGroupId === metricGroupId),
    [data?.reports, metricGroupId],
  );
  const repos = React.useMemo(
    () => (data?.repos ?? []).filter((r) => r.metricGroupId === metricGroupId),
    [data?.repos, metricGroupId],
  );
  const [repoName, setRepoName] = React.useState<string>();
  const repo = repos.find((r) => r.repo === repoName) ?? repos[0];

  const snaps = React.useMemo(() => repo?.snapshots ?? [], [repo]);
  const last = snaps[snaps.length - 1] as CodeAdoptionSnapshot | undefined;
  const prev = snaps[snaps.length - 2] as CodeAdoptionSnapshot | undefined;

  const rows = React.useMemo(() => (repo ? teamRows(repo) : []), [repo]);
  const [view, setView] = React.useState("all");
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" | null }>({ key: "files", dir: "desc" });
  const views = TEAM_VIEWS.map((v) => ({ ...v, rows: rows.filter(v.match) }));
  const active = views.find((v) => v.id === view) ?? views[0];

  const greenhouseRows = React.useMemo(() => {
    const before = new Map((repo?.previous?.greenhouse ?? []).map((g) => [g.name, g.count]));
    return (repo?.latest?.greenhouse ?? []).map((g) => ({
      key: g.name,
      name: g.name,
      count: g.count,
      change: before.has(g.name) ? g.count - before.get(g.name)! : null,
    }));
  }, [repo]);
  const [ghSort, setGhSort] = React.useState<{ key: string; dir: "asc" | "desc" | null }>({ key: "count", dir: "desc" });

  const chartData = snaps.map((s) => ({
    period: formatDate(s.generated_at),
    ...Object.fromEntries(SHARES.map((sh) => [sh.label, s[sh.key]])),
  }));

  React.useEffect(() => {
    if (!onContextChange) return;
    if (!repo) {
      onContextChange({ insights: [], view: {} });
      return;
    }
    onContextChange({
      insights: buildInsights(repo, rows),
      view: {
        repo: repo.repo,
        repository: repo.repository,
        latestScan: last && { date: last.generated_at, ...Object.fromEntries(SHARES.map((s) => [s.label, last[s.key]])), summary: last.summary },
        history: snaps.map((s) => ({ date: formatDate(s.generated_at), bloomPercent: s.ds_percent, greenhousePercent: s.tagged_percent, nativePercent: s.native_percent, untaggedCustomPercent: s.untagged_percent })),
        teams: rows.map(({ key: _k, ...r }) => r),
        greenhouseComponents: greenhouseRows.map(({ key: _k, ...g }) => g),
      },
    });
  }, [onContextChange, repo, rows, greenhouseRows, snaps, last]);

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
            {snaps.length} weekly report{snaps.length === 1 ? "" : "s"} from {repo?.repository}
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
            onAction={() => navigate("/settings/data-sources")}
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

      {!repo || !last ? (
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

          <section className="px-5 pb-3 pt-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-medium text-foreground">Evolution over time</p>
              <p className="text-[12px] text-muted-foreground">Share of UI elements, one point per weekly scan</p>
            </div>
            <DesignSpacer size="small" />
            <div className="h-[256px] w-full rounded-[6px] border border-border p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={44} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    formatter={(v: number) => pct(v)}
                    contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                  />
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
              </ResponsiveContainer>
            </div>
          </section>

          <DesignDataTable
            title="Adoption by team"
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
      )}
    </>
  );
};

export default CodeAdoptionPanel;
