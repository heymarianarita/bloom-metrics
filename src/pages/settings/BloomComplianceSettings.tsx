import { useMemo, useRef, useState } from "react";
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
import { DesignLoader } from "@/components/ds/DesignLoader";
import { formatDateTime } from "@/lib/formatDate";
import { AUDIT_FRAME_PARAM, type AuditFrameWindow } from "@/lib/auditFrame";
import type { OffenderKind, ScanCounts } from "@/lib/bloomScan";

const NOT_FOUND_ADDRESS = "/bloom-compliance-not-found";
/** A page that keeps changing for this long is checked as it is by then. */
const SETTLE_TIMEOUT_MS = 20000;
const WCAG_STORAGE_KEY = "bloom:compliance-wcag";

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

interface OffenderRow {
  id: string;
  where: string;
  kind: OffenderKind;
  kindLabel: string;
  what: string;
}

const offenderRows: OffenderRow[] = scan.offenders.map((o, i) => ({
  id: `${o.file}:${o.line}:${i}`,
  where: `${o.file}:${o.line}`,
  kind: o.kind,
  kindLabel: KIND_LABEL[o.kind],
  what: o.what,
}));

const offenderColumns: DataTableColumn<OffenderRow>[] = [
  { key: "where", header: "Where", width: "2fr" },
  {
    key: "kindLabel",
    header: "Kind",
    width: "140px",
    cellTooltip: false,
    render: (row) => (
      <DesignBadge theme={KIND_THEME[row.kind]} styling="light">
        {row.kindLabel}
      </DesignBadge>
    ),
  },
  { key: "what", header: "What", width: "1.5fr" },
];

const componentColumns: DataTableColumn<{ name: string; count: number }>[] = [
  { key: "name", header: "Component", width: "1fr" },
  { key: "count", header: "Uses", width: "100px" },
];

/* ---------- Page ---------- */

const BloomCompliance = () => {
  const { totals } = scan;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [wcagRun, setWcagRun] = useState<WcagRun | null>(readWcagRun);
  const [checking, setChecking] = useState<{ route: string; done: number } | null>(null);
  const [kind, setKind] = useState<"all" | OffenderKind>("all");
  const offenders = useMemo(() => (kind === "all" ? offenderRows : offenderRows.filter((o) => o.kind === kind)), [kind]);
  const kindCount = (k: OffenderKind) => offenderRows.filter((o) => o.kind === k).length;

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
    { key: "adoption", header: "Web-ui adoption", width: "140px" },
    { key: "design", header: "Design*", width: "100px" },
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
          title="Bloom compliance"
          subtitle={`How much of Bloom Metrics is built with web-ui components and Bloom tokens, from this release's source (scanned ${formatDateTime(scan.generatedAt)}).`}
        />
        <DesignSpacer size="medium" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DesignStatCard
            label="Web-ui adoption"
            value={adoption(totals)}
            note={`${totals.design} of ${totals.design + totals.native + totals.shadcn} controls use Design*`}
          />
          <DesignStatCard label="Raw HTML controls" value={String(totals.native)} note="Buttons, links, tables and inputs" />
          <DesignStatCard label="shadcn used directly" value={String(totals.shadcn)} note="Outside Design* components" />
          <DesignStatCard label="One-off styles" value={String(totals.custom)} note={`Across ${totals.files} files`} />
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
          <DesignDataTable columns={pageColumns} data={pageRows} rowKey={(row) => row.file} searchPlaceholder="Search pages" pageSize={25} />
        </DesignCard>

        <DesignSpacer size="medium" />
        <DesignCard className="p-4">
          <h2 className="text-lg font-semibold text-foreground">Hand-written in code</h2>
          <p className="text-sm text-muted-foreground">Places where feature code doesn't use a Design* component or a Bloom token.</p>
          <DesignSpacer size="small" />
          <DesignDataTable
            columns={offenderColumns}
            data={offenders}
            rowKey={(row) => row.id}
            searchPlaceholder="Search files or values"
            tabs={[
              { id: "all", label: "All", count: offenderRows.length },
              { id: "native", label: "Raw HTML", count: kindCount("native") },
              { id: "shadcn", label: "shadcn", count: kindCount("shadcn") },
              { id: "custom", label: "One-off styles", count: kindCount("custom") },
            ]}
            activeTab={kind}
            onTabChange={(id) => setKind(id as typeof kind)}
            pageSize={20}
            emptyTitle="Nothing hand-written"
            emptyBody="Every control here uses a Design* component."
          />
        </DesignCard>

        <DesignSpacer size="medium" />
        <DesignCard className="p-4">
          <h2 className="text-lg font-semibold text-foreground">Web-ui components in use</h2>
          <DesignSpacer size="small" />
          <DesignDataTable columns={componentColumns} data={scan.components} rowKey={(row) => row.name} searchPlaceholder="Search components" pageSize={15} />
        </DesignCard>
      </AppShell>
    </RequireRole>
  );
};

export default BloomCompliance;
