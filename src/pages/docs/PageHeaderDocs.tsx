import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Clock, ShieldCheck, MessageSquare, Columns3 } from "lucide-react";

const propsList = [
  { name: "title", type: "string", description: "Page title — should be concise and fit a single line. Truncated with a tooltip on overflow." },
  { name: "statusIndicator", type: "ReactNode", description: "Status indicator (e.g. Badge) rendered inline with the title." },
  { name: "subtitle", type: "string", description: "Additional information below the title. Uses subtitle style with muted colour." },
  { name: "breadcrumbs", type: "BreadcrumbItem[]", description: "Breadcrumb trail. Last item is the current page (non-clickable)." },
  { name: "primaryAction", type: "ReactNode", description: "Primary action button, placed right-most. Should use filled primary style." },
  { name: "secondaryActions", type: "ReactNode", description: "Secondary / tertiary actions placed left of the primary action. Use outlined or flat styles." },
  { name: "iconActions", type: "ReactNode", description: "Icon-button group rendered before the text action buttons." },
  { name: "showBackChevron", type: "boolean", default: "true", description: "Show a back chevron before the breadcrumbs." },
  { name: "onBackClick", type: "() => void", description: "Click handler for the back chevron. Defaults to the first breadcrumb's onClick." },
];

const breadcrumbItemProps = [
  { name: "label", type: "string", description: "Display label for the breadcrumb segment." },
  { name: "onClick", type: "() => void", description: "Click handler. Omit for the current (last) crumb." },
];

const PageHeaderDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader
      title="PageHeader"
      description="Page-level header with breadcrumbs, title, status indicator, additional info, and action buttons."
    />

    {/* ── Design guidelines ── */}
    <div className="mb-10 space-y-6">
      <h2 className="text-xl font-semibold text-docs-heading">Design Guidelines</h2>

      <div className="overflow-x-auto rounded-lg border border-docs-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-docs-border bg-docs-code">
              <th className="px-4 py-3 text-left font-semibold text-docs-heading w-[160px]">Element</th>
              <th className="px-4 py-3 text-left font-semibold text-docs-heading">Guidelines</th>
            </tr>
          </thead>
          <tbody className="text-docs-muted">
            <tr className="border-b border-docs-border">
              <td className="px-4 py-3 font-medium text-docs-heading align-top">Page title</td>
              <td className="px-4 py-3">
                <ul className="list-disc ml-4 space-y-1">
                  <li>Should be left-aligned and concise to fit into a single line.</li>
                  <li>Should be truncated, with the full text available as a tooltip on hover if it doesn't fit into a single line.</li>
                  <li>Use heading font style (22px / weight 580).</li>
                </ul>
              </td>
            </tr>
            <tr className="border-b border-docs-border">
              <td className="px-4 py-3 font-medium text-docs-heading align-top">Additional information (optional)</td>
              <td className="px-4 py-3">
                <ul className="list-disc ml-4 space-y-1">
                  <li>Status indicators (e.g. Pending, In Review, Ready) should be inline with the title.</li>
                  <li>Additional information should be secondary in visual weight. Use smaller typography, such as subtitle style with muted colour so it does not compete with the title or primary actions.</li>
                </ul>
              </td>
            </tr>
            <tr className="border-b border-docs-border">
              <td className="px-4 py-3 font-medium text-docs-heading align-top">Actions (optional)</td>
              <td className="px-4 py-3">
                <ul className="list-disc ml-4 space-y-1">
                  <li>The primary action is placed on the right side of the header using a primary themed filled button.</li>
                  <li>Never place two primary buttons side by side as this creates ambiguity and increases cognitive load for the user.</li>
                  <li>Secondary and tertiary actions should be positioned to the left of the primary action using outlined or flat button styles.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-docs-heading align-top">Breadcrumbs (optional)</td>
              <td className="px-4 py-3">
                <ul className="list-disc ml-4 space-y-1">
                  <li>Should be used in deeply nested views, detail pages, and multi-step flows where the page title alone does not convey the user's location.</li>
                  <li>Breadcrumbs alone do not convey the page title. The page title must always be present.</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* ── Examples ── */}
    <ComponentSection title="Full example" description="Breadcrumbs, title with status badge, subtitle, icon actions, and primary/secondary buttons.">
      <div className="w-full bg-spacing-bg p-6 rounded-lg">
        <DesignPageHeader
          breadcrumbs={[
            { label: "Instant transfer alerts", onClick: () => {} },
            { label: "98.23€ transfer" },
          ]}
          title="98.23€ transfer"
          statusIndicator={
            <DesignBadge theme="highlight" styling="light" icon={<Clock className="w-3 h-3" />}>
              In review
            </DesignBadge>
          }
          subtitle="Created 14 Mar 2026"
          iconActions={
            <>
              <DesignTooltip content="Approve" side="bottom">
                <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background transition-colors">
                  <ShieldCheck className="w-[18px] h-[18px]" />
                </button>
              </DesignTooltip>
              <DesignTooltip content="Comments" side="bottom">
                <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background transition-colors">
                  <MessageSquare className="w-[18px] h-[18px]" />
                </button>
              </DesignTooltip>
              <DesignTooltip content="Details" side="bottom">
                <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-background transition-colors">
                  <Columns3 className="w-[18px] h-[18px]" />
                </button>
              </DesignTooltip>
            </>
          }
          secondaryActions={
            <DesignButton variant="outlined" theme="primary" size="medium">
              Assign
            </DesignButton>
          }
          primaryAction={
            <DesignButton variant="filled" theme="primary" size="medium">
              Resolve...
            </DesignButton>
          }
        />
      </div>
    </ComponentSection>

    <ComponentSection title="Title only" description="Minimal page header with just a title.">
      <div className="w-full bg-spacing-bg p-6 rounded-lg">
        <DesignPageHeader title="Dashboard" />
      </div>
    </ComponentSection>

    <ComponentSection title="Title with status" description="Title with an inline status badge and subtitle.">
      <div className="w-full bg-spacing-bg p-6 rounded-lg">
        <DesignPageHeader
          title="Order #ORD-1236 · €32.50"
          statusIndicator={
            <DesignBadge theme="error" styling="light" icon={<Clock className="w-3 h-3" />}>
              Flagged
            </DesignBadge>
          }
          subtitle="Placed by Lisa M. · Created 14 Mar 2026"
        />
      </div>
    </ComponentSection>

    <ComponentSection title="With breadcrumbs" description="Breadcrumb navigation above the title.">
      <div className="w-full bg-spacing-bg p-6 rounded-lg">
        <DesignPageHeader
          breadcrumbs={[
            { label: "Flagged orders", onClick: () => {} },
            { label: "Order #ORD-1236" },
          ]}
          title="Order #ORD-1236 · €32.50"
          subtitle="Placed by Lisa M. · Created 14 Mar 2026"
          primaryAction={
            <DesignButton variant="filled" theme="primary" size="medium">
              Resolve...
            </DesignButton>
          }
        />
      </div>
    </ComponentSection>

    {/* ── Usage ── */}
    <div className="mt-10 mb-6">
      <h2 className="text-xl font-semibold text-docs-heading mb-4">Usage</h2>
      <CodeBlock code={`import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { Clock } from "lucide-react";

<DesignPageHeader
  breadcrumbs={[
    { label: "Flagged orders", onClick: () => navigate(-1) },
    { label: "Order #ORD-1236" },
  ]}
  title="Order #ORD-1236 · €32.50"
  statusIndicator={
    <DesignBadge theme="error" styling="light" icon={<Clock className="w-3 h-3" />}>
      Flagged
    </DesignBadge>
  }
  subtitle="Placed by Lisa M. · Created 14 Mar 2026"
  secondaryActions={
    <DesignButton variant="outlined" theme="primary" size="medium">Assign</DesignButton>
  }
  primaryAction={
    <DesignButton variant="filled" theme="primary" size="medium">Resolve...</DesignButton>
  }
/>`} />
    </div>

    {/* ── Props ── */}
    <div className="mt-10 mb-6">
      <h2 className="text-xl font-semibold text-docs-heading mb-4">Props</h2>
      <PropsTable props={propsList} />
    </div>

    <div className="mt-6 mb-6">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">BreadcrumbItem</h2>
      <PropsTable props={breadcrumbItemProps} />
    </div>
  </div>
);

export default PageHeaderDocs;
