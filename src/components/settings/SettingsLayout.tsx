import * as React from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignTooltip } from "@/components/ds/DesignTooltip";

/** Same look as the sidebar's collapse button (AppShell), mirrored for the right side. */
const toggleClass =
  "h-8 w-8 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

const STORAGE_KEY = "bloom.settings.contextPanel";

const readOpen = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
};

const saveOpen = (open: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "open" : "closed");
  } catch {
    // Private windows can refuse storage; the panel just opens again next time.
  }
};

export interface SettingsContextPanel {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

/**
 * The column layout of Settings pages, after the app's own section sidebar: a list of items,
 * the selected item in the main panel, and a collapsible context panel on the right. Whether
 * the context panel is open is remembered per person. Below xl it stays a slim rail that opens
 * the panel as a side sheet; on phone widths a button above the main column does that.
 */
export const SettingsLayout = ({
  list,
  main,
  context,
  fillMain = false,
  reveal,
  hideContextButton = false,
}: {
  list?: React.ReactNode;
  main: React.ReactNode;
  context?: SettingsContextPanel;
  /**
   * The main content sizes itself to the column and scrolls inside (e.g. a table with a pinned
   * header), instead of the whole column scrolling.
   */
  fillMain?: boolean;
  /** Changing it brings the context panel into view (opens it, or its sheet on smaller screens). */
  reveal?: number;
  /** No button for the context panel below xl: the page opens it itself (with `reveal`). */
  hideContextButton?: boolean;
}) => {
  const [open, setOpen] = React.useState(readOpen);
  const [sheet, setSheet] = React.useState(false);
  React.useEffect(() => {
    if (!reveal) return;
    if (window.matchMedia("(min-width: 1280px)").matches) setOpen(true);
    else setSheet(true);
  }, [reveal]);
  const toggle = () =>
    setOpen((was) => {
      saveOpen(!was);
      return !was;
    });
  // The rail expands the panel where it fits, otherwise opens the sheet.
  const expand = () => (window.matchMedia("(min-width: 1280px)").matches ? toggle() : setSheet(true));

  const columns = [
    list ? "280px" : null,
    "minmax(0,1fr)",
    context ? (open ? "320px" : "44px") : null,
  ].filter(Boolean);

  return (
    <>
      <div
        // On wide screens every column fits the window and scrolls on its own; the page doesn't scroll.
        className="grid grid-cols-1 gap-4 items-start lg:[grid-template-columns:var(--cols-lg)] xl:[grid-template-columns:var(--cols-xl)] xl:items-stretch xl:flex-1 xl:min-h-0"
        style={
          {
            "--cols-lg": [list ? "280px" : null, "minmax(0,1fr)", context ? "44px" : null].filter(Boolean).join(" "),
            "--cols-xl": columns.join(" "),
          } as React.CSSProperties
        }
      >
        {list && <div className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:rounded-[12px] xl:[&>*]:min-h-full">{list}</div>}
        <div
          // The main card reaches the bottom of the window even when its content is short.
          className={`min-w-0 flex flex-col gap-3 xl:min-h-0 ${
            fillMain ? "xl:overflow-hidden" : "xl:overflow-y-auto xl:rounded-[12px] xl:[&>*:last-child]:flex-[1_0_auto]"
          }`}
        >
          {context && !hideContextButton && (
            <div className="lg:hidden flex justify-end">
              <DesignButton variant="flat" theme="muted" size="small" icon={<PanelRightOpen className="w-4 h-4" />} onClick={() => setSheet(true)}>
                {context.title}
              </DesignButton>
            </div>
          )}
          {main}
        </div>
        {context && open && (
            <DesignCard className="hidden xl:flex flex-col overflow-hidden min-h-0">
              <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-medium text-foreground">{context.title}</h2>
                  {context.subtitle && <p className="text-[14px] text-muted-foreground mt-1">{context.subtitle}</p>}
                </div>
                <DesignTooltip content={`Collapse ${context.title}`} side="left">
                  <button type="button" className={`${toggleClass} shrink-0 -mr-1 -mt-1`} aria-label={`Collapse ${context.title}`} onClick={toggle}>
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </DesignTooltip>
              </div>
              <div className="px-4 pb-4 flex-1 overflow-y-auto min-h-0">{context.content}</div>
            </DesignCard>
        )}
        {context && (
            <DesignTooltip content={`Expand ${context.title}`} side="left">
              <button
                type="button"
                onClick={expand}
                aria-label={`Expand ${context.title}`}
                className={`hidden lg:flex ${open ? "xl:hidden" : ""} flex-col items-center gap-3 py-3 self-start rounded-[12px] border border-design-card-border bg-design-card text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors`}
              >
                <PanelRightOpen className="w-4 h-4" />
                <span className="text-[13px] [writing-mode:vertical-rl]">{context.title}</span>
              </button>
            </DesignTooltip>
        )}
      </div>

      {context && (
        <DesignSideSheet open={sheet} onOpenChange={setSheet} title={context.title} minWidth="360px">
          <div className="p-4">
            {context.subtitle && <p className="text-[14px] text-muted-foreground mb-3">{context.subtitle}</p>}
            {context.content}
          </div>
        </DesignSideSheet>
      )}
    </>
  );
};
