import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reorderRows } from "@/hooks/useMetricGroups";
import type { BreakdownView } from "@/hooks/useManualMetrics";

/**
 * The layout of each Metrics view (Metrics → Views): a list of sections top to bottom. A section
 * shows one metric (or a few) one way, at a width; narrower sections sit side by side. Metrics
 * are defined once in Metrics → All metrics and can be shown in any number of sections and views.
 */
export type WidgetKind = "card" | "trend" | "breakdown" | "distribution" | "themes" | "code" | "figma" | "text";
/** Widgets that show numbers (manual metrics). */
export const NUMBER_WIDGETS: WidgetKind[] = ["card", "trend", "breakdown", "distribution"];

/** The parts of a GitHub code report that can be shown on their own. */
export const CODE_SECTIONS = [
  { value: "shares", label: "Bloom share cards" },
  { value: "trend", label: "Evolution over time" },
  { value: "teams", label: "Adoption by team" },
  { value: "greenhouse", label: "Greenhouse components" },
] as const;
export type CodeSection = (typeof CODE_SECTIONS)[number]["value"];

/** How wide a section is, in sixths of the page; narrower sections sit side by side. */
export const SECTION_WIDTHS = [
  { value: "full", label: "Full width", span: 6 },
  { value: "wide", label: "Wide (two thirds)", span: 4 },
  { value: "half", label: "Half", span: 3 },
  { value: "narrow", label: "Narrow (one third)", span: 2 },
] as const;
export type SectionWidth = (typeof SECTION_WIDTHS)[number]["value"];
export const widthOf = (item: Pick<ViewItem, "options">) =>
  SECTION_WIDTHS.find((w) => w.value === item.options?.width) ?? SECTION_WIDTHS[0];

/** How a widget is drawn. Which keys apply depends on its kind. */
export interface WidgetOptions {
  /** trend, breakdown, distribution: the metrics shown together (the first is `ref`). */
  metrics?: string[];
  /** The section's own title, over the chart's default heading. */
  title?: string;
  /** card: cards per row (automatic when left out). */
  columns?: number;
  /** trend: line | bar; code: the chart type of that part. */
  chart?: string;
  /** breakdown: the dataset column it breaks down by, and how. */
  column?: string;
  view?: BreakdownView;
  /** text */
  text?: string;
  style?: "heading" | "note";
  width?: SectionWidth;
}

export interface ViewItem {
  id: string;
  view_id: string;
  kind: WidgetKind;
  /** manual_metrics.id, qualitative_sources.id or a code report's path; empty for Figma and text. */
  ref: string;
  /** code: which part of the report. */
  section: string;
  hidden: boolean;
  sort_order: number;
  options?: WidgetOptions | null;
}

/** The metrics a number widget shows. */
export const widgetMetrics = (item: Pick<ViewItem, "kind" | "ref" | "options">) =>
  NUMBER_WIDGETS.includes(item.kind) ? (item.options?.metrics?.length ? item.options.metrics : item.ref ? [item.ref] : []) : [];

const ITEMS = ["view-items"];

export const useViewItems = () =>
  useQuery<ViewItem[]>({
    queryKey: ITEMS,
    queryFn: async () => {
      const { data, error } = await supabase.from("view_items").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ViewItem[];
    },
  });

/** A view's sections, top to bottom. */
export const itemsOf = (items: ViewItem[] | undefined, viewId: string | undefined) =>
  (items ?? []).filter((i) => i.view_id === viewId).sort((a, b) => a.sort_order - b.sort_order);

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ITEMS });
};

const check = ({ error }: { error: { message: string } | null }) => {
  if (error) throw new Error(error.message);
};

export type NewWidget = Pick<ViewItem, "kind"> & Partial<Pick<ViewItem, "ref" | "section" | "options">>;

/** Adds a section at `index` among `order` (the view's section ids, top to bottom), or at the bottom. */
export const useAddSection = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ viewId, widget, index, order }: { viewId: string; widget: NewWidget; index?: number; order: string[] }) => {
      const { data, error } = await supabase
        .from("view_items")
        .insert({
          view_id: viewId,
          kind: widget.kind,
          ref: widget.ref ?? "",
          section: widget.section ?? "",
          options: widget.options ?? {},
          sort_order: order.length,
        } as never)
        .select("*");
      if (error) throw new Error(error.message);
      const created = (data as unknown as ViewItem[])[0];
      if (created && index !== undefined && index < order.length) {
        const ids = [...order];
        ids.splice(index, 0, created.id);
        await reorderRows("view_items", ids);
      }
      return created;
    },
    onSuccess: invalidate,
  });
};

export const useUpdateWidget = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<ViewItem, "kind" | "ref" | "section" | "options" | "hidden">>) => {
      check(await supabase.from("view_items").update(fields as never).eq("id", id));
    },
    onSuccess: invalidate,
  });
};

export const useReorderSections = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (ids: string[]) => reorderRows("view_items", ids), onSuccess: invalidate });
};

export const useRemoveWidget = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      check(await supabase.from("view_items").delete().eq("id", id));
    },
    onSuccess: invalidate,
  });
};

/** Takes a deleted metric (or question) out of every widget that shows it. */
export const removePlacements = async (kind: "number" | "qualitative", ref: string) => {
  const { data, error } = await supabase.from("view_items").select("*");
  if (error) throw new Error(error.message);
  for (const item of (data ?? []) as unknown as ViewItem[]) {
    if (kind === "qualitative") {
      if (item.kind === "themes" && item.ref === ref) check(await supabase.from("view_items").delete().eq("id", item.id));
      continue;
    }
    const shown = widgetMetrics(item);
    if (!shown.includes(ref)) continue;
    const rest = shown.filter((id) => id !== ref);
    if (rest.length === 0) check(await supabase.from("view_items").delete().eq("id", item.id));
    else {
      check(
        await supabase
          .from("view_items")
          .update({ ref: rest[0], options: { ...item.options, metrics: rest } } as never)
          .eq("id", item.id),
      );
    }
  }
};
