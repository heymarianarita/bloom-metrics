import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowClockwise } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { supabase } from "@/integrations/supabase/client";
import { useCanEdit, useSession } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * "Sync Google Analytics": playground can't be reached by Google, and the server can't
 * pass the Apps Script web app's Vinted-only sign-in, so the editor's browser carries
 * the report. The web app (opened in a small window) posts its prepared report back to
 * this page, which hands it to the server.
 */

const MESSAGE_TYPE = "bloom-ga4-snapshot";
const WAIT_MS = 120_000;

/** Apps Script HtmlService pages are served from hosts like n-abc123-0lu-script.googleusercontent.com. */
const fromAppsScript = (origin: string) => {
  try {
    return /(^|[.-])script\.googleusercontent\.com$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

export const Ga4SyncButton = () => {
  const { user } = useSession();
  const { data: canEdit } = useCanEdit(user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const info = useQuery({
    queryKey: ["ga4-sync-info"],
    enabled: Boolean(canEdit),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ga4-analytics", { body: { mode: "sync-info" } });
      if (error) throw error;
      return data as { syncUrl: string | null; refreshedAt: string | null };
    },
  });

  if (!canEdit || !info.data?.syncUrl) return null;

  const sync = () => {
    const url = new URL(info.data!.syncUrl!);
    url.searchParams.set("origin", window.location.origin);
    const popup = window.open(url.toString(), "bloom-ga4-sync", "width=480,height=420");
    if (!popup) {
      toast({ title: "Pop-up blocked", description: "Allow pop-ups for this site, then try again.", variant: "destructive" });
      return;
    }
    setBusy(true);

    let finished = false;
    const finish = (message?: { title: string; description?: string; error?: boolean }) => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(watch);
      window.clearTimeout(timer);
      if (!popup.closed) popup.close();
      setBusy(false);
      if (message) toast({ title: message.title, description: message.description, variant: message.error ? "destructive" : undefined });
    };

    const onMessage = async (event: MessageEvent) => {
      if (!fromAppsScript(event.origin) || event.data?.type !== MESSAGE_TYPE) return;
      const { data, error } = await supabase.functions.invoke("ga4-analytics", {
        body: { mode: "browser_sync", report: event.data.report },
      });
      if (error || (data as { ok?: boolean })?.ok !== true) {
        finish({ title: "Could not save the Google Analytics data", error: true });
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ga4-analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["ga4-sync-info"] }),
      ]);
      finish({ title: "Google Analytics synced", description: `${(data as { propertyCount?: number }).propertyCount ?? ""} properties updated.` });
    };

    window.addEventListener("message", onMessage);
    // Closed without sending anything (e.g. the user closed it, or signed in as someone without access).
    const watch = window.setInterval(() => popup.closed && finish(), 500);
    const timer = window.setTimeout(
      () => finish({ title: "Sync timed out", description: "The Google Analytics window didn't respond.", error: true }),
      WAIT_MS,
    );
  };

  return (
    <DesignButton
      variant="outlined"
      theme="primary"
      size="small"
      icon={<ArrowClockwise size={16} />}
      isLoading={busy}
      onClick={sync}
    >
      Sync Google Analytics
    </DesignButton>
  );
};
