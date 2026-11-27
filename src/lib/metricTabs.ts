import type { MetricGroup } from "@/hooks/useMetricGroups";

/** Tabs with a page of their own; every other tab uses the standard metric group page. */
export const BUILT_IN_TABS = ["impact", "adoption", "documentation"] as const;

/** Built-in pages whose sub-tabs come from somewhere other than subgroups (or that have none). */
const NO_SUBGROUP_PAGES = new Set(["impact", "documentation"]);

export const isBuiltInTab = (slug: string) => (BUILT_IN_TABS as readonly string[]).includes(slug);

/** Where a tab lives on the Metrics side: /metrics/<group> or /metrics/<group>/<subgroup>. */
export const tabPath = (group: MetricGroup, all: MetricGroup[]) => {
  const parent = group.parent_id ? all.find((g) => g.id === group.parent_id) : undefined;
  return parent ? `/metrics/${parent.slug}/${group.slug}` : `/metrics/${group.slug}`;
};

/** Whether a top-level tab's page shows sub-tabs made from its subgroups. */
export const canHaveSubTabs = (slug: string) => !NO_SUBGROUP_PAGES.has(slug);

/** False when the tab's page can't show it yet (a subgroup of Impact or Documentation). */
export const tabIsShown = (group: MetricGroup, all: MetricGroup[]) => {
  const parent = group.parent_id ? all.find((g) => g.id === group.parent_id) : undefined;
  return !parent || !NO_SUBGROUP_PAGES.has(parent.slug);
};
