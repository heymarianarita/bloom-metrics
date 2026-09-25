import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CaretRight } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  parentId: string | null;
  isParent: boolean;
  contributors: number;
};

const useGetDXTeams = () =>
  useQuery({
    queryKey: ["getdx-teams"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("getdx-teams", { method: "GET" });
      if (error) throw error;
      return data as { ok: boolean; error?: string; teams: Team[] };
    },
    staleTime: 5 * 60 * 1000,
  });

const Node = ({
  team,
  childrenOf,
  depth,
}: {
  team: Team;
  childrenOf: Map<string, Team[]>;
  depth: number;
}) => {
  const kids = childrenOf.get(team.id) ?? [];
  const [open, setOpen] = React.useState(depth < 1);
  const total = React.useMemo(() => {
    const count = (t: Team): number =>
      t.contributors + (childrenOf.get(t.id) ?? []).reduce((s, c) => s + count(c), 0);
    return count(team);
  }, [team, childrenOf]);

  return (
    <li>
      <button
        type="button"
        onClick={() => kids.length && setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 h-8 px-2 rounded-[6px] text-left text-[14px] text-foreground",
          kids.length ? "hover:bg-[rgba(21,25,26,0.06)] active:bg-[rgba(21,25,26,0.04)]" : "cursor-default",
        )}
      >
        <CaretRight
          size={12}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
            !kids.length && "invisible",
          )}
        />
        <span className="truncate flex-1">{team.name}</span>
        {kids.length > 0 && (
          <span className="text-[12px] text-muted-foreground shrink-0">{kids.length} groups</span>
        )}
        <span className="text-[12px] text-muted-foreground shrink-0 w-[88px] text-right">
          {total} people
        </span>
      </button>
      {open && kids.length > 0 && (
        <ul className="ml-[14px] pl-2 border-l border-border">
          {kids.map((k) => (
            <Node key={k.id} team={k} childrenOf={childrenOf} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const GetDXTeamsCard = () => {
  const { data, isLoading, error } = useGetDXTeams();

  const { roots, childrenOf, levels } = React.useMemo(() => {
    const teams = data?.teams ?? [];
    const byId = new Map(teams.map((t) => [t.id, t]));
    const childrenOf = new Map<string, Team[]>();
    const roots: Team[] = [];
    for (const t of teams) {
      if (t.parentId && byId.has(t.parentId)) {
        const arr = childrenOf.get(t.parentId) ?? [];
        arr.push(t);
        childrenOf.set(t.parentId, arr);
      } else roots.push(t);
    }
    const sort = (a: Team, b: Team) => a.name.localeCompare(b.name);
    roots.sort(sort);
    childrenOf.forEach((arr) => arr.sort(sort));
    const depthOf = (t: Team): number => {
      let d = 1;
      let p = t.parentId ? byId.get(t.parentId) : undefined;
      while (p) {
        d++;
        p = p.parentId ? byId.get(p.parentId) : undefined;
      }
      return d;
    };
    const levels = teams.reduce((m, t) => Math.max(m, depthOf(t)), 0);
    return { roots, childrenOf, levels };
  }, [data]);

  return (
    <>
      <DesignSpacer size="small" />
      <DesignDivider />
      <DesignSpacer size="small" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-foreground">User groups</p>
        {data?.ok && (
          <div className="flex gap-2">
            <DesignBadge theme="muted" styling="light">{data.teams.length} groups</DesignBadge>
            <DesignBadge theme="muted" styling="light">{levels} levels</DesignBadge>
          </div>
        )}
      </div>
      <DesignSpacer size="small" />
      {isLoading ? (
        <div className="flex justify-center py-6"><DesignLoader /></div>
      ) : error || !data?.ok ? (
        <DesignInfoBanner
          type="warning"
          title="Could not load groups from GetDX"
          description={data?.error ?? (error instanceof Error ? error.message : "Unknown error")}
        />
      ) : (
        <div className="max-h-[480px] overflow-y-auto rounded-[6px] border border-border p-2">
          <ul>
            {roots.map((r) => (
              <Node key={r.id} team={r} childrenOf={childrenOf} depth={0} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default GetDXTeamsCard;
