import * as React from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignImage } from "@/components/ds/DesignImage";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import {
  useQualitativeAnswers,
  type QualitativeAnswer,
} from "@/hooks/useQualitative";
import { pluralLabel } from "@/lib/pluralLabel";

const ALL = "all";
const NO_THEME = "none";

/** "jane.doe@example.com" → "Jane Doe". */
const nameOf = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toLocaleUpperCase() + part.slice(1))
    .join(" ");

/** A qualitative question's answers in one period, as people wrote them. */
export const AnswersSheet = ({
  open,
  onOpenChange,
  sourceId,
  title,
  period,
  themes,
  breakdowns,
  filters,
  nonAnswers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  title: string;
  period: string | undefined;
  themes: { id: string; name: string }[];
  /** The breakdowns the answers can be filtered by (e.g. Role, Team). */
  breakdowns: string[];
  /** The page's filters (e.g. Role: Web Engineer); the sheet opens with them and can change them. */
  filters: Record<string, string>;
  /** How many had nothing to add under the page's filters; they aren't listed. */
  nonAnswers: number;
}) => {
  const [search, setSearch] = React.useState("");
  const [theme, setTheme] = React.useState(ALL);
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const answers = useQualitativeAnswers(sourceId, period, open);

  const pageFilters = Object.fromEntries(
    Object.entries(filters).filter(([label]) => breakdowns.includes(label)),
  );
  const pageFiltersKey = JSON.stringify(pageFilters);
  React.useEffect(() => {
    if (open) setPicked(JSON.parse(pageFiltersKey));
  }, [open, pageFiltersKey]);

  React.useEffect(() => {
    setSearch("");
    setTheme(ALL);
  }, [sourceId, period]);

  const all = answers.data?.answers ?? [];
  const matches = (a: QualitativeAnswer, except?: string) =>
    Object.entries(picked).every(
      ([label, value]) => label === except || a.segments[label] === value,
    );
  const inSegment = all.filter((a) => matches(a));
  const onPageFilters = JSON.stringify(picked) === pageFiltersKey;
  const breakdownOptions = breakdowns
    .map((label) => {
      const counts = new Map<string, number>();
      for (const a of all) {
        const value = a.segments[label];
        if (value && matches(a, label))
          counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      if (picked[label] && !counts.has(picked[label]))
        counts.set(picked[label], 0);
      return { label, counts };
    })
    .filter((b) => b.counts.size > 1 || picked[b.label]);
  const themeName = new Map(themes.map((t) => [t.id, t.name]));
  const counts = new Map<string, number>();
  for (const a of inSegment)
    for (const id of a.themes) counts.set(id, (counts.get(id) ?? 0) + 1);
  const withoutTheme = inSegment.filter((a) => a.themes.length === 0).length;

  const needle = search.trim().toLowerCase();
  const shown = inSegment.filter(
    (a) =>
      (theme === ALL ||
        (theme === NO_THEME
          ? a.themes.length === 0
          : a.themes.includes(theme))) &&
      (!needle ||
        a.text.toLowerCase().includes(needle) ||
        nameOf(a.respondent).toLowerCase().includes(needle)),
  );
  const filtering = theme !== ALL || needle !== "";

  return (
    <DesignSideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width="min(720px, 92vw)"
      minWidth="min(360px, 92vw)"
      className="sm:max-w-none"
    >
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          {[
            period,
            answers.data
              ? `${inSegment.length} answer${inSegment.length === 1 ? "" : "s"}`
              : null,
            nonAnswers > 0 && onPageFilters
              ? `${nonAnswers} who had nothing to add aren't listed`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {answers.isLoading ? (
          <div className="flex justify-center py-12">
            <DesignLoader size="medium" />
          </div>
        ) : answers.error ? (
          <DesignEmptyState
            title="Couldn't load the answers"
            body={
              answers.error instanceof Error ? answers.error.message : undefined
            }
            action={
              <DesignButton
                variant="outlined"
                theme="primary"
                size="small"
                onClick={() => answers.refetch()}
              >
                Try again
              </DesignButton>
            }
          />
        ) : all.length === 0 ? (
          <DesignEmptyState
            title="No answers"
            body={`Nobody wrote an answer in ${period ?? "this period"}.`}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <DesignInputText
                size="small"
                placeholder={
                  all.some((a) => a.respondent)
                    ? "Search answers or names"
                    : "Search answers"
                }
                aria-label="Search answers"
                prefix={<MagnifyingGlass size={16} aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {themes.length > 0 && (
                  <DesignInputSelect
                    className="min-w-0 flex-1 basis-60"
                    size="small"
                    value={theme}
                    onChange={setTheme}
                    options={[
                      { value: ALL, label: "All themes" },
                      ...themes
                        .filter((t) => counts.has(t.id) || t.id === theme)
                        .sort(
                          (a, b) =>
                            (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
                        )
                        .map((t) => ({
                          value: t.id,
                          label: `${t.name} (${counts.get(t.id) ?? 0})`,
                        })),
                      ...(withoutTheme > 0 || theme === NO_THEME
                        ? [
                            {
                              value: NO_THEME,
                              label: `No theme (${withoutTheme})`,
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
                {breakdownOptions.map(({ label, counts: values }) => (
                  <DesignInputSelect
                    key={label}
                    className="min-w-0 flex-1 basis-40"
                    size="small"
                    value={picked[label] ?? ALL}
                    onChange={(value) =>
                      setPicked((current) => {
                        const { [label]: _dropped, ...rest } = current;
                        return value === ALL
                          ? rest
                          : { ...rest, [label]: value };
                      })
                    }
                    options={[
                      { value: ALL, label: `All ${pluralLabel(label)}` },
                      ...[...values]
                        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                        .map(([value, n]) => ({
                          value,
                          label: `${value} (${n})`,
                        })),
                    ]}
                  />
                ))}
              </div>
            </div>
            {filtering && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {shown.length} of {inSegment.length} answers
              </p>
            )}
            {shown.length === 0 ? (
              <DesignEmptyState
                title="No matching answers"
                body="Try other words or other filters."
                action={
                  <DesignButton
                    variant="outlined"
                    theme="primary"
                    size="small"
                    onClick={() => {
                      setSearch("");
                      setTheme(ALL);
                      setPicked({});
                    }}
                  >
                    Clear filters
                  </DesignButton>
                }
              />
            ) : (
              <DesignCard radius="small">
                <ul className="flex flex-col divide-y divide-border">
                  {shown.map((a) => {
                    const context = Object.values(a.segments).filter(
                      (v) => v && v !== "Unknown",
                    );
                    return (
                      <li key={a.id} className="px-4 py-4">
                        {(a.respondent || context.length > 0) && (
                          <div className="flex items-center gap-2">
                            {a.respondent && (
                              <DesignImage
                                className="w-6 shrink-0"
                                src={a.avatar || null}
                                alt=""
                                styling="circle"
                              />
                            )}
                            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                              {a.respondent && (
                                <span
                                  className="text-sm text-foreground"
                                  title={a.respondent}
                                >
                                  {nameOf(a.respondent)}
                                </span>
                              )}
                              {context.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {context.join(" · ")}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground">
                          {a.text}
                        </p>
                        {a.themes.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {a.themes.map((id) => (
                              <DesignBadge
                                key={id}
                                theme="muted"
                                styling="light"
                              >
                                {themeName.get(id) ?? id}
                              </DesignBadge>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </DesignCard>
            )}
          </>
        )}
      </div>
    </DesignSideSheet>
  );
};
