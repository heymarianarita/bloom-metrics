import * as React from "react";
import { FigmaLogo, Key, Plus, Trash, ArrowClockwise, Stack } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignBadge } from "@/components/ds/DesignBadge";
import CredentialsCard from "@/components/settings/CredentialsCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { useSaveDataSourceConfig } from "@/hooks/useDataSources";
import { fetchFigmaFileName, useFigmaAnalytics } from "@/hooks/useFigmaAnalytics";
import { DesignCheckbox } from "@/components/ds/DesignCheckbox";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { useToast } from "@/hooks/use-toast";
import { useCredentialStatus } from "@/hooks/useCredentials";
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
  lastRun?: { status: string; ran_at: string; message: string };
}

/** Manages the list of Figma libraries. Labels always come from the Figma file itself. */
const FigmaLibrariesCard = ({ saved, lastRun }: FigmaLibrariesCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const save = useSaveDataSourceConfig();
  const [libraries, setLibraries] = React.useState<LibraryEntry[]>([]);
  const [newKey, setNewKey] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const credentialStatus = useCredentialStatus();
  const tokenSet = (credentialStatus.data ?? []).some((c) => c.name === "FIGMA_ACCESS_TOKEN" && c.readable !== false);
  const [showToken, setShowToken] = React.useState(false);
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

  const persist = async (next: LibraryEntry[]) => {
    await save.mutateAsync({
      source_key: "figma",
      label: "Figma component analytics",
      config: { libraries: next },
    });
    setLibraries(next);
    queryClient.invalidateQueries({ queryKey: ["figma-libraries"] });
  };

  const addLibrary = async () => {
    const key = newKey.trim();
    if (!key) return;
    if (libraries.some((l) => l.fileKey === key)) {
      toast({ title: "Already added", description: "That library is on the list." });
      return;
    }
    setBusy("add");
    try {
      const name = await fetchFigmaFileName(key);
      await persist([...libraries, { fileKey: key, name }]);
      setNewKey("");
      toast({ title: "Library added", description: name });
    } catch (err) {
      toast({
        title: "Could not add that library",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
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

  const removeLibrary = async (fileKey: string) => {
    setBusy(fileKey);
    try {
      await persist(libraries.filter((l) => l.fileKey !== fileKey));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DesignCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-medium text-foreground">Figma component analytics</h2>
          </div>
          <p className="text-[14px] text-muted-foreground mt-1">
            Add as many libraries as you need. Names are read straight from Figma.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DesignBadge theme={tokenSet ? "success" : "error"} styling="light">
            <Key size={12} /> {tokenSet ? "Token set" : "Token missing"}
          </DesignBadge>
          <DesignButton
            variant="outlined"
            theme="muted"
            size="small"
            icon={<Key size={16} />}
            onClick={() => setShowToken((v) => !v)}
          >
            {showToken ? "Hide token" : "Manage token"}
          </DesignButton>
          {lastRun && (
            <DesignBadge theme={lastRun.status === "success" ? "success" : "error"} styling="light">
              {lastRun.status === "success" ? "Last sync OK" : "Last sync failed"}
            </DesignBadge>
          )}
        </div>
      </div>

      <DesignSpacer size="small" />
      <DesignDivider />
      <DesignSpacer size="small" />

      {libraries.length === 0 ? (
        <DesignEmptyState
          icon={<FigmaLogo size={40} />}
          title="No libraries yet"
          body="Paste a Figma library file key below to start tracking it."
        />
      ) : (
        <ul className="flex flex-col">
          {libraries.map((library) => (
            <li key={library.fileKey} className="border-b border-border last:border-b-0">
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-[16px] text-foreground truncate">{library.name}</p>
                <p className="text-[12px] text-muted-foreground truncate">{library.fileKey}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DesignButton
                  variant="flat"
                  theme="muted"
                  size="small"
                  icon={<Stack size={16} />}
                  onClick={() =>
                    setOpenPages((current) => (current === library.fileKey ? null : library.fileKey))
                  }
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
                  onClick={() => removeLibrary(library.fileKey)}
                >
                  Remove
                </DesignButton>
              </div>
            </div>
            {openPages === library.fileKey && (
              <LibraryPages
                library={library}
                onChange={(excludedPages) =>
                  persist(
                    libraries.map((l) =>
                      l.fileKey === library.fileKey ? { ...l, excludedPages } : l,
                    ),
                  )
                }
              />
            )}
            </li>
          ))}
        </ul>
      )}

      {(showToken || !tokenSet) && <CredentialsCard sourceKey="figma" />}

      <DesignSpacer size="small" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <DesignInputText
            label="Add a library"
            placeholder="Figma file key, e.g. AxgxbkHNzhVbyMBdB1wMuM"
            helperText="Found in the library URL: figma.com/file/<file-key>/…"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addLibrary();
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
            onClick={addLibrary}
          >
            Add
          </DesignButton>
        </div>
      </div>
    </DesignCard>
  );
};

export default FigmaLibrariesCard;
