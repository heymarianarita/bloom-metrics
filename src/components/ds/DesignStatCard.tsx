import * as React from "react";
import { cn } from "@/lib/utils";
import { DesignCard } from "./DesignCard";
import { DesignBadge } from "./DesignBadge";
import { StatGroupContext } from "./DesignStatGroup";

export interface DesignStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label displayed at the top-left of the card */
  label: string;
  /** Main metric value */
  value: string;
  /** Unit shown after the value in smaller, muted text (e.g. "Inserts in code") */
  unit?: string;
  /** Change indicator text (e.g. "+12%") */
  change?: string;
  /** Whether the change is positive (true = success, false = error) */
  changeUp?: boolean;
  /** Icon displayed at the top-right of the card */
  icon?: React.ReactNode;
  /** Secondary line under the value (e.g. a year-over-year comparison) */
  note?: string;
  /** Small trend line drawn under the value */
  sparkline?: number[];
  /** Highlights the card when the change is beyond the chosen threshold */
  flagged?: boolean;
  /** Card variant passed to DesignCard */
  variant?: "default" | "lifted" | "elevated";
}

/** Tiny inline trend line — no axes, no labels. */
const Sparkline = ({ points, up }: { points: number[]; up: boolean }) => {
  const width = 96;
  const height = 24;
  const values = points.filter((value) => Number.isFinite(value));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={up ? "var(--btn-success)" : "var(--destructive)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DesignStatCard = React.forwardRef<HTMLDivElement, DesignStatCardProps>(
  (
    {
      className,
      label,
      value,
      unit,
      change,
      changeUp = true,
      icon,
      note,
      sparkline,
      flagged = false,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const inGroup = React.useContext(StatGroupContext);
    return (
      <DesignCard
        ref={ref}
        variant={variant}
        className={cn(
          "p-4",
          inGroup && "flex-1 flex flex-col justify-between border-0 rounded-none bg-transparent",
          flagged && "ring-1 ring-inset ring-[var(--destructive)]",
          className,
          flagged && "rounded-[6px]",
        )}
        {...props}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-end gap-2 flex-wrap">
              <span className="min-w-0 max-w-full text-[18px] font-[580] leading-6 text-foreground break-words">
                {value}
                {unit && <span className="inline-block max-w-full text-[14px] font-[375] text-muted-foreground ml-1 break-words">{unit}</span>}
              </span>
              {change && (
                <DesignBadge theme={changeUp ? "success" : "error"} styling="light">
                  {change}
                </DesignBadge>
              )}
            </div>
            {note && <p className="text-xs text-muted-foreground mt-1 truncate">{note}</p>}
          </div>
          {sparkline && <Sparkline points={sparkline} up={changeUp} />}
        </div>
      </DesignCard>
    );
  },
);
DesignStatCard.displayName = "DesignStatCard";

export { DesignStatCard };
