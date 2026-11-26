import { bucketLabel, bucketRange } from "../shared/periods.ts";

/**
 * When quarterly Slack reports go out. A report on a quarter is sent `sendDay` days after the
 * quarter ends (day 1 is the first day of the next quarter) at `sendHour`:00 UTC. No imports
 * beyond the period helpers, so the app can show the same dates the server uses.
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Up to day 28, so a quarter's report always goes out in the first month of the next one. */
export const MAX_SEND_DAY = 28;

/** A missed send (the server was down) still goes out this long after its time, not later. */
export const CATCH_UP_MS = 2 * DAY;

export const quarterOf = (ms: number) => bucketLabel(ms, "quarterly");

/** 2026-Q3 → 2026-Q2. */
export const previousQuarter = (quarter: string) => {
  const range = bucketRange(quarter, "quarterly");
  if (!range) throw new Error(`Not a quarter: ${quarter}`);
  return quarterOf(range.start - 1);
};

/** The last `count` quarters that have ended, newest first. */
export const finishedQuarters = (count: number, now = Date.now()) => {
  const out = [previousQuarter(quarterOf(now))];
  while (out.length < count) out.push(previousQuarter(out[out.length - 1]));
  return out;
};

/** Quarters a report can be about: the one in progress, then the last `finished` ones. */
export const reportQuarters = (finished = 4, now = Date.now()) => [quarterOf(now), ...finishedQuarters(finished, now)];

/** A one-off report at its time: send it, or say it was missed when the server was down too long. */
export const onceStatus = (report: { enabled: boolean; scheduledAt: number | null; sentAt: number | null }, now = Date.now()) => {
  if (!report.enabled || report.scheduledAt === null || report.sentAt !== null || now < report.scheduledAt) return null;
  return now >= report.scheduledAt + CATCH_UP_MS ? "missed" : "due";
};

/** The moment the report on `quarter` is sent. */
export const sendTimeFor = (quarter: string, sendDay: number, sendHour: number) => {
  const range = bucketRange(quarter, "quarterly");
  if (!range) throw new Error(`Not a quarter: ${quarter}`);
  return range.end + (sendDay - 1) * DAY + sendHour * HOUR;
};

export interface ScheduleState {
  enabled: boolean;
  send_day: number;
  send_hour: number;
  last_sent_quarter: string | null;
  /** When the report was set up, in ms: quarters due before then are never sent on their own. */
  createdAt: number;
}

/** The quarter to send right now, or null when nothing is due. */
export const dueQuarter = (report: ScheduleState, now = Date.now()) => {
  if (!report.enabled) return null;
  const quarter = previousQuarter(quarterOf(now));
  const at = sendTimeFor(quarter, report.send_day, report.send_hour);
  if (now < at || now >= at + CATCH_UP_MS || report.createdAt > at) return null;
  if (report.last_sent_quarter && report.last_sent_quarter >= quarter) return null;
  return quarter;
};

/** The next scheduled send, or null when the schedule is off. */
export const nextSend = (report: ScheduleState, now = Date.now()) => {
  if (!report.enabled) return null;
  const pending = previousQuarter(quarterOf(now));
  const pendingAt = sendTimeFor(pending, report.send_day, report.send_hour);
  const pendingOpen =
    (!report.last_sent_quarter || report.last_sent_quarter < pending) &&
    report.createdAt <= pendingAt &&
    now < pendingAt + CATCH_UP_MS;
  if (pendingOpen) return { quarter: pending, at: Math.max(pendingAt, now) };
  const quarter = quarterOf(now);
  return { quarter, at: sendTimeFor(quarter, report.send_day, report.send_hour) };
};

/** 1767430800000 → "2027-01-03 09:00 UTC". */
export const utcLabel = (ms: number) => `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;
