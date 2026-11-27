import * as React from "react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignDivider } from "@/components/ds/DesignDivider";
import type { SlackReportValues } from "@/hooks/useSlackReports";
import {
  AI_SUMMARY_NOTE,
  defaultTitle,
  IMPACT_HEADING,
  metricLine,
  metricsLegend,
  OPEN_APP_LABEL,
  OTHER_METRICS_HEADING,
} from "../../../../server/slackReports/message.ts";

const unescape = (text: string) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Slack's *bold* inside a line of mrkdwn. */
const Mrkdwn = ({ text }: { text: string }) => (
  <>
    {text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
      /^\*[^*\n]+\*$/.test(part) ? (
        <span key={i} className="font-semibold">
          {unescape(part.slice(1, -1))}
        </span>
      ) : (
        <React.Fragment key={i}>{unescape(part)}</React.Fragment>
      ),
    )}
  </>
);

/** The message laid out the way Slack shows it: title, intro, summary, one line per metric, link button. */
export const SlackMessagePreview = ({
  name,
  quarter,
  intro,
  summary,
  summaryByAi,
  values,
}: {
  name: string;
  quarter: string;
  intro: string;
  /** null or empty: no summary. */
  summary: string | null;
  summaryByAi: boolean;
  values: SlackReportValues | null;
}) => {
  const groups = values
    ? [
        { heading: IMPACT_HEADING, metrics: values.impact },
        { heading: values.impact.length ? OTHER_METRICS_HEADING : null, metrics: values.metrics },
      ].filter((g) => g.metrics.length)
    : [];
  return (
    <DesignCard className="p-4 flex flex-col gap-3">
      <h3 className="text-lg font-semibold text-foreground break-words">{defaultTitle(name.trim() || "Untitled report", quarter)}</h3>
      {intro.trim() && (
        <p className="text-sm text-foreground whitespace-pre-line break-words">
          <Mrkdwn text={intro.trim()} />
        </p>
      )}
      {summary?.trim() && (
        <>
          <div className="flex flex-col gap-1">
            {summary
              .split("\n")
              .filter((l) => l.trim())
              .map((line, i) => (
                <p key={i} className="text-sm text-foreground break-words">
                  <Mrkdwn text={line} />
                </p>
              ))}
          </div>
          {summaryByAi && <p className="text-xs text-muted-foreground">{AI_SUMMARY_NOTE}</p>}
        </>
      )}
      {values && groups.length > 0 && (
        <>
          <DesignDivider margin={4} />
          {groups.map((group) => (
            <div key={group.heading ?? "metrics"} className="flex flex-col gap-1">
              {group.heading && <p className="text-sm font-semibold text-foreground">{group.heading}</p>}
              <ul className="flex flex-col gap-1">
                {group.metrics.map((m) => (
                  <li key={m.id} className="text-sm text-foreground break-words">
                    <Mrkdwn text={metricLine(m, values.quarter, values.previousQuarter)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{metricsLegend(values.previousQuarter)}</p>
        </>
      )}
      <div>
        <DesignButton variant="outlined" theme="muted" url="/metrics/impact">
          {OPEN_APP_LABEL}
        </DesignButton>
      </div>
    </DesignCard>
  );
};
