/**
 * Team name → business unit (GetDX level-3 group), shared by the app and the server.
 *
 * Each dataset team is matched by name to a GetDX team, then walked up the tree
 * to its level-3 ancestor. Manual overrides win over the GetDX match. No imports,
 * so both the browser bundle and the Node server can use it.
 */

/** Team name → business unit name. */
export type TeamBusinessUnitMap = Record<string, string>;

export type DxTeam = { id: string; name: string; parentId: string | null; isParent: boolean; contributors: number };
export type DxHistoric = { name: string; path: string[] };

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** GetDX level that counts as a business unit / group (1 = top of the tree). */
const UNIT_LEVEL = 3;

export function matchTeamBusinessUnits(input: {
  teams: DxTeam[];
  historic: DxHistoric[];
  /** Team names found in the datasets. */
  known: string[];
  overrides: TeamBusinessUnitMap;
}): TeamBusinessUnitMap {
  const { teams, historic, known, overrides } = input;
  const byId = new Map(teams.map((t) => [t.id, t]));
  const chain = (t: DxTeam) => {
    const path: DxTeam[] = [t];
    let p = t.parentId ? byId.get(t.parentId) : undefined;
    while (p) {
      path.unshift(p);
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return path;
  };
  const byName = new Map<string, DxTeam[]>();
  teams.forEach((t) => {
    const k = norm(t.name);
    byName.set(k, [...(byName.get(k) ?? []), t]);
  });
  const histByName = new Map(historic.map((h) => [norm(h.name), h]));
  // Current level-3 group names, so historic paths snap onto today's groups.
  const currentUnits = new Set(teams.map((t) => chain(t)[UNIT_LEVEL - 1]?.name).filter(Boolean) as string[]);

  /** Name variants: "Späti/Spaeti" → both halves, "Zebra2-tmp" → "zebra". */
  const variants = (raw: string) => {
    const parts = raw.split(/[/|,]/).map(norm).filter(Boolean);
    const loose = parts.map((p) => p.replace(/\b(tmp|temp|old|new|team)\b/g, "").replace(/\d+/g, "").replace(/\s+/g, " ").trim());
    return Array.from(new Set([norm(raw), ...parts, ...loose].filter(Boolean)));
  };

  const fromCurrent = (key: string) => {
    const candidates = byName.get(key) ?? [];
    // Prefer the Design tree, then real teams (leaves), then deepest match.
    const inDesign = (t: DxTeam) => Number(chain(t)[1]?.name === "Design");
    const best = [...candidates].sort(
      (a, b) =>
        inDesign(b) - inDesign(a) ||
        Number(a.isParent) - Number(b.isParent) ||
        chain(b).length - chain(a).length ||
        b.contributors - a.contributors,
    )[0];
    if (!best) return undefined;
    const path = chain(best);
    return (path[UNIT_LEVEL - 1] ?? path[path.length - 1]).name;
  };
  const fromHistoric = (key: string) => {
    const h = histByName.get(key);
    if (!h) return undefined;
    // Walk up from the old parent to the nearest group that still exists
    // today (snapshot names may carry an owner suffix, e.g. "Marketplace Jane Doe").
    const units = Array.from(currentUnits);
    for (const n of [...h.path].reverse().slice(1)) {
      const k = norm(n);
      const hit = units.find((u) => k === norm(u)) ?? units.find((u) => k.startsWith(norm(u) + " "));
      if (hit) return hit;
    }
    return undefined;
  };

  const map: TeamBusinessUnitMap = {};
  for (const raw of known) {
    if (overrides[raw]) { map[raw] = overrides[raw]; continue; }
    const keys = variants(raw);
    const unit =
      keys.map(fromCurrent).find(Boolean) ??
      keys.map(fromHistoric).find(Boolean);
    if (unit) map[raw] = norm(unit) === "marketplace product" ? "Marketplace" : unit;
  }
  return map;
}
