import * as React from "react";
import { FigmaLogo, Trash, ArrowClockwise, Stack } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import {
  SourceAddField,
  SourceCard,
  SourceList,
  SourceListItem,
  SourceShownIn,
  type SourceRun,
} from "@/components/settings/source/SourceCard";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { fetchFigmaFileName, useFigmaAnalytics } from "@/hooks/useFigmaAnalytics";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface LibraryEntry {
  fileKey: string;
  name: string;
  excludedPages?: string[];
}

/** Lets admins choose which library pages count towards adoption figures. */
const LibraryPages = ({
  library,
  onChange,
}: {
  library: LibraryEntry;
  onChange: (excluded: string[]) => void;
}) => {
  const { data, isLoading } = useFigmaAnalytics(library.fileKey, {});
  const excluded = library.excludedPages ?? [];
  const pages = data?.pages ?? [];
  if (isLoading) return <div className="py-3 flex justify-center"><DesignLoader /></div>;
  if (pages.length === 0)
    return <p className="text-[14px] text-muted-foreground py-2">No pages found for this library.</p>;
  return (
    <div className="pb-3">
      <p className="text-[12px] text-muted-foreground pb-2">
        {pages.length - excluded.length}/{pages.length} pages count towards adoption. Untick pages
        like covers, archives or work in progress.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {pages.map((page) => (
          <label key={page.name} className="flex items-center gap-2 text-[14px] text-foreground cursor-pointer">
          <DesignCheckbox
            checked={!excluded.includes(page.name)}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? excluded.filter((p) => p !== page.name)
                  : [...excluded, page.name],
              )
            }
          />
            <span className="truncate">{page.name}</span>
            <span className="text-[12px] text-muted-foreground">{page.componentCount}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

interface FigmaLibrariesCardProps {
  saved?: Record<string, unknown>;
  lastRun?: SourceRun;
}

/** Manages the list of Figma libraries. Labels always come from the Figma file itself. */
const FigmaLibrariesCard = ({ saved, lastRun }: FigmaLibrariesCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const [libraries, setLibraries] = React.useState<LibraryEntry[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [openPages, setOpenPages] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = (saved?.libraries as LibraryEntry[] | undefined) ?? [];
    setLibraries(
      raw
        .filter((l) => typeof l?.fileKey === "string" && l.fileKey)
        .map((l) => ({
          fileKey: l.fileKey,
          name: l.name || l.fileKey,
          excludedPages: Array.isArray(l.excludedPages) ? l.excludedPages : [],
        })),
    );
  }, [saved]);

  const saveConfig = async (patch: Record<string, unknown>) => {
    try {
      await save.mutateAsync({ source_key: "figma", label: "Figma component analytics", config: { ...saved, libraries, ...patch } });
      queryClient.invalidateQueries({ queryKey: ["figma-libraries"] });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      throw err;
    }
  };

  const persist = async (next: LibraryEntry[]) => {
    await saveConfig({ libraries: next });
    setLibraries(next);
  };

  const addLibrary = async (key: string) => {
    if (libraries.some((l) => l.fileKey === key)) {
      toast({ title: "Already added", description: "That library is on the list." });
      return false;
    }
    setBusy("add");
    try {
      const name = await fetchFigmaFileName(key);
      await persist([...libraries, { fileKey: key, name }]);
      toast({ title: "Library added", description: name });
      return true;
    } catch (err) {
      toast({
        title: "Could not add that library",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const refreshName = async (fileKey: string) => {
    setBusy(fileKey);
    try {
      const name = await fetchFigmaFileName(fileKey);
      await persist(libraries.map((l) => (l.fileKey === fileKey ? { ...l, name } : l)));
    } catch (err) {
      toast({
        title: "Could not refresh the name",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SourceCard
      title="Figma component analytics"
      description="Design adoption: insertions, detachments and component coverage. Names are read straight from Figma."
      credentialsKey="figma"
      lastRun={lastRun}
    >
      <SourceShownIn
        value={saved?.metricGroupId as string | undefined}
        onChange={(metricGroupId) => saveConfig({ metricGroupId }).catch(() => undefined)}
        helperText="The Metrics tab that shows Figma adoption."
      />

      <SourceList
        empty={{
          icon: <FigmaLogo size={40} />,
          title: "No libraries yet",
          body: "Paste a Figma library file key below to start tracking it.",
        }}
      >
        {libraries.map((library) => (
          <SourceListItem
            key={library.fileKey}
            title={library.name}
            subtitle={library.fileKey}
            actions={
              <>
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  icon={<Stack size={16} />}
                  onClick={() => setOpenPages((current) => (current === library.fileKey ? null : library.fileKey))}
                >
                  Pages{library.excludedPages?.length ? ` (${library.excludedPages.length} excluded)` : ""}
                </DesignButton>
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  icon={<ArrowClockwise size={16} />}
                  isLoading={busy === library.fileKey}
                  onClick={() => refreshName(library.fileKey)}
                >
                  Refresh name
                </DesignButton>
                <DesignButton
                  variant="flat"
                  theme="error"
                  size="small"
                  icon={<Trash size={16} />}
                  onClick={() => persist(libraries.filter((l) => l.fileKey !== library.fileKey)).catch(() => undefined)}
                >
                  Remove
                </DesignButton>
              </>
            }
          >
            {openPages === library.fileKey && (
              <LibraryPages
                library={library}
                onChange={(excludedPages) =>
                  persist(libraries.map((l) => (l.fileKey === library.fileKey ? { ...l, excludedPages } : l))).catch(
                    () => undefined,
                  )
                }
              />
            )}
          </SourceListItem>
        ))}
      </SourceList>

      <SourceAddField
        label="Add a library"
        placeholder="Figma file key, e.g. AxgxbkHNzhVbyMBdB1wMuM"
        helperText="Found in the library URL: figma.com/file/<file-key>/…"
        busy={busy === "add"}
        onAdd={addLibrary}
      />
    </SourceCard>
  );
};

export default FigmaLibrariesCard;
