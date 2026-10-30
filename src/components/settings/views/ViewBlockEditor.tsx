import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CaretDown, Plus, Trash, X } from "@phosphor-icons/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DesignCard } from "@/components/ds/DesignCard";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText, DesignInputTextArea } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { BREAKDOWN_VIEW_OPTIONS, useManualMetrics, type BreakdownView, type ManualMetric } from "@/hooks/useManualMetrics";
import { useDataSourceConfigs } from "@/hooks/useDataSources";
import { useAllDatasetColumns } from "@/hooks/useManualDatasets";
import { useQualitativeSources } from "@/hooks/useQualitative";
import {
  PERIODICITY_OPTIONS,
  useSaveViewFilters,
  useSaveViewPeriodicity,
  type MetricGroup,
  type Periodicity,
} from "@/hooks/useMetricGroups";
import {
  CODE_SECTIONS,
  NUMBER_WIDGETS,
  SECTION_WIDTHS,
  itemsOf,
  useAddSection,
  useRemoveWidget,
  useReorderSections,
  useUpdateWidget,
  useViewItems,
  widgetMetrics,
  widthOf,
  type NewWidget,
  type SectionWidth,
  type ViewItem,
  type WidgetKind,
  type WidgetOptions,
} from "@/hooks/useViewItems";
import { WIDGET_LABELS } from "@/hooks/useViewLibrary";
import {
  codeAdoptionChartsOf,
  GREENHOUSE_CHART_OPTIONS,
  TEAMS_CHART_OPTIONS,
  TREND_CHART_OPTIONS,
  type CodeAdoptionCharts,
} from "../../../../server/shared/codeAdoptionCharts.ts";

/* ─────────── What a section can be ─────────── */

const CODE_CHART_OPTIONS: Record<string, { value: string; label: string }[]> = {
  trend: TREND_CHART_OPTIONS,
  teams: TEAMS_CHART_OPTIONS,
  greenhouse: GREENHOUSE_CHART_OPTIONS,
};

const TREND_OPTIONS = [
  { value: "line", label: "Line chart" },
  { value: "bar", label: "Bar chart" },
];
const TEXT_STYLES = [
  { value: "heading", label: "Heading" },
  { value: "note", label: "Note" },
];

/* ─────────── Widget settings ─────────── */

interface Draft {
  kind: WidgetKind;
  ref: string;
  section: string;
  options: WidgetOptions;
}

const draftOf = (item: ViewItem | NewWidget): Draft => ({
  kind: item.kind,
  ref: item.ref ?? "",
  section: item.section ?? "",
  options: { ...(item.options ?? {}) },
});

/** Whether the draft has what its kind needs to be drawn. */
const draftReady = (d: Draft) => {
  if (NUMBER_WIDGETS.includes(d.kind)) {
    const ids = d.options.metrics ?? (d.ref ? [d.ref] : []);
    return ids.filter(Boolean).length > 0 && (d.kind !== "breakdown" || Boolean(d.options.column));
  }
  if (d.kind === "themes") return Boolean(d.ref);
  if (d.kind === "code") return Boolean(d.ref && d.section);
  if (d.kind === "text") return Boolean(d.options.text?.trim());
  return true;
};

/** Keeps a draft's metrics and width when its kind changes, and drops the options the new kind has no use for. */
const changeKind = (d: Draft, kind: WidgetKind): Draft => {
  const { width, title } = d.options;
  const ids = d.options.metrics ?? (d.ref && NUMBER_WIDGETS.includes(d.kind) ? [d.ref] : []);
  if (NUMBER_WIDGETS.includes(kind)) {
    return {
      kind,
      ref: ids[0] ?? "",
      section: "",
      options:
        kind === "trend"
          ? { metrics: ids, width, title, chart: d.options.chart === "bar" ? "bar" : "line" }
          : kind === "breakdown"
            ? { metrics: ids, width, title, column: d.options.column, view: d.options.view ?? "table" }
            : { metrics: ids, width, title },
    };
  }
  return { kind, ref: "", section: kind === "code" ? "shares" : "", options: kind === "text" ? { style: "heading", width } : { width, title } };
};

const MetricChecklist = ({
  label = "Metrics",
  metrics,
  selected,
  inView,
  onChange,
}: {
  label?: string;
  metrics: ManualMetric[];
  selected: string[];
  /** Metrics this view already shows elsewhere. */
  inView: Set<string>;
  onChange: (ids: string[]) => void;
}) => {
  const [q, setQ] = React.useState("");
  const shown = metrics.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground">
        {label} <span className="text-muted-foreground">· {selected.length} selected</span>
      </p>
      {metrics.length > 8 && <DesignInputText placeholder="Search metrics" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="-mx-2 max-h-[320px] overflow-y-auto">
        {shown.length === 0 && <p className="text-[12px] text-muted-foreground px-2 py-1">No metrics match.</p>}
        {shown.map((m) => (
          <label key={m.id} className="flex items-center gap-3 rounded-[6px] px-2 py-1.5 cursor-pointer hover:bg-[rgba(0,119,130,0.04)]">
            <DesignCheckbox
              checked={selected.includes(m.id)}
              onCheckedChange={(next) => onChange(next ? [...selected, m.id] : selected.filter((id) => id !== m.id))}
            />
            <span className="min-w-0">
              <span className="block text-sm leading-5">{m.name}</span>
              <span className="block text-[12px] text-muted-foreground">
                {m.surface}
                {inView.has(m.id) && !selected.includes(m.id) ? " · already on this page" : ""}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

/** The section types offered when adding one, in plain words. */
const KIND_INFO: { kind: WidgetKind; description: string; demo: WidgetOptions }[] = [
  { kind: "card", description: "Key numbers side by side, each with its change since the last period.", demo: { metrics: ["", ""] } },
  { kind: "trend", description: "How one or more metrics changed over time.", demo: { metrics: ["", ""], chart: "line" } },
  { kind: "breakdown", description: "Compare metrics across groups, like role or team.", demo: { view: "bar" } },
  { kind: "distribution", description: "How many people gave each score.", demo: {} },
  { kind: "themes", description: "What people wrote in a survey, grouped into themes.", demo: {} },
  { kind: "code", description: "A part of a GitHub code adoption report.", demo: {} },
  { kind: "figma", description: "Component usage from your Figma libraries.", demo: {} },
  { kind: "text", description: "A heading or a short note between sections.", demo: { style: "heading", text: "Heading" } },
];

const TypePicker = ({ onPick }: { onPick: (kind: WidgetKind) => void }) => (
  <ul className="-mx-2 flex flex-col">
    {KIND_INFO.map(({ kind, description, demo }) => (
      <li key={kind}>
        <button
          type="button"
          onClick={() => onPick(kind)}
          className="w-full text-left flex items-center gap-3 rounded-[8px] px-2 py-2 transition-colors hover:bg-[rgba(0,119,130,0.06)]"
        >
          <span className="w-[72px] h-[40px] shrink-0 overflow-hidden pointer-events-none [&_svg]:h-[40px] [&_p]:hidden">
            <SectionPreview
              item={{ id: "", view_id: "", kind, ref: "", section: kind === "code" ? "teams" : "", hidden: false, sort_order: 0, options: demo }}
              names={(demo.metrics ?? []).map(() => "")}
              compact
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm text-foreground">{WIDGET_LABELS[kind]}</span>
            <span className="block text-[12px] text-muted-foreground leading-4">{description}</span>
          </span>
        </button>
      </li>
    ))}
  </ul>
);

/* ─────────── Previews ─────────── */


const fill = (o: number) => `rgba(0,119,130,${o})`;
const grey = "bg-[rgba(21,25,26,0.08)]";

const LinesPreview = ({ count, bars }: { count: number; bars: boolean }) => {
  const series = [
    [62, 52, 55, 40, 44, 28, 32, 18],
    [70, 66, 60, 62, 52, 50, 46, 42],
    [50, 56, 48, 50, 44, 46, 38, 40],
  ].slice(0, Math.max(1, Math.min(count, 3)));
  return (
    <svg viewBox="0 0 280 80" preserveAspectRatio="none" className="w-full h-[96px]" aria-hidden="true">
      {[20, 40, 60].map((y) => (
        <line key={y} x1="0" x2="280" y1={y} y2={y} stroke="rgba(21,25,26,0.08)" strokeWidth="1" />
      ))}
      {bars
        ? series[0].map((v, i) => <rect key={i} x={i * 35 + 6} y={v} width="22" height={80 - v} rx="2" fill={fill(0.25 + i * 0.09)} />)
        : series.map((points, s) => (
            <polyline
              key={s}
              points={points.map((v, i) => `${i * 40},${v}`).join(" ")}
              fill="none"
              stroke={fill(1 - s * 0.3)}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
    </svg>
  );
};

const RowsPreview = ({ table }: { table: boolean }) => (
  <div className="flex flex-col gap-2">
    {[100, 80, 55, 30].map((w, i) => (
      <div key={w} className="flex items-center gap-2">
        <div className={`${grey} h-3 w-14 rounded-[3px] shrink-0`} />
        {table ? (
          <>
            <div className={`${grey} h-3 flex-1 rounded-[3px]`} />
            <div className={`${grey} h-3 w-10 rounded-[3px]`} />
          </>
        ) : (
          <div className="h-3 rounded-[3px]" style={{ width: `${w}%`, background: fill(1 - i * 0.22) }} />
        )}
      </div>
    ))}
  </div>
);

const NumberTile = ({ name }: { name?: string }) => (
  <div className="min-w-0 flex-1">
    {name && <p className="text-[12px] text-muted-foreground truncate">{name}</p>}
    <div className={`${grey} mt-1 h-6 w-14 rounded-[4px]`} />
    <div className="mt-1.5 h-2 w-10 rounded-[3px]" style={{ background: fill(0.2) }} />
  </div>
);

/** Cards per row as the page draws them: the chosen number, or all in one row up to four. */
const cardsPerRow = (item: Pick<ViewItem, "options">, count: number) =>
  Math.max(1, Math.min(item.options?.columns ?? Math.min(count, 4), Math.max(count, 1)));

/** A larger placeholder of the section as drawn on the page, from its own settings. */
const SectionPreview = ({
  item,
  names,
  charts,
  compact = false,
}: {
  item: ViewItem;
  names: string[];
  charts?: CodeAdoptionCharts;
  /** Small, for the list of section types. */
  compact?: boolean;
}) => {
  switch (item.kind) {
    case "card":
      return (
        <div
          className={`grid ${compact ? "gap-1" : "gap-x-4 gap-y-3"}`}
          style={{ gridTemplateColumns: `repeat(${cardsPerRow(item, names.length)}, minmax(0, 1fr))` }}
        >
          {(names.length ? names : [""]).map((name, i) => (
            <NumberTile key={i} name={name} />
          ))}
        </div>
      );
    case "trend":
      return <LinesPreview count={names.length} bars={item.options?.chart === "bar"} />;
    case "breakdown":
      return item.options?.view === "line" ? <LinesPreview count={3} bars={false} /> : <RowsPreview table={item.options?.view !== "bar"} />;
    case "distribution":
      return (
        <div className={`flex items-end gap-1.5 ${compact ? "h-[40px]" : "h-[96px]"}`}>
          {[12, 28, 55, 90, 60, 30, 14].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: fill(0.3 + (h / 90) * 0.7) }} />
          ))}
        </div>
      );
    case "themes":
      return (
        <div className="flex flex-wrap gap-2">
          {[96, 64, 120, 80, 56].map((w, i) => (
            <div key={i} className="h-7 rounded-full border border-border" style={{ width: w, background: i < 2 ? fill(0.08) : "rgba(21,25,26,0.04)" }} />
          ))}
        </div>
      );
    case "text":
      return item.options?.style === "note" ? (
        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{item.options?.text || "Empty note"}</p>
      ) : (
        <p className="text-[18px] font-[580] leading-6 line-clamp-2">{item.options?.text || "Empty heading"}</p>
      );
    case "figma":
      return (
        <div className="flex gap-4">
          <NumberTile />
          <NumberTile />
          <NumberTile />
        </div>
      );
    case "code": {
      const chart = charts?.[item.section as keyof CodeAdoptionCharts];
      if (item.section === "shares") {
        return (
          <div className="flex gap-4">
            <NumberTile name="Bloom" />
            <NumberTile name="Greenhouse" />
            <NumberTile name="Native" />
          </div>
        );
      }
      if (item.section === "trend") return <LinesPreview count={chart === "line" ? 3 : 1} bars={chart === "stacked_bar"} />;
      if (item.section === "teams" && chart !== "table") {
        return (
          <div className="flex flex-col gap-2">
            {[[60, 25], [45, 35], [30, 40]].map(([a, b], i) => (
              <div key={i} className="flex h-3 rounded-[3px] overflow-hidden">
                <div style={{ width: `${a}%`, background: fill(1) }} />
                <div style={{ width: `${b}%`, background: fill(0.45) }} />
                <div className={`flex-1 ${grey}`} />
              </div>
            ))}
          </div>
        );
      }
      return <RowsPreview table={!(item.section === "greenhouse" && chart === "bar")} />;
    }
  }
};

const WIDTH_SHORT: Record<SectionWidth, string> = { full: "Full", wide: "2/3", half: "1/2", narrow: "1/3" };

/* ─────────── Section settings (the right panel) ─────────── */

/** A row of mutually exclusive options. */
const Segmented = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; title?: string }[];
  onChange: (value: string) => void;
}) => (
  <div className="flex rounded-[8px] border border-border p-0.5" role="radiogroup" aria-label={label}>
    {options.map((o) => {
      const on = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={on}
          title={o.title}
          className={`h-8 flex-1 rounded-[6px] text-sm transition-colors ${
            on ? "bg-[rgba(0,119,130,0.1)] text-primary font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

/** Everything about one section, saved as it changes. */
const SectionForm = ({
  draft,
  onChange,
  inView,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  inView: Set<string>;
}) => {
  const metrics = useManualMetrics();
  const columns = useAllDatasetColumns();
  const qualitative = useQualitativeSources();
  const configs = useDataSourceConfigs();
  const navigate = useNavigate();

  const live = (metrics.data ?? []).filter((m) => !m.archived);
  const isRating = (m: ManualMetric) =>
    (columns.data ?? []).some((c) => c.dataset_id === m.dataset_id && c.key === m.value_column && c.kind === "rating");
  const ids = draft.options.metrics ?? (draft.ref ? [draft.ref] : []);
  const setMetrics = (next: string[]) => onChange({ ...draft, ref: next[0] ?? "", options: { ...draft.options, metrics: next } });
  const setOption = (patch: WidgetOptions) => onChange({ ...draft, options: { ...draft.options, ...patch } });

  // Groups a breakdown can split by: the text columns of the numbers' datasets, by key.
  const breakdownColumns = React.useMemo(() => {
    const datasets = new Set(live.map((m) => m.dataset_id));
    const seen = new Map<string, string>();
    (columns.data ?? []).filter((c) => datasets.has(c.dataset_id) && c.kind === "text").forEach((c) => seen.set(c.key, c.label));
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [columns.data, live]);
  const groupLabel = breakdownColumns.find((c) => c.value === draft.options.column)?.label.toLowerCase();
  const hasColumn = (m: ManualMetric) =>
    (columns.data ?? []).some((c) => c.dataset_id === m.dataset_id && c.key === draft.options.column);

  const reports = (((configs.data ?? []).find((c) => c.source_key === "code_adoption")?.config?.reports ?? []) as { path?: string }[])
    .filter((r) => r.path)
    .map((r) => ({ value: r.path!, label: r.path! }));

  return (
    <div className="flex flex-col gap-5">
      <DesignInputSelect
        label="Shows"
        value={draft.kind}
        options={KIND_INFO.map((k) => ({ value: k.kind, label: WIDGET_LABELS[k.kind] }))}
        helperText={KIND_INFO.find((k) => k.kind === draft.kind)?.description}
        onChange={(kind) => onChange(changeKind(draft, kind as WidgetKind))}
      />

      {draft.kind === "breakdown" && (
        <DesignInputSelect
          label="Split by"
          placeholder={breakdownColumns.length ? "Choose a group, like role or team" : "No dataset has groups to split by"}
          disabled={breakdownColumns.length === 0}
          value={draft.options.column ?? ""}
          options={breakdownColumns}
          onChange={(column) => setOption({ column })}
        />
      )}
      {draft.kind === "breakdown" && draft.options.column && (
        <DesignInputSelect
          label="Show as"
          value={draft.options.view ?? "table"}
          options={BREAKDOWN_VIEW_OPTIONS.filter((o) => o.value !== "none")}
          onChange={(view) => setOption({ view: view as BreakdownView })}
        />
      )}
      {draft.kind === "trend" && (
        <DesignInputSelect label="Show as" value={draft.options.chart ?? "line"} options={TREND_OPTIONS} onChange={(chart) => setOption({ chart })} />
      )}

      {draft.kind === "breakdown"
        ? draft.options.column && (
            <MetricChecklist
              label={`Compare by ${groupLabel ?? "group"}`}
              metrics={live.filter(hasColumn)}
              selected={ids}
              inView={inView}
              onChange={setMetrics}
            />
          )
        : NUMBER_WIDGETS.includes(draft.kind) && (
            <MetricChecklist
              label={draft.kind === "distribution" ? "Scores" : "Metrics"}
              metrics={draft.kind === "distribution" ? live.filter(isRating) : live}
              selected={ids}
              inView={inView}
              onChange={setMetrics}
            />
          )}

      {draft.kind === "themes" &&
        ((qualitative.data ?? []).length > 0 ? (
          <DesignInputSelect
            label="Qualitative metric"
            placeholder="Choose a qualitative metric"
            value={draft.ref}
            options={(qualitative.data ?? []).map((q) => ({ value: q.id, label: `${q.name} · ${q.group_name}` }))}
            onChange={(ref) => onChange({ ...draft, ref })}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground">Qualitative metric</p>
            <p className="text-[12px] text-muted-foreground">
              No qualitative metrics are set up yet. Create one from a survey dataset's text column, then pick it here.
            </p>
            <div>
              <DesignButton variant="outlined" theme="primary" icon={<Plus size={16} />} onClick={() => navigate("/settings/metrics?new=insight")}>
                New qualitative metric
              </DesignButton>
            </div>
          </div>
        ))}

      {draft.kind === "code" && (
        <>
          <DesignInputSelect
            label="Report"
            placeholder={reports.length ? "Choose a report" : "No GitHub reports set up"}
            disabled={reports.length === 0}
            value={draft.ref}
            options={reports}
            onChange={(ref) => onChange({ ...draft, ref })}
          />
          <DesignInputSelect
            label="Part"
            value={draft.section}
            options={CODE_SECTIONS.map((s) => ({ value: s.value, label: s.label }))}
            onChange={(section) => onChange({ ...draft, section, options: { width: draft.options.width } })}
          />
          {CODE_CHART_OPTIONS[draft.section] && (
            <DesignInputSelect
              label="Show as"
              placeholder="As set for the report"
              value={draft.options.chart ?? ""}
              options={CODE_CHART_OPTIONS[draft.section].filter((o) => o.value !== "hidden")}
              onChange={(chart) => setOption({ chart })}
            />
          )}
        </>
      )}

      {draft.kind === "text" && (
        <>
          <DesignInputSelect
            label="Style"
            value={draft.options.style ?? "heading"}
            options={TEXT_STYLES}
            onChange={(style) => setOption({ style: style as WidgetOptions["style"] })}
          />
          <DesignInputTextArea label="Text" rows={4} value={draft.options.text ?? ""} onChange={(e) => setOption({ text: e.target.value })} />
        </>
      )}

      {draft.kind === "card" && ids.length > 1 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">Numbers per row</p>
          <Segmented
            label="Numbers per row"
            value={String(draft.options.columns ?? 0)}
            options={[{ value: "0", label: "Auto" }, ...[1, 2, 3, 4, 5, 6].filter((n) => n <= ids.length).map((n) => ({ value: String(n), label: String(n) }))]}
            onChange={(v) => setOption({ columns: Number(v) || undefined })}
          />
          <p className="text-[12px] text-muted-foreground">
            {(() => {
              const perRow = cardsPerRow(draft, ids.length);
              const rows = Math.ceil(ids.length / perRow);
              return `${ids.length} numbers in ${rows} row${rows === 1 ? "" : "s"} of ${perRow}${draft.options.columns ? "" : " (automatic)"}. Smaller screens stack them.`;
            })()}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-sm text-foreground">Width</p>
        <Segmented
          label="Width"
          value={draft.options.width ?? "full"}
          options={SECTION_WIDTHS.map((w) => ({ value: w.value, label: WIDTH_SHORT[w.value], title: w.label }))}
          onChange={(width) => setOption({ width: width as SectionWidth })}
        />
        <p className="text-[12px] text-muted-foreground">Narrower sections sit side by side.</p>
      </div>
    </div>
  );
};

/** The selected section's settings; changes save shortly after you make them. */
const SectionInspector = ({
  item,
  defaultTitle,
  inView,
  onSave,
  onRemove,
  onClose,
}: {
  item: ViewItem;
  /** The title it gets when none is typed. */
  defaultTitle: string;
  inView: Set<string>;
  onSave: (fields: Partial<Pick<ViewItem, "kind" | "ref" | "section" | "options" | "hidden">>) => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const [draft, setDraft] = React.useState(() => draftOf(item));
  const pending = React.useRef<Draft | null>(null);
  const timer = React.useRef<number>();
  const save = React.useRef(onSave);
  save.current = onSave;
  const flush = React.useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current) {
      const { kind, ref, section, options } = pending.current;
      save.current({ kind, ref, section, options });
      pending.current = null;
    }
  }, []);
  // Leaving the section (or the page) saves what's left.
  React.useEffect(() => flush, [flush]);
  const change = (next: Draft) => {
    setDraft(next);
    pending.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  };

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onClose} className="self-start flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft size={14} />
        All sections
      </button>
      {draft.kind !== "text" && (
        <DesignInputText
          label="Title"
          placeholder={defaultTitle}
          helperText="Shown above it on the page. Leave empty to use the suggested one."
          value={draft.options.title ?? ""}
          onChange={(e) => change({ ...draft, options: { ...draft.options, title: e.target.value || undefined } })}
        />
      )}
      <SectionForm draft={draft} onChange={change} inView={inView} />
      <label className="flex items-center gap-3 cursor-pointer">
        <DesignCheckbox checked={item.hidden} onCheckedChange={(hidden) => save.current({ hidden: Boolean(hidden) })} />
        <span className="text-sm">Hide on the page for now</span>
      </label>
      <div>
        <DesignButton variant="flat" theme="error" icon={<Trash size={16} />} onClick={onRemove}>
          Remove section
        </DesignButton>
      </div>
    </div>
  );
};

/* ─────────── Sections on the page ─────────── */

const SectionCard = ({
  item,
  title,
  names,
  charts,
  ready,
  selected,
  onSelect,
  onWidth,
}: {
  item: ViewItem;
  title: string;
  /** The metric names it shows, for the preview. */
  names: string[];
  charts?: CodeAdoptionCharts;
  /** It has what it needs to be drawn. */
  ready: boolean;
  selected: boolean;
  onSelect: () => void;
  onWidth: (width: SectionWidth) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const width = widthOf(item);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = React.useState<SectionWidth | null>(null);
  const shown = preview ? SECTION_WIDTHS.find((w) => w.value === preview)! : width;

  // Dragging the right edge snaps to the nearest width.
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const card = ref.current;
    const grid = card?.parentElement;
    if (!card || !grid) return;
    const left = card.getBoundingClientRect().left;
    const sixth = grid.getBoundingClientRect().width / 6;
    let next: SectionWidth = width.value;
    const move = (ev: PointerEvent) => {
      const span = (ev.clientX - left) / sixth;
      next = SECTION_WIDTHS.reduce((best, w) => (Math.abs(w.span - span) < Math.abs(best.span - span) ? w : best)).value;
      setPreview(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setPreview(null);
      if (next !== width.value) onWidth(next);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        ref.current = node;
      }}
      style={
        {
          transform: CSS.Translate.toString(transform),
          transition,
          zIndex: isDragging || selected ? 2 : undefined,
          "--span": shown.span,
        } as React.CSSProperties
      }
      data-section-id={item.id}
      className="col-span-6 md:[grid-column:span_var(--span)/span_var(--span)] min-w-0 relative scroll-mt-4"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`${title}. Click to edit, drag to move.`}
        aria-pressed={selected}
        className={`h-full rounded-[12px] border bg-background p-4 flex flex-col gap-3 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isDragging
            ? "shadow-md border-primary cursor-grabbing"
            : selected
              ? "border-primary ring-1 ring-primary"
              : "border-design-card-border hover:border-[rgba(21,25,26,0.24)]"
        } ${item.hidden ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-1" title={title}>
              {title}
            </p>
            {/* Which metrics a chart shows (number cards name them in their tiles). */}
            {item.kind !== "card" && names.length > 0 && (
              <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5" title={names.join(", ")}>
                {names.join(", ")}
              </p>
            )}
          </div>
          {/* The type, unless the title already says it. */}
          {(item.hidden || WIDGET_LABELS[item.kind] !== title) && (
            <span className="shrink-0 text-[12px] text-muted-foreground">
              {[item.hidden && "Hidden", WIDGET_LABELS[item.kind] !== title && WIDGET_LABELS[item.kind]].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {ready ? (
          <SectionPreview item={item} names={names} charts={charts} />
        ) : (
          <p className="text-[12px] text-[var(--warning,#B4690E)]">Not on the page yet: choose what it shows in the panel on the right.</p>
        )}
      </div>
      {selected && !isDragging && (
        <div
          role="separator"
          aria-label="Drag to resize"
          title="Drag to resize"
          className="absolute right-[-3px] top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-full bg-primary cursor-ew-resize z-10"
          onPointerDown={startResize}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
};

/* ─────────── Page filters ─────────── */

/** "Quarterly periods", "6-month periods". */
const periodLabel = (value: Periodicity) =>
  value === "semiannual" ? "6-month periods" : `${PERIODICITY_OPTIONS.find((o) => o.value === value)?.label ?? "Quarterly"} periods`;

const PageFilters = ({
  view,
  parent,
  metricIds,
}: {
  view: MetricGroup;
  /** A sub-view's parent, whose benchmark frequency it uses. */
  parent?: MetricGroup;
  metricIds: string[];
}) => {
  const { toast } = useToast();
  const metrics = useManualMetrics();
  const columns = useAllDatasetColumns();
  const save = useSaveViewFilters();
  const savePeriodicity = useSaveViewPeriodicity();
  const periodView = parent ?? view;
  const datasets = new Set((metrics.data ?? []).filter((m) => metricIds.includes(m.id)).map((m) => m.dataset_id));
  const saved = view.filters ?? [];
  // Columns of the shown numbers' datasets that group people (not scores, dates or emails).
  const offered = [
    ...new Set((columns.data ?? []).filter((c) => datasets.has(c.dataset_id) && c.kind === "text").map((c) => c.label)),
  ]
    .filter((label) => !saved.includes(label))
    .sort((a, b) => a.localeCompare(b));
  const fail = (title: string) => (err: unknown) =>
    toast({ title, description: (err as Error).message, variant: "destructive" });
  const setFilters = (filters: string[]) => save.mutateAsync({ id: view.id, filters }).catch(fail("Could not save the filters"));
  const chip =
    "inline-flex h-9 items-center gap-1 rounded-[6px] border border-border px-3 text-sm text-foreground";
  return (
    <section className="mt-5">
      <h3 className="text-[14px] font-medium text-foreground">Page filters</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={parent ? `Benchmark frequency, shared with ${parent.name}` : "Benchmark frequency"}
              className={`${chip} hover:bg-[rgba(21,25,26,0.04)]`}
            >
              {periodLabel(periodView.periodicity ?? "quarterly")}
              <CaretDown size={14} className="ml-1 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            {PERIODICITY_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onSelect={() =>
                  savePeriodicity
                    .mutateAsync({ id: periodView.id, periodicity: o.value })
                    .catch(fail("Could not save the frequency"))
                }
              >
                {periodLabel(o.value)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {saved.map((label) => (
          <span key={label} className={chip}>
            {label}
            <button
              type="button"
              aria-label={`Remove the ${label} filter`}
              className="-mr-1 flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-[rgba(21,25,26,0.06)]"
              onClick={() => setFilters(saved.filter((l) => l !== label))}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {offered.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <DesignButton variant="flat" theme="primary" icon={<Plus size={16} />}>
                Add filter
              </DesignButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {offered.map((label) => (
                <DropdownMenuItem key={label} onSelect={() => setFilters([...saved, label])}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </section>
  );
};


/* ─────────── Editor ─────────── */

/**
 * A view's page as you'd see it: its sections at their widths. Click one to edit it in the
 * panel on the right, drag to reorder; with nothing selected, the panel adds sections.
 */
export const ViewBlockEditor = ({
  view,
  parent,
  header,
  list,
}: {
  view: MetricGroup;
  /** A sub-view's parent view. */
  parent?: MetricGroup;
  header: React.ReactNode;
  /** The views tree, the layout's list column. */
  list: React.ReactNode;
}) => {
  const { toast } = useToast();
  const viewItems = useViewItems();
  const metrics = useManualMetrics();
  const qualitative = useQualitativeSources();
  const configs = useDataSourceConfigs();
  const columns = useAllDatasetColumns();
  const addSection = useAddSection();
  const reorder = useReorderSections();
  const updateWidget = useUpdateWidget();
  const removeWidget = useRemoveWidget();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Bumped to open the right panel when it's collapsed.
  const [reveal, setReveal] = React.useState(0);
  const select = (id: string | null) => {
    setSelectedId(id);
    setReveal((n) => n + 1);
  };

  const saved = itemsOf(viewItems.data, view.id);
  // Shown in the new order straight away, back if saving fails.
  const [order, setOrder] = React.useState<string[]>([]);
  const signature = saved.map((i) => i.id).join("|");
  React.useEffect(() => setOrder(signature ? signature.split("|") : []), [signature]);
  const items = order.map((id) => saved.find((i) => i.id === id)).filter((i): i is ViewItem => Boolean(i));
  const selected = items.find((i) => i.id === selectedId);
  // A section added at the bottom (or selected off-screen) scrolls into view.
  React.useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-section-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, signature]);

  const reports = ((configs.data ?? []).find((c) => c.source_key === "code_adoption")?.config?.reports ?? []) as {
    path?: string;
    charts?: unknown;
  }[];
  const chartsFor = (item: ViewItem): CodeAdoptionCharts => ({
    ...codeAdoptionChartsOf(reports.find((r) => r.path === item.ref)?.charts),
    ...(item.options?.chart && item.section !== "shares" ? { [item.section]: item.options.chart } : {}),
  });
  const metricName = (id: string) => (metrics.data ?? []).find((m) => m.id === id)?.name ?? "Metric no longer set up";
  const titleOf = (item: ViewItem) => item.options?.title?.trim() || defaultTitle(item);
  const defaultTitle = (item: ViewItem) => {
    // Named as on the page; the metric names show in the preview.
    if (item.kind === "card") {
      const names = widgetMetrics(item).map(metricName);
      return names.length === 1 ? names[0] : "Overview";
    }
    if (item.kind === "trend") return "Evolution over time";
    if (item.kind === "distribution") return "How people answered";
    if (item.kind === "breakdown") {
      const column = item.options?.column;
      const label = (columns.data ?? []).find((c) => c.key === column)?.label ?? column?.replace(/_/g, " ");
      const names = widgetMetrics(item).map(metricName);
      const what = names.length === 1 ? names[0] : names.length === 2 ? names.join(" and ") : `${names.length} metrics`;
      return label ? `${what} by ${label.toLowerCase()}` : "New breakdown";
    }
    if (item.kind === "themes") return (qualitative.data ?? []).find((s) => s.id === item.ref)?.name ?? "Answer themes";
    if (item.kind === "code") {
      const part = CODE_SECTIONS.find((s) => s.value === item.section)?.label ?? item.section;
      return item.ref ? `${part} · ${item.ref.split("/").slice(-2, -1)[0] ?? item.ref}` : part;
    }
    if (item.kind === "text") return item.options?.text?.trim() || "Text";
    return "Figma component analytics";
  };
  const inView = new Set(items.flatMap(widgetMetrics));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fail = (title: string) => (err: unknown) =>
    toast({ title, description: err instanceof Error ? err.message : String(err), variant: "destructive" });

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    const previous = order;
    setOrder(next);
    try {
      await reorder.mutateAsync(next);
    } catch (err) {
      setOrder(previous);
      fail("Could not reorder")(err);
    }
  };

  /** A new section of this kind at the bottom, selected so it can be set up right away. */
  const add = async (kind: WidgetKind) => {
    try {
      const base = draftOf({ kind: "card", options: { metrics: [], width: "full" } });
      const created = await addSection.mutateAsync({ viewId: view.id, widget: changeKind(base, kind), order });
      if (created) select(created.id);
    } catch (err) {
      fail("Could not add the section")(err);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SettingsLayout
        list={list}
        reveal={reveal}
        hideContextButton
        main={
          <DesignCard className="p-4 min-w-0" onClick={() => setSelectedId(null)}>
            {header}
            <PageFilters view={view} parent={parent} metricIds={[...inView]} />
            {viewItems.isLoading ? (
              <DesignLoader />
            ) : (
              <div className="mt-5 grid grid-cols-6 gap-3">
                <SortableContext items={order} strategy={rectSortingStrategy}>
                  {items.map((item) => (
                    <SectionCard
                      key={item.id}
                      item={item}
                      title={titleOf(item)}
                      names={widgetMetrics(item).map(metricName)}
                      charts={item.kind === "code" ? chartsFor(item) : undefined}
                      ready={draftReady(draftOf(item))}
                      selected={selectedId === item.id}
                      onSelect={() => select(item.id)}
                      onWidth={(width) =>
                        updateWidget.mutateAsync({ id: item.id, options: { ...item.options, width } }).catch(fail("Could not change the width"))
                      }
                    />
                  ))}
                </SortableContext>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(null);
                  }}
                  className={`col-span-6 flex min-h-[64px] items-center justify-center gap-2 rounded-[12px] border border-dashed text-sm transition-colors ${
                    selectedId === null
                      ? "border-primary text-primary"
                      : "border-[rgba(21,25,26,0.24)] text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <Plus size={16} />
                  Add section
                </button>
              </div>
            )}
          </DesignCard>
        }
        context={
          selected
            ? {
                title: titleOf(selected),
                content: (
                  <SectionInspector
                    key={selected.id}
                    item={selected}
                    defaultTitle={defaultTitle(selected)}
                    inView={inView}
                    onSave={(fields) => updateWidget.mutateAsync({ id: selected.id, ...fields }).catch(fail("Could not save the section"))}
                    onRemove={() => {
                      setSelectedId(null);
                      removeWidget.mutateAsync(selected.id).catch(fail("Could not remove it"));
                    }}
                    onClose={() => setSelectedId(null)}
                  />
                ),
              }
            : {
                title: "Add a section",
                subtitle: "Pick what it shows; it's added at the bottom. Click any section on the page to edit it.",
                content: <TypePicker onPick={add} />,
              }
        }
      />
    </DndContext>
  );
};
