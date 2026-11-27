import * as React from "react";
import { ArrowCounterClockwise, CalendarCheck, FloppyDisk, MagnifyingGlass, PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText, DesignInputTextArea } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignDateInput } from "@/components/ds/DesignDateInput";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignAccordion } from "@/components/ds/DesignAccordion";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { FormSection } from "@/components/settings/metrics/FormSection";
import { SlackMessagePreview } from "@/components/settings/slack/SlackMessagePreview";
import { useManualMetrics, type ManualMetric } from "@/hooks/useManualMetrics";
import { useMetricGroups } from "@/hooks/useMetricGroups";
import {
  useSaveSlackReport,
  useSendSlackReport,
  useSlackReportValues,
  useReviseSlackSummary,
  useWriteSlackSummary,
  type SlackReport,
  type SlackReportInput,
} from "@/hooks/useSlackReports";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { MAX_SEND_DAY, nextSend, utcLabel } from "../../../../server/slackReports/schedule.ts";

/** Same rule as the server: a channel ID (C0123ABCD) or a channel name. */
const CHANNEL = /^([CG][A-Z0-9]{8,}|#?[a-z0-9][a-z0-9._-]{0,79})$/;

const DAY_OPTIONS = Array.from({ length: MAX_SEND_DAY }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} day${i === 0 ? "" : "s"} after the quarter ends`,
}));

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00 UTC`,
}));

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: value };
});

type SendWhen = "now" | "later" | "quarterly";

const SEND_WHEN: { value: SendWhen; title: string; body: string }[] = [
  { value: "now", title: "Send now", body: "Posts it as soon as you choose Send now." },
  { value: "later", title: "Schedule", body: "Posts it once, on the date and time you pick." },
  { value: "quarterly", title: "Every quarter", body: "Posts it after each quarter ends, with that quarter's numbers." },
];

/** The browser's time zone, e.g. "Europe/Vilnius, UTC+02:00". */
const timeZoneLabel = () => {
  const offset = -new Date().getTimezoneOffset();
  const hhmm = `${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone}, UTC${offset < 0 ? "−" : "+"}${hhmm}`;
};

/** Tomorrow at 10:00, local time. */
const defaultSchedule = () => ({ date: formatDate(Date.now() + 86_400_000), time: "10:00" });

/** Metrics whose source has no per-quarter history, so a report can't show them. */
const notByQuarter = (metric: ManualMetric) => metric.source_type === "dynamic" && metric.source_key.startsWith("ga4_documentation");

const blank = (quarter: string): SlackReportInput => ({
  name: "",
  channel: "",
  metric_ids: [],
  include_summary: true,
  include_impact: true,
  intro: "",
  mode: "once",
  quarter,
  scheduled_at: null,
  summary: null,
  summary_quarter: null,
  summary_by_ai: true,
  enabled: false,
  send_day: 3,
  send_hour: 9,
});

/** Create or edit a Slack report, with the message previewed live beside it; then save, send or schedule. */
export const SlackReportEditor = ({
  open,
  onOpenChange,
  report,
  quarters,
  slackConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The report to edit, or null for a new one. */
  report: SlackReport | null;
  /** The quarter in progress, then finished ones, newest first. */
  quarters: string[];
  slackConnected: boolean;
}) => {
  const { toast } = useToast();
  const save = useSaveSlackReport();
  const send = useSendSlackReport();
  const writeSummary = useWriteSlackSummary();
  const reviseSummary = useReviseSlackSummary();
  const metrics = useManualMetrics();
  const metricGroups = useMetricGroups();
  const [form, setForm] = React.useState<SlackReportInput>(() => blank(quarters[0] ?? ""));
  const [sendWhen, setSendWhen] = React.useState<SendWhen>("now");
  const [schedule, setSchedule] = React.useState(defaultSchedule);
  const [search, setSearch] = React.useState("");
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [summaryNote, setSummaryNote] = React.useState<string | null>(null);
  const [instruction, setInstruction] = React.useState("");
  const [previousSummary, setPreviousSummary] = React.useState<{ summary: string | null; byAi: boolean } | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const start = report ? { ...report, quarter: report.quarter ?? report.summary_quarter ?? quarters[1] ?? quarters[0] ?? "" } : blank(quarters[0] ?? "");
    setForm(start);
    setSendWhen(start.mode === "quarterly" ? "quarterly" : start.enabled && start.scheduled_at ? "later" : "now");
    setSchedule(
      report?.scheduled_at ? { date: formatDate(report.scheduled_at), time: formatDateTime(report.scheduled_at).slice(11) } : defaultSchedule(),
    );
    setSearch("");
    setMetricsOpen(false);
    setSummaryNote(null);
    setInstruction("");
    setPreviousSummary(null);
    setShowErrors(false);
    writeSummary.reset();
    // Only when the sheet opens or switches report; writeSummary.reset is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, report]);

  const set = <K extends keyof SlackReportInput>(key: K, value: SlackReportInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const quarter = form.quarter ?? "";

  const content = React.useMemo(
    () => ({ name: form.name, metric_ids: form.metric_ids, include_impact: form.include_impact }),
    [form.name, form.metric_ids, form.include_impact],
  );
  const values = useSlackReportValues(content, quarter, open);

  const impactGroup = (metricGroups.data ?? []).find((g) => !g.parent_id && g.slug === "impact")?.name;
  const available = React.useMemo(() => (metrics.data ?? []).filter((m) => !m.archived), [metrics.data]);
  const chosen = new Set(form.metric_ids);
  const groups = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const out = new Map<string, ManualMetric[]>();
    available
      .filter((m) => !term || `${m.name} ${m.surface}`.toLowerCase().includes(term))
      .forEach((m) => out.set(m.surface || "Other", [...(out.get(m.surface || "Other") ?? []), m]));
    return Array.from(out.entries());
  }, [available, search]);

  const toggleMetric = (id: string, on: boolean) =>
    setForm((f) => {
      const next = new Set(f.metric_ids);
      if (on) next.add(id);
      else next.delete(id);
      // Kept in the order of Metrics → All metrics, which is how the report lists them.
      return { ...f, metric_ids: available.filter((m) => next.has(m.id)).map((m) => m.id) };
    });

  /** Puts an AI result in the box, keeping what was there so it can be undone. */
  const applyAiSummary = (result: { summary: string | null; note: string | null }) => {
    if (result.summary === null) {
      setSummaryNote(result.note);
      return false;
    }
    setPreviousSummary(form.summary?.trim() ? { summary: form.summary, byAi: form.summary_by_ai } : null);
    setForm((f) => ({ ...f, summary: result.summary, summary_quarter: quarter, summary_by_ai: true }));
    return true;
  };

  const onWriteSummary = async () => {
    setSummaryNote(null);
    try {
      applyAiSummary(await writeSummary.mutateAsync({ content, quarter }));
    } catch (err) {
      setSummaryNote(err instanceof Error ? err.message : "Couldn't write the summary. Try again.");
    }
  };

  const onReviseSummary = async () => {
    if (!instruction.trim() || !form.summary?.trim()) return;
    setSummaryNote(null);
    try {
      const result = await reviseSummary.mutateAsync({ content, quarter, summary: form.summary, instruction: instruction.trim() });
      if (applyAiSummary(result)) setInstruction("");
    } catch (err) {
      setSummaryNote(err instanceof Error ? err.message : "Couldn't change the summary. Try again.");
    }
  };

  const onUndoAi = () => {
    if (!previousSummary) return;
    setForm((f) => ({ ...f, summary: previousSummary.summary, summary_quarter: quarter, summary_by_ai: previousSummary.byAi }));
    setPreviousSummary(null);
  };

  const onEditSummary = (text: string) =>
    setForm((f) => ({
      ...f,
      summary: text,
      summary_quarter: quarter,
      // Typed from scratch, not edited from the AI's.
      summary_by_ai: f.summary !== null && f.summary_by_ai,
    }));

  const scheduledAt = /^\d{4}-\d{2}-\d{2}$/.test(schedule.date) ? new Date(`${schedule.date}T${schedule.time}:00`) : null;
  const staleSummary = form.include_summary && form.summary !== null && form.summary_quarter !== quarter;

  const nameError = !form.name.trim() ? "Give the report a title." : undefined;
  const channelError = !CHANNEL.test(form.channel.trim()) ? "Use the channel ID (it starts with C) or its name, like #design-system." : undefined;
  const scheduleError =
    sendWhen !== "later"
      ? undefined
      : !scheduledAt
        ? "Enter a date as YYYY-MM-DD."
        : scheduledAt.getTime() < Date.now()
          ? "Pick a time in the future."
          : undefined;
  const summaryError = staleSummary ? `This summary was written for ${form.summary_quarter}. Write it again for ${quarter}, or edit it.` : undefined;

  const upcoming = nextSend({
    enabled: true,
    send_day: form.send_day,
    send_hour: form.send_hour,
    last_sent_quarter: report?.last_sent_quarter ?? null,
    createdAt: report && report.mode === "quarterly" ? 0 : Date.now(),
  });

  const inputFor = (go: boolean): SlackReportInput => ({
    ...form,
    id: report?.id,
    name: form.name.trim(),
    channel: form.channel.trim(),
    mode: sendWhen === "quarterly" ? "quarterly" : "once",
    scheduled_at: sendWhen === "later" && scheduledAt ? scheduledAt.toISOString() : null,
    summary: form.include_summary && form.summary?.trim() ? form.summary : null,
    enabled: go && sendWhen !== "now",
  });

  const submit = async (go: boolean) => {
    if (nameError || channelError || (go && (scheduleError || summaryError))) {
      setShowErrors(true);
      return;
    }
    try {
      const { report: saved } = await save.mutateAsync(inputFor(go));
      if (go && sendWhen === "now") {
        const result = await send.mutateAsync({ id: saved.id });
        toast({ title: "Report sent", description: result.message });
      } else if (go && sendWhen === "later") {
        toast({ title: "Report scheduled", description: `It goes out on ${formatDateTime(saved.scheduled_at)}.` });
      } else if (go) {
        toast({
          title: "Schedule saved",
          description: saved.next_send ? `Next send: ${utcLabel(Date.parse(saved.next_send.at))}, for ${saved.next_send.quarter}.` : undefined,
        });
      } else {
        toast({ title: "Draft saved", description: saved.mode === "quarterly" ? "It's paused until you save the schedule." : undefined });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: go && sendWhen === "now" ? "Couldn't send the report" : "Couldn't save the report",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const primary =
    sendWhen === "now"
      ? { label: "Send now", icon: <PaperPlaneTilt size={16} />, disabled: !slackConnected }
      : sendWhen === "later"
        ? { label: "Schedule", icon: <CalendarCheck size={16} />, disabled: false }
        : { label: "Save schedule", icon: <CalendarCheck size={16} />, disabled: false };
  const busy = save.isPending || send.isPending;
  const chosenOutsideImpact = form.include_impact && impactGroup
    ? available.filter((m) => chosen.has(m.id) && m.surface !== impactGroup).length
    : form.metric_ids.length;

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={report ? "Edit report" : "New report"}
      width="min(1200px, 96vw)"
      minWidth="min(360px, 96vw)"
      className="sm:max-w-none"
      footer={
        <>
          <DesignButton variant="outlined" theme="muted" onClick={() => onOpenChange(false)}>
            Cancel
          </DesignButton>
          <DesignButton variant="outlined" theme="primary" icon={<FloppyDisk size={16} />} disabled={busy} onClick={() => submit(false)}>
            Save draft
          </DesignButton>
          <DesignButton
            variant="filled"
            theme="primary"
            icon={primary.icon}
            disabled={primary.disabled}
            isLoading={busy}
            onClick={() => submit(true)}
          >
            {primary.label}
          </DesignButton>
        </>
      }
    >
      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <div className="flex flex-col gap-6 min-w-0">
          <FormSection title="Message">
            <DesignInputText
              label="Title"
              placeholder="Bloom impact survey"
              helperText={`The quarter is added after it: "${form.name.trim() || "Title"}: ${quarter}".`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={showErrors && Boolean(nameError)}
              validation={showErrors ? nameError : undefined}
            />
            <DesignInputText
              label="Slack channel"
              placeholder="C0123ABCD"
              helperText="The channel ID, at the bottom of the channel's details in Slack. Invite the app first: in the channel, type /invite and the app's name."
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
              error={showErrors && Boolean(channelError)}
              validation={showErrors ? channelError : undefined}
            />
          </FormSection>

          <FormSection title="Content" description="The numbers are read from the app's data, so they always match it.">
            <DesignInputSelect
              label={sendWhen === "quarterly" ? "Preview with" : "Quarter"}
              options={quarters.map((q, i) => ({ value: q, label: i === 0 ? `${q} (in progress)` : q }))}
              value={quarter}
              onChange={(q) => set("quarter", q)}
            />
            <div className="rounded-md border border-border overflow-hidden">
              <DesignCell
                title="Impact section"
                bodyText="Every metric on the Impact page, including ones added later."
                controlType="toggle"
                checked={form.include_impact}
                onCheckedChange={(v) => set("include_impact", v)}
                styling="tight"
                showDivider
              />
              <DesignCell
                title="AI summary"
                bodyText="The trends that matter, with the numbers behind them, and what people said, including every one-off question. You can review and change it below."
                controlType="toggle"
                checked={form.include_summary}
                onCheckedChange={(v) => set("include_summary", v)}
                styling="tight"
              />
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <DesignAccordion
                size="narrow"
                title="Other metrics"
                subtitle={chosenOutsideImpact ? `${chosenOutsideImpact} chosen` : "None chosen"}
                isExpanded={metricsOpen}
                onToggle={setMetricsOpen}
              >
                <div className="flex flex-col gap-3">
                  <DesignInputText
                    aria-label="Search metrics"
                    placeholder="Search metrics"
                    prefix={<MagnifyingGlass size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {groups.length === 0 ? (
                    <DesignEmptyState
                      title={available.length ? "No metrics match" : "No metrics yet"}
                      body={available.length ? "Try another search." : "Add metrics in Metrics → All metrics first."}
                    />
                  ) : (
                    groups.map(([surface, list]) => (
                      <div key={surface}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{surface}</p>
                        <div className="rounded-md border border-border overflow-hidden">
                          {list.map((m, i) => {
                            const inImpact = form.include_impact && Boolean(impactGroup) && m.surface === impactGroup;
                            return (
                              <DesignCell
                                key={m.id}
                                title={m.name}
                                bodyText={inImpact ? "In the Impact section" : notByQuarter(m) ? "Not available by quarter" : undefined}
                                controlType="checkbox"
                                checked={inImpact || chosen.has(m.id)}
                                disabled={inImpact || (notByQuarter(m) && !chosen.has(m.id))}
                                onCheckedChange={(v) => toggleMetric(m.id, v)}
                                styling="tight"
                                showDivider={i < list.length - 1}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DesignAccordion>
            </div>
            <DesignInputTextArea
              label="Intro (optional)"
              helperText="Shown under the title, e.g. who to ask about the numbers."
              rows={3}
              maxLength={3000}
              value={form.intro}
              onChange={(e) => set("intro", e.target.value)}
            />
            {form.include_summary && (
              <div className="flex flex-col gap-2">
                <DesignInputTextArea
                  label="Summary"
                  placeholder={`Write it with AI, or type your own. Slack formatting: *bold*, and • for a bullet.`}
                  helperText={
                    sendWhen === "quarterly"
                      ? `For ${quarter}. Later quarters get a new AI summary when they're sent.`
                      : "Slack formatting: *bold*, and start a line with • for a bullet. Left empty, it's written when the report is sent."
                  }
                  rows={10}
                  maxLength={6000}
                  value={form.summary ?? ""}
                  onChange={(e) => onEditSummary(e.target.value)}
                  error={showErrors && Boolean(summaryError)}
                  validation={summaryError}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <DesignButton
                    variant="outlined"
                    theme="primary"
                    icon={<Sparkle size={16} />}
                    isLoading={writeSummary.isPending}
                    disabled={!quarter || reviseSummary.isPending}
                    onClick={onWriteSummary}
                  >
                    {form.summary?.trim() ? "Write again with AI" : "Write with AI"}
                  </DesignButton>
                  {previousSummary && (
                    <DesignButton variant="flat" theme="primary" icon={<ArrowCounterClockwise size={16} />} onClick={onUndoAi}>
                      Undo AI change
                    </DesignButton>
                  )}
                  <span className="text-xs text-muted-foreground">Takes up to a minute and uses Anthropic API credits.</span>
                </div>
                {form.summary?.trim() && (
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <DesignInputText
                        label="Ask for changes"
                        placeholder="e.g. Shorter, and lead with CSAT"
                        maxLength={1000}
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onReviseSummary();
                          }
                        }}
                      />
                    </div>
                    <DesignButton
                      variant="outlined"
                      theme="primary"
                      icon={<Sparkle size={16} />}
                      isLoading={reviseSummary.isPending}
                      disabled={!instruction.trim() || writeSummary.isPending}
                      onClick={onReviseSummary}
                    >
                      Apply
                    </DesignButton>
                  </div>
                )}
                {summaryNote && <DesignInfoBanner type="warning" title="The AI couldn't help this time" description={summaryNote} showCloseButton={false} />}
              </div>
            )}
          </FormSection>

          <FormSection title="When to send">
            <div role="radiogroup" aria-label="When to send" className="rounded-md border border-border overflow-hidden">
              {SEND_WHEN.map((option, i) => (
                <DesignCell
                  key={option.value}
                  title={option.title}
                  bodyText={option.body}
                  controlType="radio"
                  radioValue={option.value}
                  checked={sendWhen === option.value}
                  onCheckedChange={() => setSendWhen(option.value)}
                  styling="tight"
                  showDivider={i < SEND_WHEN.length - 1}
                />
              ))}
            </div>
            {sendWhen === "later" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DesignDateInput
                    label="Date"
                    value={schedule.date}
                    onChange={(date) => setSchedule((s) => ({ ...s, date }))}
                    error={showErrors && Boolean(scheduleError)}
                    validation={showErrors ? scheduleError : undefined}
                  />
                  <DesignInputSelect
                    label="Time"
                    options={TIME_OPTIONS}
                    value={schedule.time}
                    onChange={(time) => setSchedule((s) => ({ ...s, time }))}
                  />
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">In your time zone: {timeZoneLabel()}.</p>
              </>
            )}
            {sendWhen === "quarterly" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DesignInputSelect
                    label="Send on"
                    options={DAY_OPTIONS}
                    value={String(form.send_day)}
                    onChange={(v) => set("send_day", Number(v))}
                  />
                  <DesignInputSelect
                    label="At"
                    options={HOUR_OPTIONS}
                    value={String(form.send_hour)}
                    onChange={(v) => set("send_hour", Number(v))}
                  />
                </div>
                {upcoming && (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Next send: {utcLabel(upcoming.at)}, with the numbers for {upcoming.quarter}.
                  </p>
                )}
              </>
            )}
            {report?.last_run?.status === "failed" && (
              <DesignInfoBanner type="error" title="The last send failed" description={report.last_run.message} showCloseButton={false} />
            )}
          </FormSection>
        </div>

        <div className="flex flex-col gap-3 min-w-0 lg:sticky lg:top-4 lg:self-start">
          <h3 className="text-base font-medium text-foreground">How it looks in Slack</h3>
          {!slackConnected && (
            <DesignInfoBanner
              type="warning"
              title="Slack isn't connected"
              description="You can save and schedule, but nothing is posted until an admin connects Slack on the Slack reports page."
              showCloseButton={false}
            />
          )}
          {values.isError ? (
            <DesignInfoBanner
              type="error"
              title="Couldn't read the numbers"
              description={values.error instanceof Error ? values.error.message : "Try again."}
              showCloseButton={false}
            />
          ) : values.isLoading ? (
            <DesignLoader />
          ) : (
            <SlackMessagePreview
              name={form.name}
              quarter={quarter}
              intro={form.intro}
              summary={form.include_summary ? form.summary : null}
              summaryByAi={form.summary_by_ai}
              values={values.data ?? null}
            />
          )}
          {form.include_summary && !form.summary?.trim() && (
            <p className="text-xs text-muted-foreground">The AI summary shows here once it's written.</p>
          )}
        </div>
      </div>
    </DesignSideSheet>
  );
};
