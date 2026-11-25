/**
 * Build-time scan of the app's source for Bloom compliance: which controls feature code renders
 * through Design* components, which it hand-writes (raw HTML or shadcn primitives), and which
 * one-off styles it carries. The Vite plugin `bloomScanPlugin` (vite.config.ts) runs it over
 * `src/` and serves the result as `virtual:bloom-scan` to the Bloom compliance page.
 *
 * Only the types are imported by app code; the scan itself (and TypeScript) stays in the build.
 */
import ts from "typescript";

export type OffenderKind = "native" | "shadcn" | "custom";

export interface ScanOffender {
  file: string;
  line: number;
  kind: OffenderKind;
  /** `<button>`, `Dialog`, `text-[13px]`, `style` … */
  what: string;
}

export interface ScanCounts {
  /** Design* elements, and raw tables styled with `tableStyles` */
  design: number;
  native: number;
  shadcn: number;
  /** One-off values: arbitrary Tailwind classes, off-scale spacing or weights, inline styles */
  custom: number;
}

export interface ScanFile extends ScanCounts {
  file: string;
}

export interface ScanPage extends ScanCounts {
  route: string;
  file: string;
  /** Feature files the page renders, its own file included */
  files: number;
}

export interface BloomScan {
  generatedAt: string;
  totals: ScanCounts & { files: number };
  files: ScanFile[];
  pages: ScanPage[];
  components: { name: string; count: number }[];
  offenders: ScanOffender[];
}

export interface SourceFile {
  /** Path from the project root, e.g. `src/pages/Auth.tsx` */
  path: string;
  text: string;
}

const CONTROL_TAGS = new Set(["button", "a", "input", "select", "textarea", "table", "img", "hr", "dialog", "details", "progress", "meter"]);
const TABLE_TAGS = new Set(["table", "thead", "tbody", "tr", "th", "td"]);
const CONTROL_ROLES = new Set([
  "button", "link", "checkbox", "radio", "switch", "tab", "tablist", "menu", "menuitem", "option",
  "listbox", "combobox", "dialog", "slider", "tooltip", "progressbar", "separator",
]);
/** shadcn pieces that set up the app rather than draw a control */
const UI_SETUP = /(Provider|^Toaster$)/;
const SPACING_UTILITY = /^-?(gap-x|gap-y|gap|space-x|space-y|px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m)-(.+)$/;
const SPACING_STEPS = new Set(["0", "px", "0.5", "1", "1.5", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "16", "24", "32", "auto"]);
const OFF_WEIGHTS = new Set(["font-thin", "font-extralight", "font-light", "font-bold", "font-extrabold", "font-black"]);
const VISUAL_STYLE = /^(color|background|border|margin|padding|gap|font|lineHeight|letterSpacing|borderRadius|boxShadow)/;

/** Class names that aren't on Bloom's scales, from one className string. */
export function offScaleClasses(classes: string): string[] {
  return classes.split(/\s+/).filter((cls) => {
    if (!cls) return false;
    const value = cls.slice(cls.lastIndexOf(":") + 1);
    if (value.includes("[")) return !/\[var\(--[^)]+\)\]/.test(value);
    if (OFF_WEIGHTS.has(value) || value === "italic") return true;
    if (value.startsWith("tracking-") && value !== "tracking-normal") return true;
    const spacing = value.match(SPACING_UTILITY);
    return Boolean(spacing && !SPACING_STEPS.has(spacing[2]));
  });
}

const isFeatureFile = (path: string) =>
  /^src\/.*\.(ts|tsx)$/.test(path) &&
  !/\.(test|spec)\.tsx?$/.test(path) &&
  !path.endsWith(".d.ts") &&
  !/^src\/(components\/ds|components\/ui|test|integrations)\//.test(path);

function resolveImport(from: string, specifier: string, known: Set<string>): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith(".")) {
    const parts = from.split("/").slice(0, -1);
    for (const part of specifier.split("/")) {
      if (part === "..") parts.pop();
      else if (part !== ".") parts.push(part);
    }
    base = parts.join("/");
  } else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
    if (known.has(candidate)) return candidate;
  }
  return base;
}

const tagName = (name: ts.JsxTagNameExpression): string =>
  ts.isIdentifier(name) ? name.text : ts.isPropertyAccessExpression(name) ? tagName(name.expression as ts.JsxTagNameExpression) : name.getText();

const attribute = (attrs: ts.JsxAttributes, name: string) =>
  attrs.properties.find((p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name);

const stringValue = (attr: ts.JsxAttribute | undefined) =>
  attr?.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : null;

/** Every string a className expression can produce: literals, template parts and cn()/clsx() arguments. */
function classStrings(node: ts.Node): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
    else if (ts.isTemplateExpression(n)) {
      out.push(n.head.text);
      for (const span of n.templateSpans) {
        visit(span.expression);
        out.push(span.literal.text);
      }
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

interface FileScan {
  counts: ScanCounts;
  imports: string[];
  components: Map<string, number>;
  offenders: ScanOffender[];
  routes: { route: string; component: string }[];
  importedFrom: Map<string, string>;
}

function scanFile(file: SourceFile, known: Set<string>): FileScan {
  const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true, file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const importedFrom = new Map<string, string>();
  const imports: string[] = [];
  const counts: ScanCounts = { design: 0, native: 0, shadcn: 0, custom: 0 };
  const components = new Map<string, number>();
  const offenders: ScanOffender[] = [];
  const routes: FileScan["routes"] = [];
  const lineOf = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const flag = (node: ts.Node, kind: OffenderKind, what: string) => {
    counts[kind]++;
    offenders.push({ file: file.path, line: lineOf(node), kind, what });
  };

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.importClause?.isTypeOnly) continue;
    const resolved = resolveImport(file.path, statement.moduleSpecifier.text, known);
    if (!resolved) continue;
    imports.push(resolved);
    const clause = statement.importClause;
    if (clause?.name) importedFrom.set(clause.name.text, resolved);
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const el of clause.namedBindings.elements) importedFrom.set(el.name.text, resolved);
    }
  }

  /** A shadcn part (DropdownMenuItem) inside its own root (DropdownMenu) counts with the root, once. */
  const insideSameUi = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, from: string) => {
    for (let p = ts.isJsxOpeningElement(node) ? node.parent.parent : node.parent; p; p = p.parent) {
      if (ts.isJsxElement(p) && importedFrom.get(tagName(p.openingElement.tagName)) === from) return true;
    }
    return false;
  };

  const visitElement = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => {
    const name = tagName(node.tagName);
    const attrs = node.attributes;
    const className = attribute(attrs, "className");
    const classes = className?.initializer ? classStrings(className.initializer) : [];

    if (/^[a-z]/.test(name)) {
      const role = stringValue(attribute(attrs, "role"));
      const type = stringValue(attribute(attrs, "type"));
      const usesTableStyles = TABLE_TAGS.has(name) && Boolean(className?.initializer?.getText(source).includes("tableStyles"));
      if (name === "table" && usesTableStyles) {
        counts.design++;
        components.set("tableStyles", (components.get("tableStyles") ?? 0) + 1);
      } else if ((CONTROL_TAGS.has(name) && !(name === "input" && (type === "file" || type === "hidden"))) || (role && CONTROL_ROLES.has(role))) {
        flag(node, "native", role && !CONTROL_TAGS.has(name) ? `<${name} role="${role}">` : `<${name}>`);
      }
    } else {
      const from = importedFrom.get(name) ?? "";
      if (/^Design[A-Z]/.test(name) && from.startsWith("src/components/ds/")) {
        counts.design++;
        components.set(name, (components.get(name) ?? 0) + 1);
      } else if (from.startsWith("src/components/ui/") && !UI_SETUP.test(name) && !insideSameUi(node, from)) {
        flag(node, "shadcn", name);
      }
    }

    for (const cls of offScaleClasses(classes.join(" "))) flag(node, "custom", cls);

    const style = attribute(attrs, "style");
    const styleObject = style?.initializer && ts.isJsxExpression(style.initializer) ? style.initializer.expression : undefined;
    if (styleObject && ts.isObjectLiteralExpression(styleObject)) {
      const visual = styleObject.properties.map((p) => (p.name ? p.name.getText(source) : "")).filter((p) => VISUAL_STYLE.test(p));
      if (visual.length) flag(node, "custom", `style={{ ${visual.join(", ")} }}`);
    }

    if (name === "Route") {
      const path = stringValue(attribute(attrs, "path"));
      const element = attribute(attrs, "element");
      const jsx = element?.initializer && ts.isJsxExpression(element.initializer) ? element.initializer.expression : undefined;
      if (path && jsx && (ts.isJsxSelfClosingElement(jsx) || ts.isJsxElement(jsx))) {
        const component = tagName(ts.isJsxElement(jsx) ? jsx.openingElement.tagName : jsx.tagName);
        if (component !== "Navigate") routes.push({ route: path, component });
      }
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node);
    ts.forEachChild(node, visit);
  };
  visit(source);

  return { counts, imports, components, offenders, routes, importedFrom };
}

const add = (a: ScanCounts, b: ScanCounts) => {
  a.design += b.design;
  a.native += b.native;
  a.shadcn += b.shadcn;
  a.custom += b.custom;
};

/**
 * Scans the app's source files. Routes come from `<Route path element>` in `src/App.tsx`; totals
 * cover only files reachable from it, so unrouted previews and drafts don't count.
 */
export function scanSources(sources: SourceFile[], generatedAt = new Date().toISOString()): BloomScan {
  const known = new Set(sources.map((s) => s.path));
  const scans = new Map<string, FileScan>();
  for (const source of sources) if (isFeatureFile(source.path)) scans.set(source.path, scanFile(source, known));

  const reach = (start: string) => {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const file = stack.pop()!;
      if (seen.has(file) || !scans.has(file)) continue;
      seen.add(file);
      stack.push(...scans.get(file)!.imports);
    }
    return seen;
  };

  const pages: ScanPage[] = [];
  const app = scans.get("src/App.tsx");
  for (const { route, component } of app?.routes ?? []) {
    const file = app!.importedFrom.get(component);
    if (!file || !scans.has(file)) continue;
    const reached = reach(file);
    const counts: ScanCounts = { design: 0, native: 0, shadcn: 0, custom: 0 };
    for (const f of reached) add(counts, scans.get(f)!.counts);
    pages.push({ route, file, files: reached.size, ...counts });
  }

  const shipped = reach("src/App.tsx");
  const totals = { design: 0, native: 0, shadcn: 0, custom: 0, files: shipped.size };
  const components = new Map<string, number>();
  const offenders: ScanOffender[] = [];
  const files: ScanFile[] = [];
  for (const file of shipped) {
    const scan = scans.get(file)!;
    add(totals, scan.counts);
    for (const [name, count] of scan.components) components.set(name, (components.get(name) ?? 0) + count);
    offenders.push(...scan.offenders);
    if (scan.counts.design || scan.counts.native || scan.counts.shadcn || scan.counts.custom) files.push({ file, ...scan.counts });
  }

  return {
    generatedAt,
    totals,
    files: files.sort((a, b) => b.native + b.shadcn - (a.native + a.shadcn) || a.file.localeCompare(b.file)),
    pages,
    components: [...components.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    offenders: offenders.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  };
}
