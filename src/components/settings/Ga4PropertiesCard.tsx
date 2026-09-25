import * as React from "react";
import { ArrowDown, ArrowUp, ChartLineUp, Plus, Trash } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { fetchGa4PropertyLabels, fetchGa4PropertyName } from "@/hooks/useGa4Analytics";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PropertyEntry {
  id: string;
  name: string;
}

const pendingName = (id: string) => `Property ${id}`;

interface Ga4PropertiesCardProps {
  saved?: Record<string, unknown>;
  lastRun?: { status: string; ran_at: string; message: string };
}

/** Manages Google Analytics properties one at a time. Names come from Google Analytics. */
const Ga4PropertiesCard = ({ saved, lastRun }: Ga4PropertiesCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const [properties, setProperties] = React.useState<PropertyEntry[]>([]);
  const [newId, setNewId] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = (saved?.properties as PropertyEntry[] | undefined) ?? [];
    setProperties(
      raw
        .filter((p) => typeof p?.id === "string" && p.id)
        .map((p) => ({ id: p.id, name: p.name || p.id })),
    );
  }, [saved]);

  const persist = async (next: PropertyEntry[]) => {
    await save.mutateAsync({
      source_key: "ga4_documentation",
      label: "GA4 documentation traffic",
      config: { properties: next },
    });
    setProperties(next);
    queryClient.invalidateQueries({ queryKey: ["ga4-analytics"] });
  };

  // Fill in any names that were still pending as soon as Google Analytics data arrives.
  React.useEffect(() => {
    const pending = properties.filter((p) => !p.name || p.name === p.id || p.name === pendingName(p.id));
    if (pending.length === 0) return;
    let cancelled = false;
    fetchGa4PropertyLabels()
      .then((labels) => {
        if (cancelled) return;
        const next = properties.map((p) => (labels[p.id] ? { ...p, name: labels[p.id] } : p));
        if (next.some((p, i) => p.name !== properties[i].name)) void persist(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  const addProperty = async () => {
    const id = newId.trim().replace(/[^0-9]/g, "");
    if (!id) return;
    if (properties.some((p) => p.id === id)) {
      toast({ title: "Already added", description: "That property is on the list." });
      return;
    }
    setBusy("add");
    try {
      let name: string | null = null;
      try {
        name = await fetchGa4PropertyName(id);
      } catch {
        name = null;
      }
      await persist([...properties, { id, name: name ?? pendingName(id) }]);
      setNewId("");
      toast({
        title: "Property added",
        description: name ?? "The name will appear once this property sends data.",
      });
    } catch (err) {
      toast({
        title: "Could not add that property",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };


  const moveProperty = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= properties.length) return;
    const next = [...properties];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(properties[index].id);
    try {
      await persist(next);
    } finally {
      setBusy(null);
    }
  };

  const removeProperty = async (id: string) => {
    setBusy(id);
    try {
      await persist(properties.filter((p) => p.id !== id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DesignCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-medium text-foreground">GA4 documentation traffic</h2>
          <p className="text-[14px] text-muted-foreground mt-1">
            Add one property at a time. Names are read straight from Google Analytics.
          </p>
        </div>
        {lastRun && (
          <DesignBadge theme={lastRun.status === "success" ? "success" : "error"} styling="light">
            {lastRun.status === "success" ? "Last sync OK" : "Last sync failed"}
          </DesignBadge>
        )}
      </div>

      <DesignSpacer size="small" />
      <DesignDivider />
      <DesignSpacer size="small" />

      {properties.length === 0 ? (
        <DesignEmptyState
          icon={<ChartLineUp size={40} />}
          title="No properties yet"
          body="Paste a Google Analytics property ID below to start tracking it."
        />
      ) : (
        <ul className="flex flex-col">
          {properties.map((property, index) => (
            <li
              key={property.id}
              className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[16px] text-foreground truncate">{property.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{property.id}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  aria-label={`Move ${property.name} up`}
                  icon={<ArrowUp size={16} />}
                  disabled={index === 0 || busy !== null}
                  onClick={() => moveProperty(index, -1)}
                />
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  aria-label={`Move ${property.name} down`}
                  icon={<ArrowDown size={16} />}
                  disabled={index === properties.length - 1 || busy !== null}
                  onClick={() => moveProperty(index, 1)}
                />
                <DesignButton
                  variant="flat"
                  theme="error"
                  size="small"
                  icon={<Trash size={16} />}
                  onClick={() => removeProperty(property.id)}
                >
                  Remove
                </DesignButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DesignSpacer size="small" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <DesignInputText
            label="Add a property"
            placeholder="Google Analytics property ID, e.g. 401234567"
            helperText="Found in Google Analytics under Admin → Property settings."
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addProperty();
            }}
          />
        </div>
        <div className="sm:mt-[22px]">
          <DesignButton
            variant="filled"
            theme="primary"
            size="medium"
            icon={<Plus size={16} />}
            isLoading={busy === "add"}
            onClick={addProperty}
          >
            Add
          </DesignButton>
        </div>
      </div>
    </DesignCard>
  );
};

export default Ga4PropertiesCard;
