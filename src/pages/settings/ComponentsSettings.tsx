import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, Cube, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import {
  DesignDropdown,
  DesignDropdownContent,
  DesignDropdownItem,
  DesignDropdownCheckboxItem,
  DesignDropdownLabel,
  DesignDropdownTrigger,
} from "@/components/ds/DesignDropdown";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { badgeVariants } from "@/components/ds/DesignBadge";
import { cn } from "@/lib/utils";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { useFigmaAnalytics, useFigmaLibraries } from "@/hooks/useFigmaAnalytics";
import { useManualDatasets, useAllDatasetColumns } from "@/hooks/useManualDatasets";
import {
  DEFAULT_ALIAS_CONFIG,
  mapFromTables,
  normalizeTables,
  suggestComponentName,
  useComponentAliases,
  useSaveComponentAliases,
  type ComponentTable,
} from "@/hooks/useComponentAliases";

/** Spreadsheet density, as in the dataset grid. */
const dense = {
  th: cn(ts.th, ts.thSticky, "px-2 py-1"),
  tdAction: cn(ts.td, "px-1 py-0"),
  input: cn(ts.cellInput, "px-2 py-1"),
  iconButton:
    "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
};

/** A platform's names for one component: the whole cell opens a searchable checklist. */
const NamesCell = ({
  label,
  names,
  free,
  onToggle,
}: {
  label: string;
  names: string[];
  /** Names not yet matched to any row. */
  free: string[];
  onToggle: (name: string, on: boolean) => void;
}) => {
  const [q, setQ] = React.useState("");
  const search = React.useRef<HTMLInputElement>(null);
  const term = q.trim().toLowerCase();
  const listed = [...names, ...free].filter((n) => n.toLowerCase().includes(term));
  const text = names.join(", ");
  return (
    <td className={ts.tdEditable}>
      <DesignDropdown onOpenChange={(open) => !open && setQ("")}>
        <DesignDropdownTrigger>
          <button
            type="button"
            className={cn(dense.input, "flex min-h-8 max-w-[280px] flex-wrap items-center gap-1 text-left")}
          >
            {names.map((n, i) => (
              <span key={n} className={cn(badgeVariants({ theme: "muted", styling: "light" }), "max-w-full")}>
                <span className="truncate">{n}</span>
                {i < names.length - 1 && <span className="sr-only">,</span>}
              </span>
            ))}
            <span className="sr-only">{text ? `, ${label}` : `${label}, no names`}</span>
            {!text && <Plus size={14} className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />}
          </button>
        </DesignDropdownTrigger>
        <DesignDropdownContent
          width={280}
          height={320}
          onKeyDownCapture={(e) => {
            // Typing while an item has focus keeps filtering instead of jumping to a match.
            if (e.key.length === 1 && e.target !== search.current) search.current?.focus();
          }}
        >
          <div className="px-2 pb-1">
            <DesignInputBar
              ref={search}
              autoFocus
              size="small"
              aria-label={`Search ${label} names`}
              placeholder="Search names"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  e.currentTarget.closest("[role=menu]")?.querySelector<HTMLElement>("[role=menuitemcheckbox]")?.focus();
                } else if (e.key !== "Escape" && e.key !== "Tab") {
                  e.stopPropagation();
                }
              }}
            />
          </div>
          {listed.length === 0 ? (
            <DesignDropdownLabel>{term ? "No names match" : "No names left"}</DesignDropdownLabel>
          ) : (
            listed.map((n) => (
              <DesignDropdownCheckboxItem key={n} checked={names.includes(n)} onCheckedChange={(on) => onToggle(n, on)}>
                {n}
              </DesignDropdownCheckboxItem>
            ))
          )}
        </DesignDropdownContent>
      </DesignDropdown>
    </td>
  );
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** Text input that saves on blur / Enter instead of every keystroke. */
const BlurInput = ({
  value,
  onSave,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  "aria-label"?: string;
}) => {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <DesignInputText
      size="small"
      aria-label={ariaLabel}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
};

/** Borderless input filling a grid cell; saves on blur, Enter and arrows move up and down the column. */
const CellInput = ({
  id,
  value,
  onSave,
  onMove,
  "aria-label": ariaLabel,
}: {
  id: string;
  value: string;
  onSave: (v: string) => void;
  onMove: (step: 1 | -1) => void;
  "aria-label": string;
}) => {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => (v.trim() ? v !== value && onSave(v.trim()) : setV(value))}
      onKeyDown={(e) => {
        if (e.key === "Escape") setV(value);
        else if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          onMove(e.key === "ArrowUp" ? -1 : 1);
        }
      }}
      className={dense.input}
    />
  );
};

const ComponentsSettings = () => {
  const { data: datasets = [], isLoading: dsLoading } = useManualDatasets();
  const { data: columns = [], isLoading: colLoading } = useAllDatasetColumns();
  const { data: config = DEFAULT_ALIAS_CONFIG, isLoading: cfgLoading } = useComponentAliases();
  const save = useSaveComponentAliases();
  const [search, setSearch] = React.useState("");

  // Bloom Design System Library components from Figma, as an extra source column.
  const { data: libraries = [] } = useFigmaLibraries();
  const bloomLib = libraries.find((l) => /bloom/i.test(l.name)) ?? libraries[0];
  const figmaId = bloomLib ? `figma:${bloomLib.key}` : "";
  const { data: figma, isLoading: figmaLoading } = useFigmaAnalytics(bloomLib?.key ?? "");
  const figmaNames = React.useMemo(() => {
    const excluded = new Set(bloomLib?.excludedPages ?? []);
    const set = new Set<string>();
    (figma?.components ?? []).forEach((c) => {
      if (!excluded.has(c.page) && c.name.trim()) set.add(c.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [figma, bloomLib]);

  const activeDatasets = datasets.filter((d) => !d.archived);
  const ids = activeDatasets.map((d) => d.id);

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["component-names", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      // Page through all rows (the backend returns at most 1000 per request).
      const all: { dataset_id: string; data: Record<string, unknown> }[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("manual_dataset_rows")
          .select("id, dataset_id, data")
          .in("dataset_id", ids)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        all.push(...((data ?? []) as typeof all));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
  });

  const norm = (s: string) => suggestComponentName(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  /** Best unused value in a column for a component name, or undefined. */
  const bestMatch = (name: string, values: string[], used: Set<string>, exactOnly = false) => {
    const n = norm(name);
    if (!n) return undefined;
    const free = values.filter((v) => !used.has(v));
    return (
      free.find((v) => norm(v) === n) ??
      (!exactOnly && n.length >= 4
        ? free
            .filter((v) => {
              const m = norm(v);
              return m.length >= 4 && (m.includes(n) || n.includes(m));
            })
            .sort((a, b) => Math.abs(norm(a).length - n.length) - Math.abs(norm(b).length - n.length))[0]
        : undefined)
    );
  };
  /** Fills empty cells with similarly named values; each value used once per column. */
  const autoMatch = (t: ComponentTable, exactOnly = false): ComponentTable => {
    const rowsOut = t.rows.map((r) => ({ ...r, cells: { ...r.cells } }));
    t.columns.forEach((c) => {
      const values = valuesOf(c.datasetId, c.columnKey);
      const used = new Set(rowsOut.flatMap((r) => r.cells[c.id] ?? []));
      rowsOut.forEach((r) => {
        if (r.cells[c.id]?.length) return;
        const m = bestMatch(r.name, values, used, exactOnly);
        if (m) {
          r.cells[c.id] = [m];
          used.add(m);
        }
      });
    });
    return { ...t, rows: rowsOut };
  };

  /** Distinct values of a dataset column. */
  const valuesOf = React.useCallback(
    (datasetId: string, key: string) => {
      if (datasetId.startsWith("figma:")) return datasetId === figmaId ? figmaNames : [];
      const set = new Set<string>();
      rows.forEach((r) => {
        if (r.dataset_id !== datasetId) return;
        const v = String(r.data?.[key] ?? "").trim();
        if (v) set.add(v);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
    [rows, figmaId, figmaNames],
  );

  // Starting table (used until the first edit is saved).
  const seeded = React.useMemo<ComponentTable[]>(() => {
    const cols = activeDatasets
      .map((d) => {
        const c = columns.find((c) => c.dataset_id === d.id && /component/i.test(c.label + " " + c.key));
        return c ? { id: uid(), datasetId: d.id, columnKey: c.key } : null;
      })
      .filter((c): c is NonNullable<typeof c> => !!c);
    const byName = new Map<string, Record<string, string[]>>();
    cols.forEach((col) =>
      valuesOf(col.datasetId, col.columnKey).forEach((raw) => {
        const shared = config.map[col.datasetId]?.[raw] ?? suggestComponentName(raw);
        const e = byName.get(shared) ?? {};
        (e[col.id] ??= []).push(raw);
        byName.set(shared, e);
      }),
    );
    const tableRows = Array.from(byName.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, cells]) => ({ id: uid(), name, cells }));
    return [autoMatch({ id: uid(), name: "Components", columns: cols, rows: tableRows })];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasets, columns, valuesOf, config.map]);

  const tables = React.useMemo(() => normalizeTables(config.tables ?? seeded), [config.tables, seeded]);

  /** Merges duplicate rows, drops empty ones, tidies names and adds unmatched Figma components. */
  const cleanUp = (t: ComponentTable): ComponentTable => {
    const colIds = new Set(t.columns.map((c) => c.id));
    const byKey = new Map<string, { id: string; name: string; cells: Record<string, string[]> }>();
    t.rows.forEach((r) => {
      const name = suggestComponentName(r.name) || r.name.trim();
      const key = norm(name);
      if (!key) return;
      const e = byKey.get(key) ?? { id: r.id, name, cells: {} };
      Object.entries(r.cells).forEach(([cid, vals]) => {
        if (!colIds.has(cid)) return;
        e.cells[cid] = Array.from(new Set([...(e.cells[cid] ?? []), ...vals]));
      });
      byKey.set(key, e);
    });
    // Each name belongs to one row only.
    const seen = new Map<string, Set<string>>();
    const out = Array.from(byKey.values()).map((r) => {
      const cells: Record<string, string[]> = {};
      Object.entries(r.cells).forEach(([cid, vals]) => {
        const s = seen.get(cid) ?? new Set<string>();
        const keep = vals.filter((v) => !s.has(v));
        keep.forEach((v) => s.add(v));
        seen.set(cid, s);
        if (keep.length) cells[cid] = keep;
      });
      return { ...r, cells };
    });
    // Figma components not yet in any row get their own row.
    t.columns
      .filter((c) => c.datasetId.startsWith("figma:"))
      .forEach((c) => {
        const used = seen.get(c.id) ?? new Set<string>();
        valuesOf(c.datasetId, c.columnKey).forEach((n) => {
          if (used.has(n)) return;
          const existing = out.find((r) => norm(r.name) === norm(n) && !r.cells[c.id]?.length);
          if (existing) existing.cells[c.id] = [n];
          else out.push({ id: uid(), name: suggestComponentName(n) || n, cells: { [c.id]: [n] } });
        });
      });
    const rowsOut = out
      .filter((r) => Object.values(r.cells).some((v) => v.length))
      .sort((a, b) => a.name.localeCompare(b.name));
    return autoMatch({ ...t, rows: rowsOut }, true);
  };

  // One-time: add the Bloom Figma library as a column and tidy the table.
  const figmaRan = React.useRef(false);
  React.useEffect(() => {
    if (figmaRan.current || !config.tables || !figmaId || figmaNames.length === 0 || rows.length === 0) return;
    figmaRan.current = true;
    const current = normalizeTables(config.tables);
    if (current.some((t) => t.columns.some((c) => c.datasetId.startsWith("figma:")))) return;
    const next = current.map((t, i) =>
      i === 0 ? cleanUp({ ...t, columns: [{ id: uid(), datasetId: figmaId, columnKey: "component" }, ...t.columns] }) : t,
    );
    commit(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tables, figmaId, figmaNames, rows]);

  // Automatically link identical names (e.g. "Badge" ↔ "Badge") in saved tables.
  const autoRan = React.useRef(false);
  React.useEffect(() => {
    if (autoRan.current || !config.tables || rows.length === 0 || (!!bloomLib && figmaLoading)) return;
    autoRan.current = true;
    const next = normalizeTables(config.tables).map((t) => autoMatch(t, true));
    if (JSON.stringify(next) !== JSON.stringify(config.tables)) commit(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tables, figmaLoading, rows]);

  const commit = (next: ComponentTable[]) => save.mutate({ tables: next, map: mapFromTables(next) });
  const updateTable = (id: string, fn: (t: ComponentTable) => ComponentTable) =>
    commit(tables.map((t) => (t.id === id ? fn(t) : t)));

  const addTable = () =>
    commit([...tables, { id: uid(), name: `Table ${tables.length + 1}`, columns: [], rows: [] }]);
  const deleteTable = (id: string) => {
    if (confirm("Delete this table and all its rows?")) commit(tables.filter((t) => t.id !== id));
  };

  const datasetName = (id: string) =>
    id.startsWith("figma:")
      ? `Figma · ${libraries.find((l) => `figma:${l.key}` === id)?.name ?? "Library"}`
      : datasets.find((d) => d.id === id)?.name ?? "Unknown dataset";
  const columnLabel = (dsId: string, key: string) =>
    columns.find((c) => c.dataset_id === dsId && c.key === key)?.label ?? key;
  const sourceTitle = (c: { datasetId: string; columnKey: string }) =>
    datasetName(c.datasetId) +
    (!c.datasetId.startsWith("figma:") && !/component/i.test(c.columnKey) ? ` · ${columnLabel(c.datasetId, c.columnKey)}` : "");

  const addColumnOptions = columns
    .filter((c) => ids.includes(c.dataset_id))
    .map((c) => ({ value: `${c.dataset_id}::${c.key}`, label: `${datasetName(c.dataset_id)} · ${c.label}` }))
    .concat(libraries.map((l) => ({ value: `figma:${l.key}::component`, label: `Figma · ${l.name}` })))
    .sort((a, b) => a.label.localeCompare(b.label));

  const loading = dsLoading || colLoading || cfgLoading || (ids.length > 0 && rowsLoading);
  const figmaPending = !!bloomLib && figmaLoading;
  const q = search.trim().toLowerCase();

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Components"
          subtitle="Match each platform's name for the same component, so they're counted together in adoption breakdowns."
        />
        <DesignSpacer size="medium" />
        {loading ? (
          <DesignLoader />
        ) : (
          <>
            {figmaPending && (
              <>
                <p className="text-sm text-muted-foreground">Loading component names from Figma — the Figma column will fill in shortly.</p>
                <DesignSpacer size="small" />
              </>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="max-w-[360px] flex-1">
                <DesignInputBar
                  className="bg-background border border-border focus-within:border-primary"
                  leftIcon={<MagnifyingGlass size={16} />}
                  placeholder="Search components"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DesignButton size="medium" variant="outlined" theme="primary" icon={<Plus size={16} />} onClick={addTable}>
                Add table
              </DesignButton>
            </div>
            <DesignSpacer size="medium" />
            {tables.length === 0 && (
              <DesignEmptyState icon={<Cube size={40} />} title="No tables yet" body="Add a table to start matching components." />
            )}
            <div className="flex flex-col gap-6">
              {tables.map((t) => {
                const visible = q
                  ? t.rows.filter((r) => [r.name, ...Object.values(r.cells).flat()].some((n) => n.toLowerCase().includes(q)))
                  : t.rows;
                const usedCols = new Set(t.columns.map((c) => `${c.datasetId}::${c.columnKey}`));
                return (
                  <DesignCard key={t.id} className="p-4">
                    <div className="flex items-center gap-3 pb-3">
                      <div className="max-w-[280px] flex-1">
                        <BlurInput aria-label="Table name" value={t.name} onSave={(name) => updateTable(t.id, (x) => ({ ...x, name }))} />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <DesignButton size="small" variant="outlined" theme="primary" onClick={() => updateTable(t.id, cleanUp)}>
                          Clean up
                        </DesignButton>
                        <DesignButton size="small" variant="outlined" theme="primary" onClick={() => updateTable(t.id, autoMatch)}>
                          Auto-match
                        </DesignButton>
                        <DesignButton size="small" variant="flat" theme="error" icon={<Trash size={16} />} onClick={() => deleteTable(t.id)}>
                          Delete table
                        </DesignButton>
                      </div>
                    </div>
                    <div className={`${ts.container} max-h-[calc(100vh-240px)] overflow-auto`}>
                      <table className={`${ts.table} ${ts.colDividers}`}>
                        <thead>
                          <tr className={ts.headRow}>
                            <th className={cn(dense.th, "left-0 z-20 min-w-[200px]")}>Component</th>
                            {t.columns.map((c) => {
                              const title = sourceTitle(c);
                              return (
                                <th key={c.id} className={cn(dense.th, "min-w-[200px]")}>
                                  <div className="flex max-w-[264px] items-center gap-1">
                                    <DesignTooltip content={title}>
                                      <span className="flex-1 truncate">{title}</span>
                                    </DesignTooltip>
                                    <DesignDropdown>
                                      <DesignDropdownTrigger>
                                        <button aria-label={`Options for ${title}`} className={cn(dense.iconButton, "-my-1 h-5 w-5")}>
                                          <CaretDown size={14} />
                                        </button>
                                      </DesignDropdownTrigger>
                                      <DesignDropdownContent width={200}>
                                        <DesignDropdownItem
                                          icon={<Trash size={16} />}
                                          onSelect={() =>
                                            updateTable(t.id, (x) => ({
                                              ...x,
                                              columns: x.columns.filter((y) => y.id !== c.id),
                                              rows: x.rows.map((r) => {
                                                const { [c.id]: _, ...cells } = r.cells;
                                                return { ...r, cells };
                                              }),
                                            }))
                                          }
                                        >
                                          Remove column
                                        </DesignDropdownItem>
                                      </DesignDropdownContent>
                                    </DesignDropdown>
                                  </div>
                                </th>
                              );
                            })}
                            <th className={cn(dense.th, "w-8 px-1 py-0")}>
                              <DesignDropdown>
                                <DesignDropdownTrigger>
                                  <button aria-label="Add column" className={dense.iconButton}>
                                    <Plus size={14} />
                                  </button>
                                </DesignDropdownTrigger>
                                <DesignDropdownContent width={280} height={320}>
                                  <DesignDropdownLabel>Add a column from</DesignDropdownLabel>
                                  {addColumnOptions.filter((o) => !usedCols.has(o.value)).length === 0 ? (
                                    <DesignDropdownLabel>Every source is already a column</DesignDropdownLabel>
                                  ) : (
                                    addColumnOptions
                                      .filter((o) => !usedCols.has(o.value))
                                      .map((o) => (
                                        <DesignDropdownItem
                                          key={o.value}
                                          onSelect={() => {
                                            const [datasetId, columnKey] = o.value.split("::");
                                            updateTable(t.id, (x) =>
                                              autoMatch({ ...x, columns: [...x.columns, { id: uid(), datasetId, columnKey }] }),
                                            );
                                          }}
                                        >
                                          {o.label}
                                        </DesignDropdownItem>
                                      ))
                                  )}
                                </DesignDropdownContent>
                              </DesignDropdown>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((r, i) => (
                            <tr key={r.id} className={`group ${ts.row}`}>
                              <td className={cn(ts.tdEditable, "sticky left-0 z-[5] bg-inherit")}>
                                <CellInput
                                  id={`cmp-${t.id}-${i}`}
                                  aria-label={`Component name, row ${i + 1}`}
                                  value={r.name}
                                  onSave={(name) =>
                                    updateTable(t.id, (x) => ({ ...x, rows: x.rows.map((y) => (y.id === r.id ? { ...y, name } : y)) }))
                                  }
                                  onMove={(step) => {
                                    const next = document.getElementById(`cmp-${t.id}-${i + step}`) as HTMLInputElement | null;
                                    if (next) {
                                      next.focus();
                                      next.select();
                                    } else (document.activeElement as HTMLElement | null)?.blur();
                                  }}
                                />
                              </td>
                              {t.columns.map((c) => (
                                <NamesCell
                                  key={c.id}
                                  label={sourceTitle(c)}
                                  names={r.cells[c.id] ?? []}
                                  free={valuesOf(c.datasetId, c.columnKey).filter(
                                    (n) => !t.rows.some((y) => (y.cells[c.id] ?? []).includes(n)),
                                  )}
                                  onToggle={(n, on) =>
                                    updateTable(t.id, (x) => ({
                                      ...x,
                                      rows: x.rows.map((y) => {
                                        const list = (y.cells[c.id] ?? []).filter((z) => z !== n);
                                        return { ...y, cells: { ...y.cells, [c.id]: y.id === r.id && on ? [...list, n] : list } };
                                      }),
                                    }))
                                  }
                                />
                              ))}
                              <td className={dense.tdAction}>
                                <button
                                  aria-label={`Delete ${r.name || "row"}`}
                                  className={cn(
                                    dense.iconButton,
                                    "opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100",
                                  )}
                                  onClick={() => updateTable(t.id, (x) => ({ ...x, rows: x.rows.filter((y) => y.id !== r.id) }))}
                                >
                                  <Trash size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={t.columns.length + 2} className={ts.footerCell}>
                              <button
                                className={cn(ts.footerAction, "px-2 py-1")}
                                onClick={() =>
                                  updateTable(t.id, (x) => ({ ...x, rows: [...x.rows, { id: uid(), name: "New component", cells: {} }] }))
                                }
                              >
                                <Plus size={14} /> New row
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </DesignCard>
                );
              })}
            </div>
          </>
        )}
      </AppShell>
    </RequireRole>
  );
};

export default ComponentsSettings;
