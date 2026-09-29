/** Every date shown in the app is YYYY-MM-DD; timestamps add the local time as HH:mm. */

type DateValue = string | number | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, "0");

const toDate = (value: DateValue) => {
  if (value === null || value === undefined || value === "") return null;
  // A bare YYYY-MM-DD is a calendar day, not a UTC midnight: read it as local.
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** 2026-09-29, or "—" when there is no date. */
export const formatDate = (value: DateValue) => {
  const date = toDate(value);
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : "—";
};

/** 2026-09-29 14:05, or "—" when there is no date. */
export const formatDateTime = (value: DateValue) => {
  const date = toDate(value);
  return date ? `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}` : "—";
};
