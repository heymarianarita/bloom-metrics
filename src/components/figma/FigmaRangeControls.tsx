import * as React from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignButton } from "@/components/ds/DesignButton";

interface FigmaRangeControlsProps {
  startDate: string;
  endDate: string;
  onApplyRange: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
  /** Called with the comparison quarter's range and label. */
  onCompareChange?: (startDate: string, endDate: string, label: string) => void;
}

const toISO = (date: Date) => date.toISOString().slice(0, 10);

/** Build the last N quarters, newest first: { value: "2026-Q3", start, end } */
const buildQuarters = (count = 8) => {
  const now = new Date();
  let year = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3);
  const list: { value: string; label: string; start: string; end: string }[] = [];
  for (let i = 0; i < count; i++) {
    const startMonth = q * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const endOfQuarter = new Date(Date.UTC(year, startMonth + 3, 0));
    const end = i === 0 && endOfQuarter > now ? now : endOfQuarter;
    const value = `${year}-Q${q + 1}`;
    list.push({
      value,
      label: i === 0 ? `${value} (current)` : value,
      start: toISO(start),
      end: toISO(end),
    });
    q -= 1;
    if (q < 0) {
      q = 3;
      year -= 1;
    }
  }
  return list;
};

export const FigmaRangeControls = ({
  startDate,
  endDate,
  onApplyRange,
  isLoading,
  onCompareChange,
}: FigmaRangeControlsProps) => {
  const quarters = React.useMemo(() => buildQuarters(8), []);
  const options = React.useMemo(
    () => [
      ...quarters.map((quarter) => ({ value: quarter.value, label: quarter.label })),
      { value: "custom", label: "Custom range" },
    ],
    [quarters]
  );

  const [preset, setPreset] = React.useState(quarters[0].value);
  const [compare, setCompare] = React.useState(quarters[1].value);
  const compareOptions = quarters.map((quarter) => ({ value: quarter.value, label: quarter.value }));

  const selectCompare = (value: string) => {
    setCompare(value);
    const quarter = quarters.find((item) => item.value === value);
    if (quarter) onCompareChange?.(quarter.start, quarter.end, quarter.value);
  };
  const [from, setFrom] = React.useState(startDate);
  const [to, setTo] = React.useState(endDate);

  React.useEffect(() => setFrom(startDate), [startDate]);
  React.useEffect(() => setTo(endDate), [endDate]);

  const selectPreset = (value: string) => {
    setPreset(value);
    if (value === "custom") return;
    const quarter = quarters.find((item) => item.value === value);
    if (!quarter) return;
    setFrom(quarter.start);
    setTo(quarter.end);
    onApplyRange(quarter.start, quarter.end);
    // Keep comparing with the quarter right before the selected one.
    const index = quarters.findIndex((item) => item.value === value);
    const prior = quarters[index + 1];
    if (prior) selectCompare(prior.value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DesignInputSelect
        className="w-[184px]"
        size="small"
        options={options}
        value={preset}
        icon={<CalendarBlank size={16} />}
        onChange={selectPreset}
      />
      {onCompareChange && preset !== "custom" && (
        <>
          <span className="text-[12px] text-muted-foreground whitespace-nowrap">vs</span>
          <DesignInputSelect
            className="w-[140px]"
            size="small"
            options={compareOptions}
            value={compare}
            onChange={selectCompare}
          />
        </>
      )}
      {preset === "custom" && (
        <>
          <DesignInputText
            className="w-[160px]"
            type="date"
            aria-label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-[12px] text-muted-foreground">to</span>
          <DesignInputText
            className="w-[160px]"
            type="date"
            aria-label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <DesignButton
            variant="filled"
            theme="primary"
            size="small"
            isLoading={isLoading}
            onClick={() => onApplyRange(from, to)}
          >
            Apply
          </DesignButton>
        </>
      )}
    </div>
  );
};

export default FigmaRangeControls;
