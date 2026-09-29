import * as React from "react";
import { ArrowClockwise, Key, Plus } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import CredentialsCard from "@/components/settings/CredentialsCard";
import MetricGroupPicker from "@/components/settings/MetricGroupPicker";
import { CREDENTIAL_DEFS, useCredentialStatus } from "@/hooks/useCredentials";
import { formatDateTime } from "@/lib/formatDate";

/**
 * The one layout every dynamic source uses (Settings → Dynamic sources), top to bottom:
 * header (name, description, credential and sync status) · "Shown in" · item list ·
 * "Add…" field · source-specific sections · credentials · last check + Sync now.
 * Everything saves as it changes; there is no Save button.
 */

/** Space above and below the divider between sections of a source card. */
export const SECTION_GAP = 16;

export interface SourceRun {
  status: string;
  ran_at: string;
  message: string;
}

export const SourceCard = ({
  title,
  description,
  credentialsKey,
  lastRun,
  onSync,
  syncing,
  children,
}: {
  title: string;
  description: string;
  /** Source key of its CREDENTIAL_DEFS; shows credential status and the Manage toggle. */
  credentialsKey?: string;
  lastRun?: SourceRun | null;
  /** Fetch from the source now; shows a Sync now button next to the last check. */
  onSync?: () => void;
  syncing?: boolean;
  children?: React.ReactNode;
}) => {
  const status = useCredentialStatus();
  const defs = CREDENTIAL_DEFS.filter((d) => d.sourceKey === credentialsKey);
  const readable = new Set((status.data ?? []).filter((c) => c.readable !== false).map((c) => c.name));
  const allSet = defs.length > 0 && defs.every((d) => readable.has(d.name));
  const noun = defs.length === 1 ? "Token" : "Credentials";
  const [showCredentials, setShowCredentials] = React.useState(false);

  return (
    <DesignCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[16px] font-medium text-foreground">{title}</h2>
          <p className="text-[14px] text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {defs.length > 0 && (
            <>
              <DesignBadge theme={allSet ? "success" : "error"} styling="light">
                <Key size={12} /> {allSet ? `${noun} set` : `${noun} missing`}
              </DesignBadge>
              {allSet && (
                <DesignButton
                  variant="outlined"
                  theme="muted"
                  size="small"
                  icon={<Key size={16} />}
                  onClick={() => setShowCredentials((v) => !v)}
                >
                  {showCredentials ? `Hide ${noun.toLowerCase()}` : `Manage ${noun.toLowerCase()}`}
                </DesignButton>
              )}
            </>
          )}
          {lastRun && (
            <DesignBadge theme={lastRun.status === "success" ? "success" : "error"} styling="light">
              {lastRun.status === "success" ? "Last sync OK" : "Last sync failed"}
            </DesignBadge>
          )}
        </div>
      </div>

      {children}

      {credentialsKey && defs.length > 0 && (showCredentials || !allSet) && (
        <CredentialsCard sourceKey={credentialsKey} />
      )}

      {(lastRun || onSync) && (
        <>
          <DesignDivider margin={SECTION_GAP} />
          <div className="flex items-center justify-between gap-3">
            <p className="flex-1 min-w-0 text-[12px] text-muted-foreground">
              {lastRun && `Last checked ${formatDateTime(lastRun.ran_at)} — ${lastRun.message}`}
            </p>
            {onSync && (
              <DesignButton
                variant="outlined"
                theme="muted"
                size="small"
                className="shrink-0"
                icon={<ArrowClockwise size={16} />}
                isLoading={syncing}
                onClick={onSync}
              >
                Sync now
              </DesignButton>
            )}
          </div>
        </>
      )}
    </DesignCard>
  );
};

/** A block inside a source card, under a divider, with an optional heading. */
export const SourceSection = ({
  title,
  description,
  aside,
  children,
}: {
  title?: string;
  description?: string;
  /** Right of the heading, e.g. counts. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <>
    <DesignDivider margin={SECTION_GAP} />
    {(title || aside) && (
      <>
        <div className="flex items-center justify-between gap-3">
          {title && <h3 className="text-[14px] font-medium text-foreground">{title}</h3>}
          {aside}
        </div>
        {description && <p className="text-[12px] text-muted-foreground mt-1">{description}</p>}
        <div className="h-2" aria-hidden="true" />
      </>
    )}
    {children}
  </>
);

/** Where a source's data shows up on the Metrics pages. */
export const SourceShownIn = ({
  value,
  onChange,
  helperText = "The Metrics tab that shows this source.",
}: {
  value: string | null | undefined;
  onChange: (groupId: string) => void;
  helperText?: string;
}) => (
  <SourceSection>
    <div className="max-w-[360px]">
      <MetricGroupPicker value={value} onChange={onChange} helperText={helperText} />
    </div>
  </SourceSection>
);

/** The items a source tracks (libraries, properties, reports…), or an empty state. */
export const SourceList = ({
  empty,
  children,
}: {
  empty: { icon: React.ReactNode; title: string; body: string };
  children: React.ReactNode;
}) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <SourceSection>
      {items.length === 0 ? (
        <DesignEmptyState icon={empty.icon} title={empty.title} body={empty.body} />
      ) : (
        <ul className="flex flex-col">{items}</ul>
      )}
    </SourceSection>
  );
};

/** One tracked item: name, detail line, flat actions, and settings shown below when open. */
export const SourceListItem = ({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** The item's settings, rendered under the row while it's open. */
  children?: React.ReactNode;
}) => (
  <li className="border-b border-border last:border-b-0">
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[16px] text-foreground truncate">{title}</p>
        {subtitle && <p className="text-[12px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
    {children && <div className="pb-3">{children}</div>}
  </li>
);

/** "Add a …" field under the list: paste an id or link, press Enter or Add. */
export const SourceAddField = ({
  label,
  placeholder,
  helperText,
  onAdd,
  busy,
}: {
  label: string;
  placeholder: string;
  helperText?: string;
  /** Resolves true when the value was added, so the field clears. */
  onAdd: (value: string) => Promise<boolean> | boolean;
  busy?: boolean;
}) => {
  const [value, setValue] = React.useState("");
  const add = async () => {
    if (!value.trim()) return;
    if (await onAdd(value.trim())) setValue("");
  };
  return (
    <>
      <div className="flex items-end gap-2 mt-2">
        <div className="flex-1 min-w-0">
          <DesignInputText
            label={label}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
        </div>
        <DesignButton variant="filled" theme="primary" size="medium" icon={<Plus size={16} />} isLoading={busy} onClick={add}>
          Add
        </DesignButton>
      </div>
      {helperText && <p className="text-[12px] leading-[16px] text-[var(--input-title)] mt-1">{helperText}</p>}
    </>
  );
};
