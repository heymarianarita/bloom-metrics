import * as React from "react";
import { PencilSimple, Plus, SlackLogo, Trash } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDialog } from "@/components/ds/DesignDialog";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { SlackReportEditor } from "@/components/settings/slack/SlackReportEditor";
import { SlackConnectionCard } from "@/components/settings/slack/SlackConnectionCard";
import { useDeleteSlackReport, useSlackReports, type SlackReport } from "@/hooks/useSlackReports";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/formatDate";
import { utcLabel } from "../../../server/slackReports/schedule.ts";

/** Draft, scheduled or sent for a one-off report; on schedule or paused for a quarterly one. */
const statusOf = (report: SlackReport) => {
  if (report.mode === "quarterly") {
    return report.enabled ? { label: "Every quarter", theme: "success" as const } : { label: "Paused", theme: "muted" as const };
  }
  if (report.sent_at) return { label: "Sent", theme: "success" as const };
  if (report.enabled && report.scheduled_at) return { label: "Scheduled", theme: "primary" as const };
  return { label: "Draft", theme: "muted" as const };
};

const whenOf = (report: SlackReport) => {
  if (report.mode === "quarterly") {
    return report.next_send
      ? `${utcLabel(Date.parse(report.next_send.at))}, for ${report.next_send.quarter}`
      : "Paused: save the schedule to turn it on";
  }
  if (report.sent_at) return `Sent ${formatDateTime(report.sent_at)}`;
  if (report.enabled && report.scheduled_at) return formatDateTime(report.scheduled_at);
  return "Not scheduled yet";
};

const ReportCard = ({ report, onEdit, onDelete }: { report: SlackReport; onEdit: () => void; onDelete: () => void }) => {
  const run = report.last_run;
  const status = statusOf(report);
  const contents = [
    report.mode === "once" ? report.quarter : null,
    report.include_impact ? "Impact section" : null,
    report.metric_ids.length || !report.include_impact
      ? `${report.metric_ids.length} metric${report.metric_ids.length === 1 ? "" : "s"}`
      : null,
    report.include_summary ? "AI summary" : null,
  ].filter(Boolean);
  return (
    <DesignCard className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-foreground break-words">{report.name}</h2>
            <DesignBadge theme={status.theme} styling="light">
              {status.label}
            </DesignBadge>
            {run?.status === "failed" && (
              <DesignBadge theme="error" styling="light">
                Last send failed
              </DesignBadge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-words">
            Posts to {report.channel} · {contents.join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DesignButton variant="outlined" theme="primary" size="small" icon={<PencilSimple size={16} />} onClick={onEdit}>
            Edit
          </DesignButton>
          <DesignButton variant="flat" theme="error" size="small" icon={<Trash size={16} />} onClick={onDelete}>
            Delete
          </DesignButton>
        </div>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">{report.mode === "quarterly" ? "Next send" : "Sends"}</dt>
          <dd className="text-sm text-foreground">{whenOf(report)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Last send</dt>
          <dd className="text-sm text-foreground break-words">
            {run ? `${formatDateTime(run.at)}${run.quarter ? `, ${run.quarter}` : ""}: ${run.message}` : "Not sent yet"}
          </dd>
        </div>
      </dl>
    </DesignCard>
  );
};

const SlackReportsSettings = () => {
  const { toast } = useToast();
  const reports = useSlackReports();
  const remove = useDeleteSlackReport();
  const [editing, setEditing] = React.useState<{ report: SlackReport | null } | null>(null);
  const [deleting, setDeleting] = React.useState<SlackReport | null>(null);
  const data = reports.data;

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast({ title: "Report deleted", description: `${deleting.name} won't be sent.` });
      setDeleting(null);
    } catch (err) {
      toast({ title: "Couldn't delete the report", description: err instanceof Error ? err.message : "Try again.", variant: "destructive" });
    }
  };

  const newReport = (
    <DesignButton variant="filled" theme="primary" icon={<Plus size={16} />} onClick={() => setEditing({ report: null })}>
      New report
    </DesignButton>
  );

  return (
    <RequireRole role="editor">
      <AppShell>
        <DesignPageHeader
          title="Slack reports"
          subtitle="Write a message about a quarter's numbers and see it as it will look in Slack. Then send it now, schedule it, or repeat it every quarter."
          primaryAction={data?.reports.length ? newReport : undefined}
        />
        <DesignSpacer size="medium" />

        {reports.isLoading ? (
          <DesignLoader />
        ) : reports.isError || !data ? (
          <DesignEmptyState
            title="Couldn't load Slack reports"
            body={reports.error instanceof Error ? reports.error.message : "Try again in a moment."}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <SlackConnectionCard connected={data.slackConnected} />
            {data.reports.length === 0 ? (
              <DesignCard className="p-4">
                <DesignEmptyState
                  icon={<SlackLogo size={40} />}
                  title="No Slack reports yet"
                  body="Write a report on a quarter's numbers for your team's channel."
                  action={newReport}
                />
              </DesignCard>
            ) : (
              data.reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onEdit={() => setEditing({ report: r })}
                  onDelete={() => setDeleting(r)}
                />
              ))
            )}
          </div>
        )}

        <SlackReportEditor
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          report={editing?.report ?? null}
          quarters={data?.quarters ?? []}
          slackConnected={data?.slackConnected ?? false}
        />
        <DesignDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)} title="Delete this report?">
          <p className="text-sm text-muted-foreground text-center">
            {deleting?.name} stops being sent. Messages already in Slack stay there.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <DesignButton variant="filled" theme="error" fullWidth isLoading={remove.isPending} onClick={onDelete}>
              Delete report
            </DesignButton>
            <DesignButton variant="flat" theme="muted" fullWidth onClick={() => setDeleting(null)}>
              Cancel
            </DesignButton>
          </div>
        </DesignDialog>
      </AppShell>
    </RequireRole>
  );
};

export default SlackReportsSettings;
