import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignAccordion } from "@/components/ds/DesignAccordion";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import CredentialField from "@/components/settings/CredentialField";
import { CREDENTIAL_DEFS } from "@/hooks/useCredentials";
import { useIsAdmin, useSession } from "@/hooks/useAuth";

const SLACK_TOKEN = CREDENTIAL_DEFS.find((d) => d.name === "SLACK_BOT_TOKEN")!;

/**
 * The Slack bot token that posts reports. Admins set, replace or remove it here; everyone
 * else only sees that Slack isn't connected yet.
 */
export const SlackConnectionCard = ({ connected }: { connected: boolean }) => {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isAdmin = useIsAdmin(user).data === true;
  const [expanded, setExpanded] = React.useState(!connected);
  React.useEffect(() => setExpanded(!connected), [connected]);

  if (!isAdmin) {
    return connected ? null : (
      <DesignInfoBanner
        type="warning"
        title="Slack isn't connected"
        description="Reports can be written and scheduled, but nothing is posted until an admin connects Slack on this page."
        showCloseButton={false}
      />
    );
  }

  return (
    <DesignCard className="overflow-hidden">
      <DesignAccordion
        title="Slack connection"
        subtitle={connected ? "Connected. Reports are posted by your Slack app." : "Not connected. Add the app's bot token so reports can be posted."}
        isExpanded={expanded}
        onToggle={setExpanded}
      >
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-1 text-sm text-foreground list-decimal pl-5">
            <li>In api.slack.com/apps, open your app, then OAuth &amp; Permissions.</li>
            <li>Add the bot scope chat:write and install the app to your workspace.</li>
            <li>Copy the Bot User OAuth Token (it starts with xoxb-) and save it below.</li>
            <li>In each channel a report posts to, type /invite and the app's name.</li>
          </ol>
          <CredentialField def={SLACK_TOKEN} onChange={() => queryClient.invalidateQueries({ queryKey: ["slack-reports"] })} />
          <p className="text-xs text-muted-foreground">
            Only admins can see this. The token is stored encrypted and can't be read back. It's also used for Slack sign-in links.
          </p>
        </div>
      </DesignAccordion>
    </DesignCard>
  );
};
