import { tableStyles as ts } from "@/components/ds/tableStyles";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Cube, MagnifyingGlass, Plus, Trash, X } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
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

/** Small + icon button that opens a searchable list of names to add. */
const AddNamePicker = ({ options, onPick }: { options: string[]; onPick: (v: string) => void }) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const list = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          aria-label="Add name"
          disabled={options.length === 0}
          className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[6px] border border-border text-primary hover:bg-foreground/[0.06] disabled:opacity-[0.48] disabled:pointer-events-none"
        >
          <Plus size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-[8px]">
        <DesignInputBar autoFocus placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-[8px] max-h-[240px] overflow-y-auto">
          {list.length === 0 ? (
            <p className="px-[8px] py-[8px] text-[14px] text-muted-foreground">No names left</p>
          ) : (
            list.map((o) => (
              <button
                key={o}
                className="block w-full truncate rounded-[6px] px-[8px] py-[8px] text-left text-[14px] text-foreground hover:bg-foreground/[0.06]"
                onClick={() => { onPick(o); setOpen(false); setQ(""); }}
              >
                {o}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
const uid = () => Math.random().toString(36).slice(2, 10);

/** Text input that saves on blur / Enter instead of every keystroke. */
const BlurInput = ({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) => {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <DesignInputText
      size="small"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
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

  const addColumnOptions = columns
    .filter((c) => ids.includes(c.dataset_id))
    .map((c) => ({ value: `${c.dataset_id}::${c.key}`, label: `${datasetName(c.dataset_id)} · ${c.label}` }))
    .concat(libraries.map((l) => ({ value: `figma:${l.key}::component`, label: `Figma · ${l.name}` })));

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
                <p className="text-[14px] text-muted-foreground">Loading component names from Figma — the Figma column will fill in shortly.</p>
                <DesignSpacer size="small" />
              </>
            )}
            <div className="flex items-center justify-between gap-[12px]">
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
            <div className="flex flex-col gap-[24px]">
              {tables.map((t) => {
                const visible = q
                  ? t.rows.filter((r) => [r.name, ...Object.values(r.cells).flat()].some((n) => n.toLowerCase().includes(q)))
                  : t.rows;
                const usedCols = new Set(t.columns.map((c) => `${c.datasetId}::${c.columnKey}`));
                return (
                  <DesignCard key={t.id} className="p-0">
                    <div className="flex items-center gap-[12px] px-5 py-3 border-b border-border">
                      <div className="max-w-[280px] flex-1">
                        <BlurInput value={t.name} onSave={(name) => updateTable(t.id, (x) => ({ ...x, name }))} />
                      </div>
                      <div className="ml-auto flex items-center gap-[8px]">
                        <div className="w-[260px]">
                          <DesignInputSelect
                            size="small"
                            placeholder="Add column"
                            value=""
                            options={addColumnOptions.filter((o) => !usedCols.has(o.value))}
                            onChange={(v) => {
                              const [datasetId, columnKey] = v.split("::");
                              updateTable(t.id, (x) => autoMatch({ ...x, columns: [...x.columns, { id: uid(), datasetId, columnKey }] }));
                            }}
                          />
                        </div>
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
                    <div className="max-h-[calc(100vh-240px)] overflow-auto">
                      <table className={ts.table}>
                        <thead>
                          <tr className={ts.headRow}>
                            <th className={`${ts.th} sticky left-0 top-0 z-20 bg-background min-w-[200px] shadow-[inset_0_-1px_0_var(--border)]`}>Component</th>
                            {t.columns.map((c) => (
                              <th key={c.id} className={`${ts.th} sticky top-0 z-10 bg-background min-w-[200px] shadow-[inset_0_-1px_0_var(--border)]`}>
                                <div className="flex items-center gap-[4px]">
                                  <span className="truncate">
                                    {datasetName(c.datasetId)}
                                    {!c.datasetId.startsWith("figma:") && !/component/i.test(c.columnKey) && ` · ${columnLabel(c.datasetId, c.columnKey)}`}
                                  </span>
                                  <button
                                    aria-label="Remove column"
                                    className="rounded-[6px] p-[4px] hover:bg-foreground/[0.06]"
                                    onClick={() =>
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
                                    <X size={14} />
                                  </button>
                                </div>
                              </th>
                            ))}
                            <th className={`${ts.th} sticky top-0 z-10 w-[56px] bg-background shadow-[inset_0_-1px_0_var(--border)]`} />
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((r) => (
                            <tr key={r.id} className="group border-b border-border last:border-b-0">
                              <td className={`${ts.td} sticky left-0 z-10 bg-background align-middle`}>
                                <BlurInput
                                  value={r.name}
                                  placeholder="Component name"
                                  onSave={(name) =>
                                    updateTable(t.id, (x) => ({ ...x, rows: x.rows.map((y) => (y.id === r.id ? { ...y, name } : y)) }))
                                  }
                                />
                              </td>
                              {t.columns.map((c) => (
                                <td key={c.id} className={`${ts.td} align-middle`}>
                                  <div className="flex flex-wrap items-center gap-[4px]">
                                    {(r.cells[c.id] ?? []).length > 0 && (
                                      <>
                                        {(r.cells[c.id] ?? []).map((n) => (
                                          <span
                                            key={n}
                                            className="inline-flex items-center gap-[4px] rounded-[6px] bg-spacing-bg px-[8px] py-[4px] text-[12px] text-foreground"
                                          >
                                            {n}
                                            <button
                                              aria-label={`Remove ${n}`}
                                              className="rounded-[4px] text-muted-foreground hover:text-destructive"
                                              onClick={() =>
                                                updateTable(t.id, (x) => ({
                                                  ...x,
                                                  rows: x.rows.map((y) =>
                                                    y.id === r.id
                                                      ? { ...y, cells: { ...y.cells, [c.id]: (y.cells[c.id] ?? []).filter((z) => z !== n) } }
                                                      : y,
                                                  ),
                                                }))
                                              }
                                            >
                                              <X size={12} />
                                            </button>
                                          </span>
                                        ))}
                                      </>
                                    )}
                                    <AddNamePicker
                                      onPick={(v) =>
                                        updateTable(t.id, (x) => ({
                                          ...x,
                                          rows: x.rows.map((y) =>
                                            y.id === r.id
                                              ? { ...y, cells: { ...y.cells, [c.id]: [...(y.cells[c.id] ?? []), v] } }
                                              : { ...y, cells: { ...y.cells, [c.id]: (y.cells[c.id] ?? []).filter((z) => z !== v) } },
                                          ),
                                        }))
                                      }
                                      options={valuesOf(c.datasetId, c.columnKey).filter(
                                        (n) => !t.rows.some((y) => (y.cells[c.id] ?? []).includes(n)),
                                      )}
                                    />
                                  </div>
                                </td>
                              ))}
                              <td className={`${ts.td} px-2 align-middle`}>
                                <button
                                  aria-label="Delete row"
                                  className="rounded-[6px] p-[6px] text-muted-foreground hover:bg-foreground/[0.06] hover:text-destructive"
                                  onClick={() => updateTable(t.id, (x) => ({ ...x, rows: x.rows.filter((y) => y.id !== r.id) }))}
                                >
                                  <Trash size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3">
                      <DesignButton
                        size="small"
                        variant="flat"
                        theme="primary"
                        icon={<Plus size={16} />}
                        onClick={() =>
                          updateTable(t.id, (x) => ({ ...x, rows: [...x.rows, { id: uid(), name: "New component", cells: {} }] }))
                        }
                      >
                        Add row
                      </DesignButton>
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
