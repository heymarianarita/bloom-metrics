import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkle } from "@phosphor-icons/react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignButton } from "@/components/ds/DesignButton";
import { currentQuarter, recentQuarters } from "@/lib/quarters";
import { useAiTemplateMetrics, type AiTemplateRow } from "@/hooks/useAiTemplateMetrics";
import { useCanEdit, useSession } from "@/hooks/useAuth";

const AiPrototyping = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: isAdmin } = useCanEdit(user);
  const [quarter, setQuarter] = React.useState(currentQuarter());
  const { totals, prototypesDelta, shareDelta, rows, trend, isLoading } = useAiTemplateMetrics(quarter);

  const columns: DataTableColumn<AiTemplateRow>[] = [
    { key: "template", header: "Template", render: (row) => row.templateName },
    { key: "created", header: "Prototypes", sortable: true, render: (row) => row.prototypes_created.toLocaleString() },
    { key: "users", header: "Active users", render: (row) => row.active_users.toLocaleString() },
    { key: "teams", header: "Active teams", render: (row) => row.active_teams.toLocaleString() },
    { key: "share", header: "Share of total", render: (row) => `${row.shareOfTotal}%` },
  ];

  return (
    <>
      <DesignPageHeader
        title="AI prototyping templates"
        subtitle="How much the AI prototyping templates are used, quarter by quarter."
      />
      <DesignSpacer size="medium" />

      <div className="w-[200px]">
        <DesignInputSelect
          label="Quarter"
          size="medium"
          value={quarter}
          onChange={setQuarter}
          options={recentQuarters(8).map((q) => ({ value: q, label: q }))}
        />
      </div>
      <DesignSpacer size="medium" />

      {isLoading ? (
        <DesignLoader />
      ) : rows.length === 0 ? (
        <DesignCard className="p-4">
          <DesignEmptyState
            icon={<Sparkle size={48} />}
            title={`No entries for ${quarter}`}
            body="Template adoption is entered in Settings → Datasets, in the AI prototyping templates dataset."
            action={
              isAdmin ? (
                <DesignButton variant="filled" theme="primary" onClick={() => navigate("/settings/manual-metrics")}>
                  Enter data in Settings
                </DesignButton>
              ) : undefined
            }
          />
        </DesignCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DesignStatCard
              label="Prototypes created"
              value={totals.prototypes.toLocaleString()}
              change={prototypesDelta === null ? undefined : `${Math.abs(prototypesDelta)}%`}
              changeUp={(prototypesDelta ?? 0) >= 0}
            />
            <DesignStatCard label="Active users" value={totals.activeUsers.toLocaleString()} />
            <DesignStatCard label="Active teams" value={totals.activeTeams.toLocaleString()} />
            <DesignStatCard
              label="Built on Bloom templates"
              value={totals.bloomShare === null ? "—" : `${totals.bloomShare}%`}
              change={shareDelta === null ? undefined : `${Math.abs(shareDelta)} pp`}
              changeUp={(shareDelta ?? 0) >= 0}
            />
          </div>

          <DesignSpacer size="medium" />

          <DesignCard className="p-4">
            <h2 className="text-[18px] font-[580] text-foreground">Trend</h2>
            <p className="text-[14px] text-muted-foreground">
              Prototypes created per quarter, with the share built on Bloom templates.
            </p>
            <DesignSpacer size="small" />
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                  />
                  <ReTooltip />
                  <Bar yAxisId="left" dataKey="prototypes" name="Prototypes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bloomShare"
                    name="Bloom share (%)"
                    stroke="var(--btn-success)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </DesignCard>

          <DesignSpacer size="medium" />

          <DesignCard className="p-4">
            <h2 className="text-[18px] font-[580] text-foreground">Per template — {quarter}</h2>
            <DesignSpacer size="small" />
            <DesignDataTable
              columns={columns}
              data={rows}
              rowKey={(row) => row.id}
              searchPlaceholder="Search templates"
            />
          </DesignCard>
        </>
      )}
    </>
  );
};

export default AiPrototyping;
