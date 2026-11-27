/**
 * Audit of the page on screen: web-ui (Design*) adoption, Bloom token use, hand-written HTML/CSS,
 * typeface, icons, date format and WCAG 2.2 AA (axe-core).
 *
 * Under `npm run dev` it's a console tool:
 *   bloomAudit()                 run on the whole page (or press Alt+Shift+B)
 *   bloomAudit({ root: "main" }) run on part of it
 *   bloomAudit({ a11y: false })  skip the slower accessibility pass
 *   bloomAudit.highlight("native" | "shadcn" | "custom" | "offToken" | "a11y" | "dates")
 *   bloomAudit.clear()
 *
 * The Bloom usage page also runs it, quietly, inside a hidden frame (see auditFrame.ts).
 * Origins (Design* vs hand-written) come from React's dev-only `_debugSource`, so in a production
 * build every element reads as "library" and only the token, type, date and a11y checks mean anything.
 */
import type { Result as AxeResult } from "axe-core";

interface DebugSource {
  fileName: string;
  lineNumber: number;
}
interface Fiber {
  type: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  _debugOwner?: Fiber | null;
  _debugSource?: DebugSource | null;
}

type OriginKind = "design" | "shadcn" | "feature" | "library";
interface Origin {
  kind: OriginKind;
  component: string;
  where: string;
}

type HighlightKind = "native" | "shadcn" | "custom" | "offToken" | "a11y" | "dates";

export interface BloomAuditOptions {
  root?: Element | string;
  a11y?: boolean;
  /** Don't print to the console; just return the report */
  quiet?: boolean;
}

export interface AuditTokenRow {
  category: string;
  checked: number;
  on: number;
  offenders: { value: string; count: number; examples: string }[];
}

export interface AuditA11yRule {
  rule: string;
  impact: string;
  wcag: string;
  elements: number;
  problem: string;
  helpUrl: string;
}

export interface BloomAuditReport {
  url: string;
  summary: Record<string, { value: string; detail: string }>;
  elements: Record<HighlightKind, Element[]>;
  /** Whether origins could be read (dev build); without them adoption and custom CSS are empty */
  originsKnown: boolean;
  tokens: AuditTokenRow[];
  typeface: { checked: number; on: number; offenders: { value: string; count: number; examples: string }[] };
  dates: { text: string; where: string }[];
  a11y: { passes: number; failed: number; incomplete: number; violations: AuditA11yRule[]; bestPractices: AuditA11yRule[] } | null;
}

const OVERLAY_ID = "bloom-audit-overlay";

const CONTROLS = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "table",
  "img",
  "hr",
  "dialog",
  "details",
  "progress",
  "meter",
  ...[
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "tablist",
    "menu",
    "menuitem",
    "option",
    "listbox",
    "combobox",
    "dialog",
    "slider",
    "tooltip",
    "progressbar",
    "separator",
  ].map((r) => `[role=${r}]`),
].join(",");

const SPACING = [0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 96, 128];
const TYPE: Record<number, number> = { 12: 16, 14: 18, 16: 22, 18: 24, 22: 28, 24: 32 };
const WEIGHTS = [375, 500, 580];
const RADII = [6, 12];
const AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/* ---------- React origin ---------- */

function fiberOf(el: Element): Fiber | null {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? (el as unknown as Record<string, Fiber>)[key] : null;
}

function nameOf(type: unknown): string {
  if (typeof type === "function") {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName || fn.name || "Anonymous";
  }
  if (type && typeof type === "object") {
    const t = type as { displayName?: string; render?: unknown; type?: unknown };
    if (t.displayName) return t.displayName;
    if (t.render) return nameOf(t.render);
    if (t.type) return nameOf(t.type);
  }
  return typeof type === "string" ? type : "Anonymous";
}

const relPath = (file: string) => {
  const i = file.lastIndexOf("/src/");
  return i >= 0 ? file.slice(i + 1) : file;
};

/** Who wrote the JSX: a Design* component, a shadcn primitive used from feature code, feature code itself, or a library. */
function originOf(el: Element): Origin {
  let fiber = fiberOf(el);
  let viaUi: string | null = null;
  while (fiber) {
    const src = fiber._debugSource;
    if (src && !src.fileName.includes("/node_modules/")) {
      const owner = nameOf(fiber._debugOwner?.type);
      const where = `${relPath(src.fileName)}:${src.lineNumber}`;
      if (src.fileName.includes("/src/components/ds/")) return { kind: "design", component: owner, where };
      if (src.fileName.includes("/src/components/ui/")) viaUi ??= owner;
      else return { kind: viaUi ? "shadcn" : "feature", component: viaUi ?? owner, where };
    }
    fiber = fiber._debugOwner ?? null;
  }
  return { kind: "library", component: "", where: "" };
}

function designInstances(): Map<string, number> {
  const counts = new Map<string, number>();
  const container = document.getElementById("root");
  const key = container && Object.keys(container).find((k) => k.startsWith("__reactContainer$"));
  if (!container || !key) return counts;
  const stack: Fiber[] = [(container as unknown as Record<string, Fiber>)[key]];
  while (stack.length) {
    const f = stack.pop()!;
    if (typeof f.type !== "string") {
      const n = nameOf(f.type);
      if (/^Design[A-Z]/.test(n)) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    if (f.sibling) stack.push(f.sibling);
    if (f.child) stack.push(f.child);
  }
  return counts;
}

/* ---------- Tokens ---------- */

type Rgba = [number, number, number, number];

function parseColor(value: string): Rgba | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
  return [Number(r), Number(g), Number(b), Number(a)];
}

const rgbKey = (c: Rgba) => `${c[0]},${c[1]},${c[2]}`;
const rgbaKey = (c: Rgba) => `${rgbKey(c)},${Math.round(c[3] * 100)}`;

function rootVariables(): string[] {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
        for (const prop of Array.from(rule.style)) if (prop.startsWith("--")) names.add(prop);
      }
      if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // cross-origin sheet (fonts): nothing to read
    }
  }
  return [...names];
}

function tokenColors() {
  const exact = new Map<string, string>();
  const rgb = new Map<string, string>();
  const probe = document.createElement("div");
  document.body.appendChild(probe);
  const rootStyle = getComputedStyle(document.documentElement);
  for (const name of rootVariables()) {
    const raw = rootStyle.getPropertyValue(name).trim();
    probe.style.color = "";
    probe.style.color = raw;
    if (!raw || !probe.style.color) continue;
    const c = parseColor(getComputedStyle(probe).color);
    if (!c) continue;
    if (!exact.has(rgbaKey(c))) exact.set(rgbaKey(c), name);
    if (!rgb.has(rgbKey(c))) rgb.set(rgbKey(c), name);
  }
  probe.remove();
  return { exact, rgb };
}

/* ---------- Tally helpers ---------- */

class Tally {
  checked = 0;
  on = 0;
  featureChecked = 0;
  featureOn = 0;
  offenders = new Map<string, { count: number; where: Set<string> }>();
  add(ok: boolean, origin: Origin, offValue?: string) {
    const feature = origin.kind === "feature" || origin.kind === "shadcn";
    this.checked++;
    if (feature) this.featureChecked++;
    if (ok) {
      this.on++;
      if (feature) this.featureOn++;
    } else if (offValue) {
      const o = this.offenders.get(offValue) ?? { count: 0, where: new Set<string>() };
      o.count++;
      if (origin.where && o.where.size < 3) o.where.add(origin.where);
      this.offenders.set(offValue, o);
    }
  }
  offenderRows(limit = 15) {
    return [...this.offenders.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([value, o]) => ({ value, count: o.count, examples: [...o.where].join("  ") }));
  }
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 1000) / 10}%` : "–");
const near = (v: number, list: number[]) => list.some((s) => Math.abs(v - s) < 0.5);
const px = (v: string) => parseFloat(v) || 0;

function describe(el: Element) {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 32);
  const role = el.getAttribute("role");
  return `<${el.tagName.toLowerCase()}${role ? ` role=${role}` : ""}>${text ? ` "${text}"` : ""}`;
}

function isVisible(el: Element, style: CSSStyleDeclaration) {
  return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
}

function hasOwnText(el: Element) {
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
}

const LIBRARY_INLINE = /^(--|transform|translate|position|top|left|right|bottom|inset|z-index|pointer-events|will-change|animation|transition|opacity|min-width|max-height|outline|user-select|overflow-anchor)/;
const VISUAL_INLINE = /^(color|background|border|margin|padding|gap|font|line-height|letter-spacing|border-radius|box-shadow|width|height)/;

const DATE_PATTERNS = [
  /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/,
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?\b/,
  /\b\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\b/,
];

/* ---------- Audit ---------- */

let last: BloomAuditReport | null = null;

const criterion = (tags: string[]) =>
  tags
    .filter((t) => /^wcag\d{3,}$/.test(t))
    .map((t) => t.slice(4).split("").join("."))
    .join(", ");

const ruleRow = (v: AxeResult): AuditA11yRule => ({
  rule: v.id,
  impact: v.impact ?? "",
  wcag: criterion(v.tags),
  elements: v.nodes.length,
  problem: v.help,
  helpUrl: v.helpUrl,
});

async function bloomAudit(options: BloomAuditOptions = {}): Promise<BloomAuditReport> {
  clear();
  const root = typeof options.root === "string" ? document.querySelector(options.root) : (options.root ?? document.body);
  if (!root) throw new Error(`bloomAudit: no element matches ${String(options.root)}`);
  const started = performance.now();
  const tokens = tokenColors();

  const elements: BloomAuditReport["elements"] = { native: [], shadcn: [], custom: [], offToken: [], a11y: [], dates: [] };
  const origins = new Map<Element, Origin>();
  const origin = (el: Element) => {
    let o = origins.get(el);
    if (!o) origins.set(el, (o = originOf(el)));
    return o;
  };

  // Controls
  const controlCounts: Record<OriginKind, number> = { design: 0, shadcn: 0, feature: 0, library: 0 };
  const nativeOffenders = new Map<string, { element: string; count: number; kind: string }>();
  for (const el of Array.from(root.querySelectorAll(CONTROLS))) {
    if (el.closest(`#${OVERLAY_ID}`) || !isVisible(el, getComputedStyle(el))) continue;
    const o = origin(el);
    controlCounts[o.kind]++;
    if (o.kind === "feature" || o.kind === "shadcn") {
      elements[o.kind === "feature" ? "native" : "shadcn"].push(el);
      const key = `${o.where} ${el.tagName}`;
      const row = nativeOffenders.get(key) ?? { element: describe(el), count: 0, kind: o.kind === "feature" ? "raw HTML" : `shadcn ${o.component}` };
      row.count++;
      nativeOffenders.set(key, row);
    }
  }
  const authoredControls = controlCounts.design + controlCounts.feature + controlCounts.shadcn;

  // Styles
  const colour = new Tally();
  const typeSize = new Tally();
  const lineHeight = new Tally();
  const weight = new Tally();
  const family = new Tally();
  const spacing = new Tally();
  const radius = new Tally();
  const custom = new Map<string, { count: number; where: Set<string> }>();
  let featureVisible = 0;
  let customElements = 0;
  let italic = 0;
  let tracking = 0;

  const all = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of all) {
    if (el.closest(`#${OVERLAY_ID}`) || el.closest("svg")) continue;
    const s = getComputedStyle(el);
    if (!isVisible(el, s)) continue;
    const o = origin(el);
    const offToken = () => elements.offToken.push(el);

    const checkColour = (value: string, label: string) => {
      const c = parseColor(value);
      if (!c || c[3] === 0) return;
      const ok = tokens.exact.has(rgbaKey(c));
      const derived = !ok && tokens.rgb.has(rgbKey(c));
      colour.add(ok || derived, o, `${label} ${value}`);
      if (!ok && !derived) offToken();
    };

    if (hasOwnText(el)) {
      checkColour(s.color, "text");
      const size = px(s.fontSize);
      const sizeOk = near(size, Object.keys(TYPE).map(Number));
      typeSize.add(sizeOk, o, `font-size ${s.fontSize}`);
      if (sizeOk && s.lineHeight !== "normal") lineHeight.add(Math.abs(px(s.lineHeight) - TYPE[Math.round(size)]) < 0.5, o, `${s.fontSize}/${s.lineHeight}`);
      else if (sizeOk) lineHeight.add(false, o, `${s.fontSize}/normal`);
      const w = Number(s.fontWeight);
      weight.add(WEIGHTS.includes(w), o, `font-weight ${w}`);
      const first = s.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      family.add(first === "V-Inter", o, first);
      if (s.fontStyle === "italic") italic++;
      if (s.letterSpacing !== "normal" && px(s.letterSpacing) !== 0) tracking++;
      if (!sizeOk || !WEIGHTS.includes(w) || first !== "V-Inter") offToken();
    }
    checkColour(s.backgroundColor, "background");
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      if (px(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== "none") {
        checkColour(s[`border${side}Color`], "border");
        break;
      }
    }

    const spaceProps = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft"] as const;
    const spaceValues: [string, string][] = spaceProps.map((p) => [p, s[p]]);
    if (s.display.includes("flex") || s.display.includes("grid")) spaceValues.push(["rowGap", s.rowGap], ["columnGap", s.columnGap]);
    let spaceOff = false;
    for (const [prop, value] of spaceValues) {
      const v = Math.abs(px(value));
      if (!v || v > 128 || value.endsWith("%")) continue;
      const ok = near(v, SPACING);
      spacing.add(ok, o, `${prop.replace(/[A-Z].*/, "")} ${value}`);
      if (!ok) spaceOff = true;
    }
    if (spaceOff) offToken();

    const r = s.borderTopLeftRadius;
    if (px(r) > 0) {
      const rect = el.getBoundingClientRect();
      const v = px(r);
      const ok = r.endsWith("%") || near(v, RADII) || v >= Math.min(rect.width, rect.height) / 2 - 0.5;
      radius.add(ok, o, `radius ${r}`);
      if (!ok) offToken();
    }

    // Hand-written values in feature code: Tailwind arbitrary values that aren't a var() token, and inline visual styles
    if (o.kind !== "feature" && o.kind !== "shadcn") continue;
    featureVisible++;
    const arbitrary = Array.from(el.classList).filter((c) => {
      const value = c.slice(c.lastIndexOf(":") + 1);
      return value.includes("[") && !/\[var\(--[^)]+\)\]/.test(value);
    });
    const inline = el instanceof HTMLElement ? Array.from(el.style).filter((p) => !LIBRARY_INLINE.test(p) && VISUAL_INLINE.test(p)) : [];
    if (arbitrary.length || inline.length) {
      customElements++;
      elements.custom.push(el);
      for (const v of [...arbitrary, ...inline.map((p) => `style="${p}"`)]) {
        const row = custom.get(v) ?? { count: 0, where: new Set<string>() };
        row.count++;
        if (o.where && row.where.size < 3) row.where.add(o.where);
        custom.set(v, row);
      }
    }
  }

  // Icons
  const icons = { phosphor: 0, lucide: 0, other: 0 };
  for (const svg of Array.from(root.querySelectorAll("svg"))) {
    if (svg.parentElement?.closest("svg") || !isVisible(svg, getComputedStyle(svg))) continue;
    if (svg.getAttribute("viewBox") === "0 0 256 256") icons.phosphor++;
    else if (svg.classList.contains("lucide") || [...svg.classList].some((c) => c.startsWith("lucide-"))) icons.lucide++;
    else icons.other++;
  }

  // Dates written outside YYYY-MM-DD
  const dateHits: { text: string; where: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent ?? "";
    const parent = n.parentElement;
    if (!parent || parent.closest(`#${OVERLAY_ID}, script, style`)) continue;
    const match = DATE_PATTERNS.map((p) => text.match(p)?.[0]).find(Boolean);
    if (match && parent.getClientRects().length) {
      elements.dates.push(parent);
      dateHits.push({ text: match, where: origin(parent).where || describe(parent) });
    }
  }
  const dateInputs = root.querySelectorAll("input[type=date], input[type=datetime-local]").length;

  // Accessibility
  let a11y: { violations: AxeResult[]; best: AxeResult[]; passes: number; failed: number; incomplete: number } | null = null;
  if (options.a11y !== false) {
    const axe = (await import("axe-core")).default;
    const result = await axe.run(root, {
      runOnly: { type: "tag", values: [...AA_TAGS, "best-practice"] },
      resultTypes: ["violations", "incomplete"],
    });
    const isAA = (r: AxeResult) => r.tags.some((t) => AA_TAGS.includes(t));
    const violations = result.violations.filter(isAA);
    a11y = {
      violations,
      best: result.violations.filter((r) => !isAA(r)),
      passes: result.passes.filter(isAA).length,
      failed: violations.length,
      incomplete: result.incomplete.filter(isAA).length,
    };
    for (const v of violations) for (const node of v.nodes) {
      const el = document.querySelector(String(node.target[0]));
      if (el) elements.a11y.push(el);
    }
  }

  // Report
  const styleChecks = [colour, typeSize, weight, spacing, radius];
  const styleOn = styleChecks.reduce((n, t) => n + t.on, 0);
  const styleChecked = styleChecks.reduce((n, t) => n + t.checked, 0);
  const a11yElements = a11y ? a11y.violations.reduce((n, v) => n + v.nodes.length, 0) : 0;
  const impact = (level: string) => (a11y ? a11y.violations.filter((v) => v.impact === level).length : 0);

  const summary: BloomAuditReport["summary"] = {
    "Web-ui adoption": {
      value: pct(controlCounts.design, authoredControls),
      detail: `${controlCounts.design} of ${authoredControls} controls are rendered by Design* components`,
    },
    "Native HTML": {
      value: pct(controlCounts.feature, authoredControls),
      detail: `${controlCounts.feature} controls hand-written in feature code`,
    },
    "shadcn/Radix used directly": {
      value: pct(controlCounts.shadcn, authoredControls),
      detail: `${controlCounts.shadcn} controls built from src/components/ui outside Design*`,
    },
    "Bloom tokens": {
      value: pct(styleOn, styleChecked),
      detail: `${styleOn} of ${styleChecked} colour, type, spacing and radius values on Bloom's scales`,
    },
    "Custom CSS": {
      value: pct(customElements, featureVisible),
      detail: `${customElements} of ${featureVisible} feature-code elements carry one-off values (arbitrary classes or inline styles)`,
    },
    "V-Inter": { value: pct(family.on, family.checked), detail: `${family.checked} text elements checked` },
    "Italic / letter spacing": { value: `${italic} / ${tracking}`, detail: "web-ui has neither" },
    Icons: { value: `${icons.phosphor + icons.lucide + icons.other}`, detail: `Phosphor ${icons.phosphor} · Lucide ${icons.lucide} · other SVG ${icons.other}` },
    "Dates not YYYY-MM-DD": { value: `${dateHits.length}`, detail: `${dateInputs} native date inputs` },
  };
  if (a11y) {
    summary["WCAG 2.2 AA"] = {
      value: pct(a11y.passes, a11y.passes + a11y.failed),
      detail: `${a11y.failed} failing rules on ${a11yElements} elements (critical ${impact("critical")}, serious ${impact("serious")}) · ${a11y.incomplete} to review by hand`,
    };
    summary["A11y best practices"] = { value: `${a11y.best.length}`, detail: "issues outside AA (headings, landmarks, …)" };
  }

  const rows: [string, Tally][] = [["Colour", colour], ["Font size", typeSize], ["Line height", lineHeight], ["Font weight", weight], ["Spacing", spacing], ["Radius", radius]];
  last = {
    url: location.href,
    summary,
    elements,
    originsKnown: import.meta.env.DEV,
    tokens: rows.map(([category, t]) => ({ category, checked: t.checked, on: t.on, offenders: t.offenderRows() })),
    typeface: { checked: family.checked, on: family.on, offenders: family.offenderRows() },
    dates: dateHits,
    a11y: a11y && {
      passes: a11y.passes,
      failed: a11y.failed,
      incomplete: a11y.incomplete,
      violations: a11y.violations.map(ruleRow),
      bestPractices: a11y.best.map(ruleRow),
    },
  };
  if (options.quiet) return last;

  const title = `Bloom audit · ${location.pathname}${root === document.body ? "" : ` · ${describe(root)}`}`;
  console.group(`%c${title}`, "font: 600 14px V-Inter, sans-serif; color: #007782");
  console.table(summary);

  console.groupCollapsed("Web-ui components on this page");
  console.table(Object.fromEntries([...designInstances().entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => [n, { instances: c }])));
  console.table(controlCounts);
  console.groupEnd();

  if (nativeOffenders.size) {
    console.groupCollapsed(`Hand-written controls (${controlCounts.feature + controlCounts.shadcn})`);
    console.table(Object.fromEntries([...nativeOffenders.entries()].sort((a, b) => b[1].count - a[1].count).map(([k, v]) => [k.split(" ")[0], v])));
    console.groupEnd();
  }

  console.groupCollapsed("Bloom tokens by category");
  console.table(
    Object.fromEntries(
      rows.map(([label, t]) => [label, { "on scale": pct(t.on, t.checked), checked: t.checked, "feature code": pct(t.featureOn, t.featureChecked), "Design*": pct(t.on - t.featureOn, t.checked - t.featureChecked) }]),
    ),
  );
  for (const [label, t] of rows) {
    if (!t.offenders.size) continue;
    console.groupCollapsed(`${label}: off-scale values`);
    console.table(t.offenderRows());
    console.groupEnd();
  }
  console.groupEnd();

  if (custom.size) {
    console.groupCollapsed(`Custom CSS (${customElements} elements)`);
    console.table(
      [...custom.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 25)
        .map(([value, r]) => ({ value, count: r.count, examples: [...r.where].join("  ") })),
    );
    console.groupEnd();
  }

  if (dateHits.length) {
    console.groupCollapsed(`Dates not YYYY-MM-DD (${dateHits.length})`);
    console.table(dateHits);
    console.groupEnd();
  }

  if (a11y?.violations.length || a11y?.best.length) {
    console.groupCollapsed(`Accessibility (${a11y.failed} AA rules failing)`);
    const table = (list: AxeResult[]) =>
      console.table(list.map((v) => ({ rule: v.id, impact: v.impact, wcag: criterion(v.tags), elements: v.nodes.length, problem: v.help })));
    if (a11y.violations.length) table(a11y.violations);
    for (const v of a11y.violations) {
      console.groupCollapsed(`${v.id}: ${v.help}  ${v.helpUrl}`);
      for (const node of v.nodes.slice(0, 10)) {
        const el = document.querySelector(String(node.target[0]));
        console.log(el ?? node.target[0], el ? origin(el).where : "", "\n" + (node.failureSummary ?? ""));
      }
      console.groupEnd();
    }
    if (a11y.best.length) {
      console.groupCollapsed("Best practices (not AA)");
      table(a11y.best);
      console.groupEnd();
    }
    console.groupEnd();
  }

  console.log(
    `%c${Math.round(performance.now() - started)} ms · bloomAudit.highlight("native" | "shadcn" | "custom" | "offToken" | "a11y" | "dates") outlines them on the page`,
    "color: #5A6566",
  );
  console.groupEnd();

  return last;
}

/* ---------- Highlight ---------- */

const COLOURS: Record<HighlightKind, string> = {
  native: "#D04555",
  shadcn: "#C27C00",
  custom: "#7A3DB8",
  offToken: "#0057B8",
  a11y: "#D04555",
  dates: "#C27C00",
};

let cleanup: (() => void) | null = null;

function clear() {
  cleanup?.();
  cleanup = null;
}

function highlight(kind: HighlightKind) {
  clear();
  if (!last) return console.warn("Run bloomAudit() first.");
  const targets = [...new Set(last.elements[kind])];
  const layer = document.createElement("div");
  layer.id = OVERLAY_ID;
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "2147483647" });
  const boxes = targets.map((el) => {
    const box = document.createElement("div");
    Object.assign(box.style, { position: "fixed", outline: `2px solid ${COLOURS[kind]}`, background: `${COLOURS[kind]}14`, borderRadius: "2px" });
    layer.appendChild(box);
    return [el, box] as const;
  });
  const place = () => {
    for (const [el, box] of boxes) {
      const r = el.getBoundingClientRect();
      Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    }
  };
  place();
  document.body.appendChild(layer);
  window.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  cleanup = () => {
    window.removeEventListener("scroll", place, true);
    window.removeEventListener("resize", place);
    layer.remove();
  };
  console.log(`${targets.length} ${kind} elements outlined · bloomAudit.clear() removes them`);
}

/* ---------- Install ---------- */

declare global {
  interface Window {
    bloomAudit: typeof bloomAudit & { highlight: typeof highlight; clear: typeof clear; last: () => BloomAuditReport | null };
  }
}

export { bloomAudit };

export function install() {
  window.bloomAudit = Object.assign(bloomAudit, { highlight, clear, last: () => last });
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyB") void bloomAudit();
  });
  console.info("%cBloom audit: run bloomAudit() or press Alt+Shift+B", "color: #007782");
}
