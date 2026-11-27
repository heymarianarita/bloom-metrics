import { explainClass, offScaleClasses, scanSources } from "./bloomScan";

const app = `
import { Route } from "react-router-dom";
import Home from "./pages/Home";
export const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/home" />} />
    <Route path="/home" element={<Home />} />
  </Routes>
);`;

const home = `
import { DesignButton } from "@/components/ds/DesignButton";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { tableStyles } from "@/components/ds/tableStyles";
import Panel from "../components/Panel";
export default function Home() {
  return (
    <TooltipProvider>
      <DesignButton>Save</DesignButton>
      <button className="px-2.5 text-[13px]">Raw</button>
      <input type="file" hidden />
      <div role="button" style={{ color: "red", transform: "none" }} />
      <table className={tableStyles.table}><tbody /></table>
      <DropdownMenu>
        <DropdownMenuTrigger />
        <DropdownMenuItem />
      </DropdownMenu>
      <Panel />
    </TooltipProvider>
  );
}`;

const panel = `
import { DesignCard } from "@/components/ds/DesignCard";
export default function Panel() {
  return <DesignCard className="gap-x-4 p-4 text-[var(--foreground)] font-bold" />;
}`;

const unrouted = `export const Preview = () => <button>Not shipped</button>;`;

const sources = [
  { path: "src/App.tsx", text: app },
  { path: "src/pages/Home.tsx", text: home },
  { path: "src/components/Panel.tsx", text: panel },
  { path: "src/pages/Preview.tsx", text: unrouted },
  { path: "src/components/ds/DesignButton.tsx", text: "export const DesignButton = () => <button />;" },
];

describe("scanSources", () => {
  const scan = scanSources(sources, "2026-11-25T12:00:00.000Z");

  it("counts Design* elements and tables styled with tableStyles as web-ui", () => {
    expect(scan.components).toEqual(
      expect.arrayContaining([
        { name: "DesignButton", count: 1 },
        { name: "DesignCard", count: 1 },
        { name: "tableStyles", count: 1 },
      ]),
    );
    expect(scan.totals.design).toBe(3);
  });

  it("flags raw controls and role'd elements, but not hidden file inputs", () => {
    const native = scan.offenders.filter((o) => o.kind === "native").map((o) => o.what);
    expect(native).toEqual(["<button>", '<div role="button">']);
  });

  it("counts a shadcn compound once and ignores providers", () => {
    expect(scan.offenders.filter((o) => o.kind === "shadcn").map((o) => o.what)).toEqual(["DropdownMenu"]);
  });

  it("flags off-scale classes and visual inline styles with their line", () => {
    const custom = scan.offenders.filter((o) => o.kind === "custom");
    expect(custom.map((o) => o.what)).toEqual(["font-bold", "px-2.5", "text-[13px]", "style={{ color }}"]);
    expect(custom[1]).toMatchObject({ file: "src/pages/Home.tsx", line: 11 });
  });

  it("sums a page over the files it imports, and skips unrouted files", () => {
    expect(scan.pages).toEqual([{ route: "/home", file: "src/pages/Home.tsx", files: 2, design: 3, native: 2, shadcn: 1, custom: 4 }]);
    expect(scan.offenders.some((o) => o.file === "src/pages/Preview.tsx")).toBe(false);
    expect(scan.totals.files).toBe(3);
  });
});

describe("reasons", () => {
  const grid = `
import { tableStyles as ts } from "@/components/ds/tableStyles";
import { DesignDropdown, DesignDropdownTrigger } from "@/components/ds/DesignDropdown";
export default function Grid() {
  return (
    <table className={ts.table}><tbody><tr><td><button>x</button></td></tr></tbody></table>
  );
}
export const Menu = () => (
  <DesignDropdown><DesignDropdownTrigger><button>Open</button></DesignDropdownTrigger></DesignDropdown>
);`;
  const scan = scanSources([
    { path: "src/App.tsx", text: `import Grid from "./pages/Grid";\nexport const App = () => <Route path="/g" element={<Grid />} />;` },
    { path: "src/pages/Grid.tsx", text: grid },
    { path: "src/components/ds/tableStyles.ts", text: "export const tableStyles = {};" },
  ]);

  it("counts a table styled through a renamed tableStyles import as Bloom", () => {
    expect(scan.offenders.some((o) => o.what === "<table>")).toBe(false);
  });

  it("says why a control is hand-written, where and what to use instead", () => {
    const [cell, trigger] = scan.offenders;
    expect(cell).toMatchObject({ component: "Grid", code: expect.stringContaining("<button>x</button>"), why: expect.stringContaining("dense grid cell") });
    expect(trigger).toMatchObject({ component: "Menu", why: expect.stringContaining("DesignDropdownTrigger"), fix: expect.stringContaining("DesignButton") });
  });

  it("tells token misses from sizes", () => {
    expect(explainClass("hover:bg-[rgba(0,0,0,0.1)]").category).toBe("colour");
    expect(explainClass("text-[13px]").category).toBe("type");
    expect(explainClass("w-[200px]").category).toBe("size");
  });
});

describe("offScaleClasses", () => {
  it("allows Bloom steps, tokens and variants", () => {
    expect(offScaleClasses("p-4 gap-x-3 hover:bg-[var(--surface-hover)] -mt-2 font-semibold tracking-normal")).toEqual([]);
  });

  it("flags arbitrary values, half steps, off weights, italic and tracking", () => {
    expect(offScaleClasses("w-[200px] py-3.5 md:font-bold italic tracking-tight")).toEqual(["w-[200px]", "py-3.5", "md:font-bold", "italic", "tracking-tight"]);
  });
});
