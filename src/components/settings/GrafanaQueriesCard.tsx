import * as React from "react";
import { Database, GearSix, Trash } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import {
  SourceAddField,
  SourceCard,
  SourceList,
  SourceListItem,
  type SourceRun,
} from "@/components/settings/source/SourceCard";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { useCredentialStatus, useSetCredential } from "@/hooks/useCredentials";
import { useIsAdmin, useSession } from "@/hooks/useAuth";
import { useGrafana, useSyncGrafana, type GrafanaSavedQuery } from "@/hooks/useGrafana";
import { useToast } from "@/hooks/use-toast";
import { describeQuery, parseGrafanaInput, SYNCED_COLUMN } from "../../../server/shared/grafana.ts";

const LABEL = "Grafana";
const DEFAULT_DAYS = 90;
const MIN_DAYS = 7;
const NO_DATE = "none";

/**
 * Grafana: one row per saved query, each saved as its own dataset every Monday. A query is
 * added by pasting its Explore address (or JSON); its name, date column and window are in its
 * settings. Same layout as the other source cards; changes save as they're made.
 */
const GrafanaQueriesCard = ({ saved, lastRun }: { saved?: Record<string, unknown>; lastRun?: SourceRun }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const sync = useSyncGrafana();
  const status = useGrafana();
  const statusById = new Map((status.data?.queries ?? []).map((q) => [q.id, q]));
  const [queries, setQueries] = React.useState<GrafanaSavedQuery[]>([]);
  const [openRow, setOpenRow] = React.useState<string | null>(null);
  const { user } = useSession();
  const isAdmin = useIsAdmin(user).data === true;
  const credentials = useCredentialStatus();
  const setCredential = useSetCredential();
  const isSet = (name: string) => (credentials.data ?? []).some((c) => c.name === name && c.readable !== false);

  React.useEffect(() => {
    setQueries(Array.isArray(saved?.queries) ? (saved.queries as GrafanaSavedQuery[]).filter((q) => q?.id) : []);
  }, [saved]);

  const persist = async (patch: { queries: GrafanaSavedQuery[] }) => {
    setQueries(patch.queries);
    try {
      await save.mutateAsync({ source_key: "grafana", label: LABEL, config: { ...saved, ...patch } });
      queryClient.invalidateQueries({ queryKey: ["grafana"] });
      return true;
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      return false;
    }
  };

  const update = (id: string, patch: Partial<GrafanaSavedQuery>) =>
    persist({ queries: queries.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  const syncOne = async (id: string) => {
    try {
      const r = await sync.mutateAsync(id);
      toast({ title: "Synced", description: `${r.added} row${r.added === 1 ? "" : "s"} saved.` });
    } catch (err) {
      toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const addQuery = async (value: string) => {
    const parsed = parseGrafanaInput(value);
    if ("error" in parsed) {
      toast({ title: "Not a Grafana query", description: parsed.error, variant: "destructive" });
      return false;
    }
    const entry: GrafanaSavedQuery = { id: crypto.randomUUID().slice(0, 8), name: describeQuery(parsed.query), query: parsed.query };
    if (!(await persist({ queries: [...queries, entry] }))) return false;
    setOpenRow(entry.id);
    // The address decides where the token is sent, so only an admin's first link sets it.
    let hasUrl = isSet("GRAFANA_URL");
    if (!hasUrl && isAdmin && parsed.url) {
      hasUrl = await setCredential.mutateAsync({ name: "GRAFANA_URL", value: parsed.url }).then(() => true, () => false);
    }
    if (!status.data?.fake && (!hasUrl || !isSet("GRAFANA_TOKEN"))) {
      const missing = [!hasUrl && "Grafana's address", !isSet("GRAFANA_TOKEN") && "a token"].filter(Boolean).join(" and ");
      toast({
        title: "Query added",
        description: `It syncs once ${isAdmin ? "you add" : "an admin adds"} ${missing}.`,
      });
      return true;
    }
    toast({ title: "Query added", description: "Fetching its rows now. Rename it in its settings." });
    void syncOne(entry.id);
    return true;
  };

  const onSync = async () => {
    try {
      const r = await sync.mutateAsync(undefined);
      toast({ title: "Synced", description: `${r.added} row${r.added === 1 ? "" : "s"} saved.` });
    } catch (err) {
      toast({ title: "Sync failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <SourceCard
      title={LABEL}
      description={`Saves the results of Grafana queries as datasets every Monday, one dataset per query. Rows stay here after Grafana deletes them, so history builds up from the first sync.${
        status.data?.fake ? " Fake data is on (local only): syncs save made-up numbers instead of asking Grafana." : ""
      }`}
      credentialsKey="grafana"
      lastRun={status.data?.lastRun ?? lastRun}
      onSync={queries.length ? onSync : undefined}
      syncing={sync.isPending}
    >
      <SourceList
        empty={{
          icon: <Database size={40} />,
          title: "No queries yet",
          body: "Paste a Grafana Explore address below to save that query's results as a dataset.",
        }}
      >
        {queries.map((q) => {
          const s = statusById.get(q.id);
          const dateOptions = (s?.columns ?? [])
            .filter((c) => c.kind === "date" && c.key !== SYNCED_COLUMN.key)
            .map((c) => ({ value: c.key, label: c.label }));
          const range = s?.firstDay && s.lastDay ? `, ${s.firstDay === s.lastDay ? s.firstDay : `${s.firstDay} to ${s.lastDay}`}` : "";
          return (
            <SourceListItem
              key={q.id}
              title={q.name}
              subtitle={s?.datasetId ? `${s.rows} row${s.rows === 1 ? "" : "s"}${range}` : "Not synced yet"}
              actions={
                <>
                  <DesignButton
                    variant="flat"
                    theme="muted"
                    size="small"
                    icon={<GearSix size={16} />}
                    aria-expanded={openRow === q.id}
                    onClick={() => setOpenRow((current) => (current === q.id ? null : q.id))}
                  >
                    Settings
                  </DesignButton>
                  <DesignButton
                    variant="flat"
                    theme="error"
                    size="small"
                    icon={<Trash size={16} />}
                    onClick={async () => {
                      if (await persist({ queries: queries.filter((x) => x.id !== q.id) })) {
                        toast({
                          title: "Query removed",
                          description: "Its dataset keeps its rows and becomes an ordinary, editable dataset after the next sync.",
                        });
                      }
                    }}
                  >
                    Remove
                  </DesignButton>
                </>
              }
            >
              {openRow === q.id && (
                <div className="grid gap-3 md:grid-cols-2">
                  <DesignInputText
                    label="Name"
                    helperText="Also the dataset's name, in Data → Datasets."
                    defaultValue={q.name}
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== q.name) void update(q.id, { name });
                    }}
                  />
                  <DesignInputText
                    label="Days fetched each sync"
                    inputMode="numeric"
                    helperText={`How far back each sync asks Grafana for, at least ${MIN_DAYS} since it syncs weekly. Older rows already saved are kept.`}
                    defaultValue={String(q.days ?? DEFAULT_DAYS)}
                    onBlur={(e) => {
                      const days = Math.max(MIN_DAYS, Math.round(Number(e.target.value)));
                      if (!Number.isFinite(days)) return;
                      e.target.value = String(days);
                      if (days !== (q.days ?? DEFAULT_DAYS)) void update(q.id, { days });
                    }}
                  />
                  <div className="md:col-span-2">
                    <DesignInputSelect
                      label="Date column"
                      placeholder={s?.datasetId ? "No date column found" : "Available after the first sync"}
                      disabled={!dateOptions.length}
                      options={[...dateOptions, { value: NO_DATE, label: "None: save each sync as a snapshot" }]}
                      value={q.dateColumn === null ? NO_DATE : q.dateColumn ?? s?.dateColumn ?? ""}
                      onChange={(v) => void update(q.id, { dateColumn: v === NO_DATE ? null : v })}
                      helperText={
                        q.dateColumn === null || (s?.datasetId && !s.dateColumn)
                          ? "Each sync is saved with the day it ran, in a \"Synced on\" column."
                          : "A sync replaces the days it fetched and keeps every other day."
                      }
                    />
                  </div>
                  <p className="md:col-span-2 text-xs text-muted-foreground break-all">
                    Data source: {q.query.datasource.type ? `${q.query.datasource.type}, ` : ""}uid {q.query.datasource.uid}
                  </p>
                </div>
              )}
            </SourceListItem>
          );
        })}
      </SourceList>

      <SourceAddField
        label="Add a query"
        placeholder="https://grafana…/explore?…"
        helperText="Open the query in Grafana Explore and copy the full address from the address bar. Short links (/goto/…) don't work. The query's JSON works too."
        busy={save.isPending}
        onAdd={addQuery}
      />
    </SourceCard>
  );
};

export default GrafanaQueriesCard;
