import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Target, CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { ArrowSquareOut, Flag, TrendUp } from "@phosphor-icons/react";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { X } from "@phosphor-icons/react";
import { useJiraGoals, type JiraGoal, type JiraGoalMetric } from "@/hooks/useJiraGoals";

/** Atlassian Goals status labels and colours. */
const STATUS_THEME: Record<string, "success" | "primary" | "error" | "muted" | "highlight"> = {
  pending: "muted",
  "on track": "success",
  "at risk": "highlight",
  "off track": "error",
  completed: "muted",
  paused: "muted",
  cancelled: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  "not started": "Pending",
  "on track": "On track",
  "at risk": "At risk",
  "off track": "Off track",
  done: "Completed 🎉",
  completed: "Completed 🎉",
  paused: "Paused",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  archived: "Cancelled",
};

const normStatus = (status?: string) => {
  const k = (status ?? "").toLowerCase().replace(/_/g, " ").trim();
  return k === "done" ? "completed" : k === "not started" ? "pending" : k === "canceled" || k === "archived" ? "cancelled" : k;
};

const statusLabel = (status?: string) => (status ? STATUS_LABEL[(status).toLowerCase().replace(/_/g, " ").trim()] ?? status : "—");

/** ISO date (yyyy-mm-dd) for the first and last day of the quarter a date falls in. */
const quarterBounds = (ref = new Date()) => {
  const y = ref.getFullYear();
  const qStartMonth = Math.floor(ref.getMonth() / 3) * 3;
  const start = new Date(y, qStartMonth, 1);
  const end = new Date(y, qStartMonth + 3, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
};

const dayOf = (value?: string) => (value ? value.slice(0, 10) : undefined);

const badgeThemeFor = (status?: string) => STATUS_THEME[normStatus(status)] ?? "muted";

/** Atlassian-style goal status: label plus a 0.0–1.0 score chip for scored statuses. */
function GoalStatusBadge({ status, score: raw }: { status?: string; score?: number | null }) {
  const scored = ["on track", "at risk", "off track"].includes(normStatus(status));
  const score = typeof raw === "number" ? raw.toFixed(1) : null;
  return (
    <DesignBadge theme={badgeThemeFor(status)} styling="light">
      <span className="inline-flex items-center gap-1">
        {statusLabel(status)}
        {scored && score && <span className="rounded-[3px] bg-foreground/10 px-1">{score}</span>}
      </span>
    </DesignBadge>
  );
}

const clamp = (n?: number | null) => Math.max(0, Math.min(100, n ?? 0));

const ProgressBar = ({ value, size = "regular" }: { value?: number | null; size?: "regular" | "small" }) => (
  <div className="flex items-center gap-2 w-[160px] shrink-0">
    <div className={`flex-1 rounded-full bg-spacing-bg overflow-hidden ${size === "small" ? "h-1" : "h-1.5"}`}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${clamp(value)}%` }} />
    </div>
    <span className="text-[12px] text-muted-foreground w-9 text-right tabular-nums">
      {value === null || value === undefined ? "—" : `${Math.round(value)}%`}
    </span>
  </div>
);

const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString());

const inRange = (g: { startDate?: string; endDate?: string }, from: string, to: string) => {
  const start = dayOf(g.startDate);
  const end = dayOf(g.endDate) ?? start;
  if (!start && !end) return false;
  if (from && end && end < from) return false;
  if (to && start && start > to) return false;
  return true;
};

interface ObjectiveNode {
  goal: JiraGoal;
  subGoals: JiraGoal[];
}
interface ThemeNode {
  goal: JiraGoal | null;
  name: string;
  objectives: ObjectiveNode[];
}

/** Parent goals = themes, their sub-goals = objectives, metrics (and deeper sub-goals) = key results. */
const buildTree = (goals: JiraGoal[], from: string, to: string): ThemeNode[] => {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const children = new Map<string, JiraGoal[]>();
  goals.forEach((g) => {
    if (g.parentId) children.set(g.parentId, [...(children.get(g.parentId) ?? []), g]);
  });
  const themes = new Map<string, ThemeNode>();
  const themeFor = (g: JiraGoal): ThemeNode => {
    const key = g.parentId ?? `solo:${g.id}`;
    if (!themes.has(key)) {
      const parent = g.parentId ? byId.get(g.parentId) ?? null : null;
      themes.set(key, { goal: parent, name: parent?.name ?? g.parentName ?? "Other objectives", objectives: [] });
    }
    return themes.get(key)!;
  };
  goals.forEach((g) => {
    const parent = g.parentId ? byId.get(g.parentId) : undefined;
    const isTheme = !parent && (children.get(g.id)?.length ?? 0) > 0;
    const isDeep = parent && parent.parentId && byId.has(parent.parentId);
    if (isTheme || isDeep) return;
    if (!inRange(g, from, to)) return;
    themeFor(g).objectives.push({ goal: g, subGoals: children.get(g.id) ?? [] });
  });
  return [...themes.values()]
    .filter((t) => t.objectives.length > 0)
    .map((t) => ({ ...t, objectives: t.objectives.sort((a, b) => a.goal.name.localeCompare(b.goal.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const BRANCH = "relative before:content-[''] before:absolute before:left-[-12px] before:w-[8px] before:h-[1px] before:bg-border before:top-[20px]";
const KR_BRANCH = "relative before:content-[''] before:absolute before:left-[-15px] before:w-[5px] before:h-[5px] before:rounded-full before:bg-border before:top-[11px]";

/** Short outline label: O1, KR1… */
const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="w-[36px] shrink-0 text-[12px] font-[500] text-muted-foreground tabular-nums pt-[2px]">{children}</span>
);

const pct = (n?: number | null) => (n === null || n === undefined ? "—" : `${Math.round(n)}%`);

const dotFor = (status?: string) =>
  status === "On track" || status === "Done"
    ? "bg-btn-success"
    : status === "At risk"
      ? "bg-[var(--warning,#E0A100)]"
      : status === "Off track"
        ? "bg-destructive"
        : "bg-muted-foreground";

const shortDate = (v: string) =>
  new Date(`${dayOf(v)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const metricMeta = (m: { start: number | null; target: number | null }) =>
  m.start == null && m.target == null ? undefined : `Baseline ${fmt(m.start)} · Target ${fmt(m.target)}`;

const KrRow = ({ name, meta, progress }: { name: string; meta?: string; progress?: number | null }) => (
  <div className="flex items-start justify-between gap-6">
    <div className="min-w-0 flex flex-col gap-1">
      <span className="text-[12px] text-foreground">{name}</span>
      {meta && <span className="text-[12px] text-muted-foreground">{meta}</span>}
    </div>
    <div className="shrink-0 flex items-center gap-2 pt-1">
      <div className="h-1 w-12 rounded-full bg-[rgba(21,25,26,0.1)] overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamp(progress)}%` }} />
      </div>
      <span className="w-10 text-left text-[12px] font-[500] text-foreground tabular-nums">{pct(progress)}</span>
    </div>
  </div>
);

const ObjectiveBlock = ({ node, onOpen, selected }: { node: ObjectiveNode; index: number; onOpen: (n: ObjectiveNode) => void; selected?: boolean }) => {
  const { goal, subGoals } = node;
  const hasKrs = goal.metrics.length + subGoals.length > 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(node)}
      aria-pressed={selected}
      className={`relative w-full text-left rounded-[6px] px-4 py-4 flex flex-col gap-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selected ? "bg-[rgba(0,119,130,0.08)]" : "hover:bg-[rgba(21,25,26,0.06)] active:bg-[rgba(21,25,26,0.04)]"}`}
    >
      <div className="flex items-start justify-between gap-6">
        <span className="min-w-0 text-[14px] font-[580] text-foreground">{goal.name}</span>
        <div className="shrink-0 flex items-center gap-4">
          <GoalStatusBadge status={goal.status} score={goal.score} />
          <div className="h-1 w-24 rounded-full bg-[rgba(21,25,26,0.1)] overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${clamp(goal.progress)}%` }} />
          </div>
          <span className="-ml-2 w-10 text-left text-[14px] font-[580] text-foreground tabular-nums">{pct(goal.progress)}</span>
        </div>
      </div>
      {hasKrs && (
        <div className="flex flex-col gap-4 pl-4">
          {goal.metrics.map((m) => (
            <KrRow key={m.id} name={m.name} meta={metricMeta(m)} progress={m.progress} />
          ))}
          {subGoals.map((g) => (
            <KrRow
              key={g.id}
              name={g.endDate ? `${g.name} by ${shortDate(g.endDate)}` : g.name}
              meta={g.metrics[0] ? metricMeta(g.metrics[0]) : undefined}
              progress={g.progress}
            />
          ))}
        </div>
      )}
    </button>
  );
};

const longDate = (v?: string) =>
  v ? new Date(v.length <= 10 ? `${v}T00:00:00` : v).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const PanelSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <span className="text-[12px] text-muted-foreground">{label}</span>
    <div className="text-[14px] text-foreground">{children}</div>
  </div>
);

const ObjectivePanel = ({ node, onClose }: { node: ObjectiveNode | null; onClose: () => void }) => {
  const goal = node?.goal;
  const seen = new Set<string>();
  const projects = node ? [node.goal, ...node.subGoals].flatMap((g) => g.projects ?? []).filter((p) => !seen.has(p.id) && seen.add(p.id)) : [];
  const people = [...new Set(projects.flatMap((p) => p.contributors ?? []))];
  const peopleLinks: Record<string, string> = {};
  projects.forEach((p) => p.contributorLinks?.forEach((c) => { if (c.url && !peopleLinks[c.name]) peopleLinks[c.name] = c.url; }));
  return (
    <DesignCard className="p-0 overflow-hidden">
      {goal && (
        <div className="px-6 pt-5 flex items-center justify-between gap-4">
          <span className="text-[12px] font-[500] text-muted-foreground">Objective details</span>
          <DesignButton variant="flat" theme="muted" size="small" aria-label="Clear selection" onClick={onClose} className="-mr-3" icon={<X size={16} />} />
        </div>
      )}
      {!goal && (
        <DesignEmptyState
          icon={<Target size={40} />}
          title="No objective selected"
          body="Select an objective to see its dates, key results, people and projects."
        />
      )}
      {goal && (
        <div className="p-6 pt-4 flex flex-col gap-6 max-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="flex flex-col gap-3">
            <h2 className="text-[18px] font-[580] text-foreground">
              {goal.url ? (
                <a href={goal.url} target="_blank" rel="noreferrer" className="group hover:text-primary transition-colors">
                  {goal.name}
                  <ArrowSquareOut size={16} className="inline-block ml-1 align-[-2px] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : goal.name}
            </h2>
            <div className="flex items-center gap-3">
              <GoalStatusBadge status={goal.status} score={goal.score} />
              <span className="text-[14px] text-muted-foreground tabular-nums">{pct(goal.progress)} complete</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <PanelSection label="Start date">{longDate(goal.plannedStart ?? goal.startDate)}</PanelSection>
            <PanelSection label="Due date">{longDate(goal.endDate)}</PanelSection>
            <div className="col-span-2"><PanelSection label="Last update on Atlassian">
              {goal.lastUpdate ? (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span>{longDate(goal.lastUpdate)}</span>
                  {goal.url && (
                    <a href={`${goal.url.replace(/\/(about|updates)?\/?$/, "")}/updates`} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1 text-primary">
                      Read update
                      <ArrowSquareOut size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                </div>
              ) : "No updates yet"}
            </PanelSection></div>
          </div>
          <PanelSection label="Contributors">
            {people.length ? (
              <div className="flex flex-col gap-1">
                {people.map((n) =>
                  peopleLinks[n] ? (
                    <a key={n} href={peopleLinks[n]} target="_blank" rel="noreferrer" className="group w-fit hover:text-primary">
                      {n}
                      <ArrowSquareOut size={14} className="inline-block ml-1 align-[-2px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <span key={n}>{n}</span>
                  ),
                )}
              </div>
            ) : "—"}
          </PanelSection>
          <PanelSection label="Projects">
            {projects.length ? (
              <div className="flex flex-col gap-2">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3">
                    <a href={p.url} target="_blank" rel="noreferrer" className="group min-w-0 hover:text-primary">
                      {p.name}
                      <ArrowSquareOut size={14} className="inline-block ml-1 align-[-2px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {p.status && <span className="shrink-0"><DesignBadge theme={badgeThemeFor(p.status)} styling="light">{statusLabel(p.status)}</DesignBadge></span>}
                  </div>
                ))}
              </div>
            ) : <span className="text-muted-foreground">No linked projects</span>}
          </PanelSection>
          {goal.url && (
            <DesignButton variant="outlined" theme="primary" icon={<ArrowSquareOut size={16} />} iconPosition="right" onClick={() => window.open(goal.url, "_blank", "noreferrer")}>
              Open in Atlassian
            </DesignButton>
          )}
        </div>
      )}
    </DesignCard>
  );
};

const OKRs = () => {
  // OKRs come from Atlassian Goals.
  const navigate = useNavigate();
  const goals = useJiraGoals();
  const [selected, setSelected] = React.useState<ObjectiveNode | null>(null);
  const defaults = React.useMemo(() => quarterBounds(), []);
  const [quarter, setQuarter] = React.useState(defaults.start);
  const { start: from, end: to } = React.useMemo(() => quarterBounds(new Date(`${quarter}T00:00:00`)), [quarter]);

  const data = goals.data;
  const isLoading = goals.isLoading;
  const error = goals.error;
  const refetch = () => goals.refetch();

  const allGoals = data?.goals ?? [];
  const allOkrs = allGoals;

  const quarterOptions = React.useMemo(() => {
    const starts = new Set<string>([defaults.start]);
    allGoals.forEach((g) => [g.startDate, g.endDate].forEach((d) => {
      const day = dayOf(d);
      if (day) starts.add(quarterBounds(new Date(`${day}T00:00:00`)).start);
    }));
    return [...starts].sort().reverse().map((st) => {
      const [y, m] = st.split("-").map(Number);
      return { value: st, label: `Q${Math.floor((m - 1) / 3) + 1} ${y}` };
    });
  }, [allGoals, defaults.start]);

  const tree = React.useMemo(() => buildTree(allGoals, from, to), [allGoals, from, to]);
  const objectives = tree.flatMap((t) => t.objectives.map((o) => o.goal));

  const summary = React.useMemo(() => {
    const total = objectives.length;
    const count = (theme: string) => objectives.filter((o) => badgeThemeFor(o.status) === theme).length;
    const avgProgress = total ? Math.round(objectives.reduce((sum, o) => sum + (o.progress ?? 0), 0) / total) : 0;
    return { total, onTrack: count("success"), atRisk: count("highlight"), offTrack: count("error"), avgProgress };
  }, [objectives]);

  const notConfigured = data?.configured === false;

  return (
    <AppShell>
      <div className="w-full max-w-[1440px] mx-auto">
        <DesignPageHeader
          title="OKRs"
          subtitle="Objectives and key results reported in Atlassian Goals"
          primaryAction={!isLoading && allOkrs.length > 0 ? (
            <div className="w-[160px]">
              <DesignInputSelect size="small" options={quarterOptions} value={quarter} onChange={setQuarter} />
            </div>
          ) : undefined}
        />
        <DesignSpacer size="medium" />

        {error && (
          <>
            <DesignInfoBanner
              type="error"
              title="Could not load OKRs"
              description={(error as Error).message}
              actionLabel="Retry"
              onAction={() => refetch()}
              showCloseButton={false}
            />
            <DesignSpacer size="medium" />
          </>
        )}

        {notConfigured && !error && (
          <>
            <DesignInfoBanner
              type="warning"
              title="Atlassian Goals is not connected yet"
              description="Connect Atlassian Goals in Settings → Dynamic sources and objectives will appear here automatically."
              actionLabel="Open dynamic sources"
              onAction={() => navigate("/settings/data-sources")}
              showCloseButton={false}
            />
            <DesignSpacer size="medium" />
          </>
        )}


        {isLoading && (
          <DesignCard className="p-12 flex flex-col items-center gap-3 text-center">
            <DesignLoader />
            <p className="text-[16px] font-medium text-foreground">Fetching goals from Atlassian…</p>
            <p className="text-[14px] text-muted-foreground">This can take a few seconds while themes, objectives and key results load.</p>
          </DesignCard>
        )}

        {!isLoading && data && data.configured !== false && allOkrs.length === 0 && (
          <DesignCard>
            <DesignEmptyState
              icon={<Target size={40} />}
              title="No OKRs yet"
              body="No goals found in this Atlassian workspace. Create goals in Atlassian Home and give them a target date so they land in a quarter."
            />
          </DesignCard>
        )}

        {!isLoading && allOkrs.length > 0 && (
          <>
            <div className="flex items-start gap-6">
              <div className="min-w-0 flex-1">
            {tree.length === 0 ? (
              <DesignCard>
                <DesignEmptyState
                  icon={<Target size={40} />}
                  title="No OKRs in this quarter"
                  body="No goals in the selected quarter."
                />
              </DesignCard>
            ) : (
              <div className="flex flex-col gap-4">
                {tree.map((theme) => (
                  <DesignCard key={theme.goal?.id ?? theme.name} className="p-0 overflow-hidden">
                    <div className="px-6 py-4 flex items-center gap-3">
                      <div className="min-w-0 flex flex-col gap-1">
                        <span className="text-[12px] font-[500] uppercase tracking-wider text-muted-foreground">Theme</span>
                        {theme.goal?.url ? (
                          <a
                            href={theme.goal.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group min-w-0 inline-flex items-center gap-2 text-[16px] font-[580] text-foreground hover:text-primary transition-colors"
                          >
                            {theme.name}
                            <ArrowSquareOut size={16} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <h2 className="min-w-0 text-[16px] font-[580] text-foreground">{theme.name}</h2>
                        )}
                      </div>
                      {theme.goal && (
                        <div className="ml-auto shrink-0">
                          <GoalStatusBadge status={theme.goal.status} score={theme.goal.score} />
                        </div>
                      )}
                    </div>
                    <div className="mx-6 mb-5 ml-8 pl-2 flex flex-col gap-1 border-l border-border">
                      {theme.objectives.map((o, i) => (
                        <ObjectiveBlock key={o.goal.id} node={o} index={i + 1} onOpen={(n) => setSelected(selected?.goal.id === n.goal.id ? null : n)} selected={selected?.goal.id === o.goal.id} />
                      ))}
                    </div>
                  </DesignCard>
                ))}
              </div>
            )}
              </div>
              <div className="w-[380px] min-[1200px]:w-1/3 shrink-0 sticky top-4">
                <ObjectivePanel node={selected} onClose={() => setSelected(null)} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default OKRs;
