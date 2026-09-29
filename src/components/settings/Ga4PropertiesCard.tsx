import * as React from "react";
import { ArrowDown, ArrowUp, ChartLineUp, Trash } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import {
  SourceAddField,
  SourceCard,
  SourceList,
  SourceListItem,
  type SourceRun,
} from "@/components/settings/source/SourceCard";
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
  lastRun?: SourceRun;
}

/** Manages Google Analytics properties one at a time. Names come from Google Analytics. */
const Ga4PropertiesCard = ({ saved, lastRun }: Ga4PropertiesCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const [properties, setProperties] = React.useState<PropertyEntry[]>([]);
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
      config: { ...saved, properties: next },
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

  const addProperty = async (value: string) => {
    const id = value.replace(/[^0-9]/g, "");
    if (!id) return false;
    if (properties.some((p) => p.id === id)) {
      toast({ title: "Already added", description: "That property is on the list." });
      return false;
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
      toast({
        title: "Property added",
        description: name ?? "The name will appear once this property sends data.",
      });
      return true;
    } catch (err) {
      toast({
        title: "Could not add that property",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return false;
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
    <SourceCard
      title="GA4 documentation traffic"
      description="Documentation site usage. Each property gets its own Documentation tab; names are read straight from Google Analytics."
      lastRun={lastRun}
    >
      <SourceList
        empty={{
          icon: <ChartLineUp size={40} />,
          title: "No properties yet",
          body: "Paste a Google Analytics property ID below to start tracking it.",
        }}
      >
        {properties.map((property, index) => (
          <SourceListItem
            key={property.id}
            title={property.name}
            subtitle={property.id}
            actions={
              <>
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
              </>
            }
          />
        ))}
      </SourceList>

      <SourceAddField
        label="Add a property"
        placeholder="Google Analytics property ID, e.g. 401234567"
        helperText="Found in Google Analytics under Admin → Property settings."
        busy={busy === "add"}
        onAdd={addProperty}
      />
    </SourceCard>
  );
};

export default Ga4PropertiesCard;
