import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GearSix } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import CredentialField from "@/components/settings/CredentialField";
import { CREDENTIAL_DEFS } from "@/hooks/useCredentials";

const SLACK_TOKEN = CREDENTIAL_DEFS.find((d) => d.name === "SLACK_BOT_TOKEN")!;

/** Admins only: a header button that opens the Slack bot token setting. */
export const SlackConnectionButton = ({ connected }: { connected: boolean }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <DesignButton variant="outlined" theme="muted" icon={<GearSix size={16} />} onClick={() => setOpen(true)}>
        {connected ? "Slack connection" : "Connect Slack"}
      </DesignButton>
      <DesignSideSheet
        open={open}
        onOpenChange={setOpen}
        title="Slack connection"
        width="min(480px, 92vw)"
        minWidth="min(360px, 92vw)"
        className="sm:max-w-none"
      >
        <div className="flex flex-col gap-4 p-4">
          <ol className="flex flex-col gap-1 text-sm text-foreground list-decimal pl-5">
            <li>In api.slack.com/apps, open your app, then OAuth &amp; Permissions.</li>
            <li>Add the bot scope chat:write and install the app to your workspace.</li>
            <li>Copy the Bot User OAuth Token (it starts with xoxb-) and save it below.</li>
            <li>In each channel a report posts to, type /invite and the app's name.</li>
          </ol>
          <CredentialField def={SLACK_TOKEN} onChange={() => queryClient.invalidateQueries({ queryKey: ["slack-reports"] })} />
          <p className="text-xs text-muted-foreground">
            Only admins can change this. The token is stored encrypted and can't be read back. It's also used for Slack sign-in links.
          </p>
        </div>
      </DesignSideSheet>
    </>
  );
};

/** For people who can't connect Slack themselves. */
export const SlackNotConnectedNotice = () => (
  <DesignInfoBanner
    type="warning"
    title="Slack isn't connected"
    description="Reports can be written and scheduled, but nothing is posted until an admin connects Slack on this page."
    showCloseButton={false}
  />
);
