import * as React from "react";
import { ChartBar } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import type { FigmaComponentRow } from "@/hooks/useFigmaAnalytics";

interface Props {
  rows: FigmaComponentRow[];
  periodLabel: string;
}

/** Insertions and detachments per component, highest total on top. */
const FigmaComponentChart = ({ rows, periodLabel }: Props) => {
  const data = React.useMemo(
    () =>
      rows
        .map((r) => ({
          segment: r.name,
          Insertions: r.inserts ?? 0,
          Detachments: r.detaches ?? 0,
          __total: (r.inserts ?? 0) + (r.detaches ?? 0),
        }))
        .filter((r) => r.__total > 0)
        .sort((a, b) => b.__total - a.__total),
    [rows],
  );

  return (
    <DesignCard className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[16px] font-medium text-foreground">Adoption per component</p>
        <p className="text-[12px] text-muted-foreground">{periodLabel}</p>
      </div>
      <DesignSpacer size="small" />
      {data.length === 0 ? (
        <DesignEmptyState
          icon={<ChartBar size={40} />}
          title="No breakdown yet"
          body="No component was inserted or detached in this range."
        />
      ) : (
        <div style={{ height: Math.max(280, data.length * 28 + 60) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} vertical />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis
                type="category"
                dataKey="segment"
                tick={{ fontSize: 12 }}
                stroke="var(--muted-foreground)"
                width={140}
              />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                labelFormatter={(label, payload) => {
                  const total = (payload?.[0]?.payload as { __total?: number } | undefined)?.__total;
                  return total === undefined ? label : `${label} · Total ${total.toLocaleString()}`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Insertions" stackId="all" fill="var(--primary)" />
              <Bar dataKey="Detachments" stackId="all" fill="var(--destructive)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DesignCard>
  );
};

export default FigmaComponentChart;
