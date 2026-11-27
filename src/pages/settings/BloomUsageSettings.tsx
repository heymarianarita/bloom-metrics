import { useMemo, useRef, useState } from "react";
import { ListMagnifyingGlass } from "@phosphor-icons/react";
import scan from "virtual:bloom-scan";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { formatDateTime } from "@/lib/formatDate";
import { AUDIT_FRAME_PARAM, type AuditFrameWindow } from "@/lib/auditFrame";
import type { OffenderKind, ScanCounts, StyleCategory } from "@/lib/bloomScan";

const NOT_FOUND_ADDRESS = "/bloom-usage-not-found";
/** A page that keeps changing for this long is checked as it is by then. */
const SETTLE_TIMEOUT_MS = 20000;
const WCAG_STORAGE_KEY = "bloom:compliance-wcag";
/** One-off styles that are usually fine: Bloom has no tokens for sizes or grid tracks. */
const LAYOUT_CATEGORIES = new Set<StyleCategory>(["size", "layout"]);

const percent = (n: number, d: number) => (d ? `${Math.round((n / d) * 1000) / 10}%` : "–");
const adoption = (c: ScanCounts) => percent(c.design, c.design + c.native + c.shadcn);

const KIND_LABEL: Record<OffenderKind, string> = { native: "Raw HTML", shadcn: "shadcn", custom: "One-off style" };
const KIND_THEME: Record<OffenderKind, "error" | "highlight" | "muted"> = { native: "error", shadcn: "highlight", custom: "muted" };

/* ---------- Accessibility check ---------- */

interface WcagResult {
  passes: number;
  failed: number;
  rules: string[];
}

interface WcagRun {
  checkedAt: string;
  results: Record<string, WcagResult | { error: string }>;
}

const readWcagRun = (): WcagRun | null => {
  try {
    return JSON.parse(localStorage.getItem(WCAG_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
};

/** Where the frame opens a route: the catch-all through an address nothing else matches. */
const frameAddress = (route: string) => (route === "*" ? NOT_FOUND_ADDRESS : route);

/** Routes with a parameter (/metrics/:groupSlug) have no single address to open. */
const checkable = (route: string) => !route.includes(":");

const waitForLoad = (frame: HTMLIFrameElement, src: string) =>
  new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    frame.src = src;
  });

/** Waits until the page in the frame has the audit loaded, its fonts in, no loaders and a DOM that stopped changing. */
async function waitForSettled(win: AuditFrameWindow) {
  const started = Date.now();
  let lastCount = -1;
  let steady = 0;
  while (Date.now() - started < SETTLE_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 250));
    const doc = win.document;
    const count = doc.getElementsByTagName("*").length;
    steady = count === lastCount ? steady + 1 : 0;
    lastCount = count;
    const loading = doc.querySelector('[role="status"][aria-label="Loading"]');
    if (win.runBloomAudit && doc.fonts.status === "loaded" && !loading && steady >= 4) return;
  }
}

async function checkWcag(frame: HTMLIFrameElement, route: string): Promise<WcagResult> {
  await waitForLoad(frame, `${frameAddress(route)}?${AUDIT_FRAME_PARAM}=1`);
  const win = frame.contentWindow as AuditFrameWindow;
  await waitForSettled(win);
  if (!win.runBloomAudit) throw new Error("The page didn't load the audit.");
  const report = await win.runBloomAudit({ root: win.document.querySelector("main") ?? win.document.body, quiet: true });
  const a11y = report.a11y!;
  return { passes: a11y.passes, failed: a11y.failed, rules: a11y.violations.map((v) => v.rule) };
}

/* ---------- Code scan ---------- */

interface PageRow extends ScanCounts {
  route: string;
  label: string;
  file: string;
  files: number;
  adoption: string;
  handWritten: number;
  wcag: string;
}

/** Routes that render the same page file (/metrics/adoption and /metrics/adoption/:touchpoint) are one row. */
const scannedPages = Object.values(
  scan.pages.reduce<Record<string, Omit<PageRow, "wcag">>>((rows, page) => {
    rows[page.file] ??= {
      ...page,
      label: page.route === "*" ? "Page not found" : page.route,
      adoption: adoption(page),
      handWritten: page.native + page.shadcn,
    };
    return rows;
  }, {}),
).sort((a, b) => a.design / (a.design + a.handWritten || 1) - b.design / (b.design + b.handWritten || 1));

const checkableRoutes = scannedPages.map((p) => p.route).filter(checkable);

const wcagText = (route: string, run: WcagRun | null) => {
  if (!checkable(route)) return "Not checked: the address needs a value";
  const result = run?.results[route];
  if (!result) return "";
  if ("error" in result) return `Couldn't check: ${result.error}`;
  const share = percent(result.passes, result.passes + result.failed);
  return result.failed ? `${share} · ${result.failed} failing: ${result.rules.join(", ")}` : share;
};

type OffenderTab = "all" | "native" | "shadcn" | "offToken" | "layout";

interface OffenderRow {
  id: string;
  tab: Exclude<OffenderTab, "all">;
  where: string;
  /** Full path, for search and the hover text */
  path: string;
  component: string;
  kind: OffenderKind;
  kindLabel: string;
  what: string;
  code: string;
  why: string;
  fix: string;
}

const TAB_ORDER: Exclude<OffenderTab, "all">[] = ["native", "shadcn", "offToken", "layout"];

/** Most actionable first: raw HTML, shadcn, token misses, then sizes. */
const offenderRows: OffenderRow[] = scan.offenders.map((o, i): OffenderRow => ({
  id: `${o.file}:${o.line}:${i}`,
  tab: o.kind !== "custom" ? o.kind : o.category && LAYOUT_CATEGORIES.has(o.category) ? "layout" : "offToken",
  where: `${o.file.split("/").pop()}:${o.line}`,
  path: `${o.file}:${o.line}`,
  component: o.component ?? "",
  kind: o.kind,
  kindLabel: KIND_LABEL[o.kind],
  what: o.what,
  code: o.code,
  why: o.why,
  fix: o.fix,
})).sort((a, b) => TAB_ORDER.indexOf(a.tab) - TAB_ORDER.indexOf(b.tab));
const tabCount = (tab: OffenderTab) => (tab === "all" ? offenderRows.length : offenderRows.filter((o) => o.tab === tab).length);

/** "41 buttons, 8 links, 9 other": the most common items of one kind. */
const topItems = (rows: OffenderRow[], label: (what: string) => string) => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(label(row.what), (counts.get(label(row.what)) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, 2).map(([name, n]) => `${n} ${name}`);
  const rest = sorted.slice(2).reduce((sum, [, n]) => sum + n, 0);
  return rest ? `${shown.join(", ")}, ${rest} other` : shown.join(", ");
};
const TAG_NAMES: Record<string, string> = { "<button>": "buttons", "<a>": "links", "<input>": "inputs", "<img>": "images", "<table>": "tables" };
const SHADCN_NAMES: Record<string, string> = { DropdownMenu: "menus", Button: "buttons", ToastAction: "toast actions", NavigationMenu: "navigation" };

const offenderColumns: DataTableColumn<OffenderRow>[] = [
  {
    key: "where",
    header: "Where",
    width: "1.3fr",
    cellTooltip: false,
    render: (row) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate" title={row.path}>{row.where}</span>
        {row.component && <span className="truncate text-xs text-muted-foreground">in {row.component}</span>}
      </span>
    ),
  },
  {
    key: "what",
    header: "What",
    width: "1.2fr",
    cellTooltip: false,
    render: (row) => (
      <span className="flex min-w-0 flex-col items-start gap-1">
        <DesignBadge theme={KIND_THEME[row.kind]} styling="light">
          {row.kindLabel}
        </DesignBadge>
        <span className="max-w-full truncate" title={row.code}>{row.what}</span>
      </span>
    ),
  },
  { key: "why", header: "Why", width: "2fr", wrap: true },
  { key: "fix", header: "Instead", width: "1.6fr", wrap: true },
];

const componentColumns: DataTableColumn<{ name: string; count: number }>[] = [
  { key: "name", header: "Component", width: "1fr" },
  { key: "count", header: "Uses", width: "100px" },
];

/* ---------- Page ---------- */

/** Icon button in a stat card's corner that opens its part of the list below. */
const ListLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <DesignTooltip content={label}>
    <DesignButton variant="flat" theme="muted" aria-label={label} icon={<ListMagnifyingGlass size={16} />} onClick={onClick} className="-my-2 -mr-2 h-8 w-8 px-0" />
  </DesignTooltip>
);

const BloomUsage = () => {
  const { totals } = scan;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [wcagRun, setWcagRun] = useState<WcagRun | null>(readWcagRun);
  const [checking, setChecking] = useState<{ route: string; done: number } | null>(null);
  const [tab, setTab] = useState<OffenderTab>("all");
  const offenders = useMemo(() => (tab === "all" ? offenderRows : offenderRows.filter((o) => o.tab === tab)), [tab]);
  const listRef = useRef<HTMLDivElement>(null);
  const showTab = (next: OffenderTab) => {
    setTab(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pageRows: PageRow[] = useMemo(() => scannedPages.map((p) => ({ ...p, wcag: wcagText(p.route, wcagRun) })), [wcagRun]);

  const checkAll = async () => {
    const frame = frameRef.current;
    if (!frame) return;
    const run: WcagRun = { checkedAt: new Date().toISOString(), results: {} };
    for (const [done, route] of checkableRoutes.entries()) {
      setChecking({ route, done });
      try {
        run.results[route] = await checkWcag(frame, route);
      } catch (error) {
        run.results[route] = { error: error instanceof Error ? error.message : "unknown error" };
      }
      setWcagRun({ ...run, results: { ...run.results } });
    }
    frame.src = "about:blank";
    setChecking(null);
    try {
      localStorage.setItem(WCAG_STORAGE_KEY, JSON.stringify(run));
    } catch {
      // Storage full or blocked: the results still show until the page is left.
    }
  };

  const pageColumns: DataTableColumn<PageRow>[] = [
    { key: "label", header: "Page", width: "1.5fr" },
    { key: "adoption", header: "Bloom adoption", width: "140px" },
    { key: "design", header: "Bloom", width: "100px" },
    { key: "handWritten", header: "Hand-written", width: "120px" },
    { key: "custom", header: "One-off styles", width: "130px" },
    {
      key: "wcag",
      header: "WCAG 2.2 AA",
      width: "1.5fr",
      render: (row) =>
        checking?.route === row.route ? (
          <DesignLoader size="small" />
        ) : (
          <span className={wcagRun?.results[row.route] || !checkable(row.route) ? undefined : "text-muted-foreground"}>
            {row.wcag || "Not checked"}
          </span>
        ),
    },
  ];

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Bloom usage"
          subtitle={`How much of Bloom Metrics is built with Bloom components and tokens, from this release's source (scanned ${formatDateTime(scan.generatedAt)}).`}
        />
        <DesignSpacer size="medium" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DesignStatCard
            label="Bloom adoption"
            value={adoption(totals)}
            note={`${totals.design} of ${totals.design + totals.native + totals.shadcn} components`}
          />
          <DesignStatCard
            label="Raw HTML controls"
            value={String(totals.native)}
            note={topItems(offenderRows.filter((o) => o.tab === "native"), (w) => TAG_NAMES[w] ?? w)}
            icon={<ListLink label="See the raw HTML controls" onClick={() => showTab("native")} />}
          />
          <DesignStatCard
            label="shadcn used directly"
            value={String(totals.shadcn)}
            note={topItems(offenderRows.filter((o) => o.tab === "shadcn"), (w) => SHADCN_NAMES[w] ?? w)}
            icon={<ListLink label="See the shadcn parts" onClick={() => showTab("shadcn")} />}
          />
          <DesignStatCard
            label="One-off styles"
            value={String(totals.custom)}
            note={`${tabCount("offToken")} miss a token, ${tabCount("layout")} sizes`}
            icon={<ListLink label="See the styles that miss a token" onClick={() => showTab("offToken")} />}
          />
        </div>

        <DesignSpacer size="medium" />
        <div ref={listRef} className="scroll-mt-4">
          <DesignCard className="p-4">
            <h2 className="text-lg font-semibold text-foreground">What isn't Bloom, and why</h2>
            <p className="text-sm text-muted-foreground">
              Each place feature code draws something itself instead of using a Bloom component or token, with what to use instead.
              Some can stay: Bloom has no link or size tokens, and dense grids need smaller controls.
            </p>
            <DesignSpacer size="small" />
            <DesignDataTable
              label="What isn't Bloom"
              columns={offenderColumns}
              data={offenders}
              rowKey={(row) => row.id}
              searchPlaceholder="Search"
              tabs={[
                { id: "all", label: "All", count: tabCount("all") },
                { id: "native", label: "Raw HTML", count: tabCount("native") },
                { id: "shadcn", label: "shadcn", count: tabCount("shadcn") },
                { id: "offToken", label: "Missing a token", count: tabCount("offToken") },
                { id: "layout", label: "Sizes and layout", count: tabCount("layout") },
              ]}
              activeTab={tab}
              onTabChange={(id) => setTab(id as OffenderTab)}
              pageSize={20}
              emptyTitle="Nothing here"
              emptyBody="Every control of this kind uses a Bloom component."
            />
          </DesignCard>
        </div>

        <DesignSpacer size="medium" />
        <DesignCard className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">By page</h2>
              <p className="text-sm text-muted-foreground">
                Each page with the components it renders. Shared pieces like the navigation count on every page.{" "}
                {checking
                  ? `Checking accessibility: ${checking.done + 1} of ${checkableRoutes.length}.`
                  : wcagRun
                    ? `Accessibility last checked ${formatDateTime(wcagRun.checkedAt)}.`
                    : "Accessibility is checked on the rendered page, which takes about a minute for all of them."}
              </p>
            </div>
            <DesignButton variant="outlined" theme="primary" onClick={checkAll} isLoading={Boolean(checking)}>
              {wcagRun ? "Check accessibility again" : "Check accessibility"}
            </DesignButton>
          </div>
          <iframe
            ref={frameRef}
            title="Page being checked"
            aria-hidden="true"
            tabIndex={-1}
            width={1280}
            height={800}
            className="pointer-events-none fixed left-full top-0 border-0"
          />
          <DesignSpacer size="small" />
          <DesignDataTable columns={pageColumns} data={pageRows} rowKey={(row) => row.file} searchPlaceholder="Search pages" label="Bloom adoption by page" pageSize={25} />
        </DesignCard>


        <DesignSpacer size="medium" />
        <DesignCard className="p-4">
          <h2 className="text-lg font-semibold text-foreground">Bloom components in use</h2>
          <DesignSpacer size="small" />
          <DesignDataTable columns={componentColumns} data={scan.components} rowKey={(row) => row.name} searchPlaceholder="Search components" label="Bloom components in use" pageSize={15} />
        </DesignCard>
      </AppShell>
    </RequireRole>
  );
};

export default BloomUsage;
