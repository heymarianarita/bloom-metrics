import { useState } from "react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignCell } from "@/components/ds/DesignCell";
import { User, Settings, Bell } from "lucide-react";

const propsData = [
  { name: "open", type: "boolean", default: "false", description: "Controlled open state." },
  { name: "onOpenChange", type: "(open: boolean) => void", default: "—", description: "Called when the open state changes." },
  { name: "title", type: "string", default: "—", description: "Title displayed in the header bar." },
  { name: "width", type: "string", default: '"33.33vw"', description: "CSS width of the sheet panel." },
  { name: "minWidth", type: "string", default: '"360px"', description: "CSS min-width of the sheet panel." },
  { name: "showOverlay", type: "boolean", default: "false", description: "Whether to show the dark overlay backdrop." },
  { name: "children", type: "ReactNode", default: "—", description: "Scrollable body content." },
  { name: "footer", type: "ReactNode", default: "—", description: "Footer content. If omitted, no footer is rendered." },
  { name: "className", type: "string", default: "—", description: "Additional className for the sheet container." },
];

const anatomyItems = [
  { name: "Overlay", description: "Optional dark backdrop behind the sheet. Transparent by default." },
  { name: "Container", description: "Fixed panel, slides in from the right. 33.33vw wide, min 360px." },
  { name: "Header", description: "60px bar with title (18px/580 weight) and close button (X icon)." },
  { name: "Body", description: "Flex-1 scrollable area for content." },
  { name: "Footer", description: "Optional 85px bar with border-top, right-aligned actions." },
];

const specRows = [
  { spec: "Header height", value: "60px" },
  { spec: "Footer height", value: "85px" },
  { spec: "Default width", value: "33.33vw" },
  { spec: "Min width", value: "360px" },
  { spec: "Padding (header/footer)", value: "0 16px (px-4)" },
  { spec: "Title font", value: "18px / weight 580" },
  { spec: "Close button", value: "32×32px, 6px radius" },
  { spec: "Border", value: "1px left, var(--border)" },
  { spec: "Animation", value: "Slide in 500ms, slide out 300ms" },
];

const SideSheetDocs = () => {
  const [basicOpen, setBasicOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Side Sheet"
        description="A slide-in panel anchored to the right side of the viewport. Used for filters, detail views, forms, and secondary workflows without navigating away from the current page."
      />

      {/* Default example */}
      <ComponentSection title="Default">
        <DesignButton variant="filled" theme="primary" size="medium" onClick={() => setBasicOpen(true)}>
          Open Side Sheet
        </DesignButton>

        <DesignSideSheet open={basicOpen} onOpenChange={setBasicOpen} title="Side Sheet">
          <div className="p-4 space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              This is a basic side sheet with a title, scrollable body, and no footer.
            </p>
            <DesignCell title="Profile" subtitle="Edit your info" icon={User} showChevron />
            <DesignCell title="Settings" subtitle="App preferences" icon={Settings} showChevron />
            <DesignCell title="Notifications" subtitle="Manage alerts" icon={Bell} showChevron />
          </div>
        </DesignSideSheet>
      </ComponentSection>

      {/* With footer */}
      <ComponentSection title="With Footer (Filter pattern)">
        <DesignButton variant="outlined" theme="primary" size="medium" onClick={() => setFilterOpen(true)}>
          Open Filters
        </DesignButton>

        <DesignSideSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          title="All filters"
          footer={
            <>
              <DesignButton variant="outlined" theme="muted" size="medium" onClick={() => setFilterOpen(false)}>Reset</DesignButton>
              <DesignButton variant="filled" theme="primary" size="medium" onClick={() => setFilterOpen(false)}>Show results</DesignButton>
            </>
          }
        >
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] text-[var(--muted-foreground)] font-[375]">Status</label>
              <DesignInputSelect
                placeholder="Select status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "pending", label: "Pending" },
                  { value: "closed", label: "Closed" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] text-[var(--muted-foreground)] font-[375]">Category</label>
              <DesignInputSelect
                placeholder="Select category"
                options={[
                  { value: "clothing", label: "Clothing" },
                  { value: "shoes", label: "Shoes" },
                  { value: "accessories", label: "Accessories" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] text-[var(--muted-foreground)] font-[375]">Price range</label>
              <DesignInputSelect
                placeholder="Select range"
                options={[
                  { value: "0-20", label: "Under €20" },
                  { value: "20-50", label: "€20 – €50" },
                  { value: "50+", label: "Over €50" },
                ]}
              />
            </div>
          </div>
        </DesignSideSheet>
      </ComponentSection>

      {/* Detail view */}
      <ComponentSection title="Detail View">
        <DesignButton variant="outlined" theme="primary" size="medium" onClick={() => setDetailOpen(true)}>
          View Details
        </DesignButton>

        <DesignSideSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title="Order #VNT-20240100"
          showOverlay
          footer={
            <>
              <DesignButton variant="outlined" theme="muted" size="medium" onClick={() => setDetailOpen(false)}>Close</DesignButton>
              <DesignButton variant="filled" theme="primary" size="medium" onClick={() => setDetailOpen(false)}>Save</DesignButton>
            </>
          }
        >
          <div className="p-4 space-y-4">
            <DesignInputText label="Buyer" value="Emma Johnson" readOnly />
            <DesignInputText label="Item" value="Zara Wool Coat – Size M" readOnly />
            <DesignInputText label="Price" value="€42.50" readOnly />
            <DesignInputText label="Shipping" value="DHL Express" readOnly />
            <DesignInputText label="Tracking number" value="TR9283740" readOnly />
            <DesignInputText label="Payment" value="Visa •••• 4242" readOnly />
          </div>
        </DesignSideSheet>
      </ComponentSection>

      {/* Anatomy */}
      <ComponentSection title="Anatomy">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium w-[160px]">Element</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {anatomyItems.map((item) => (
              <tr key={item.name} className="border-b border-border last:border-0">
                <td className="py-2 font-medium text-foreground">{item.name}</td>
                <td className="py-2 text-muted-foreground">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ComponentSection>

      {/* Design specs */}
      <ComponentSection title="Design specs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium w-[200px]">Property</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {specRows.map((row) => (
              <tr key={row.spec} className="border-b border-border last:border-0">
                <td className="py-2 font-medium text-foreground">{row.spec}</td>
                <td className="py-2 text-muted-foreground font-mono text-xs">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ComponentSection>

      {/* Props */}
      <ComponentSection title="Props">
        <PropsTable props={propsData} />
      </ComponentSection>

      {/* Usage */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignSideSheet } from "@/components/ds/DesignSideSheet";
import { DesignButton } from "@/components/ds/DesignButton";

const [open, setOpen] = useState(false);

{/* Basic */}
<DesignButton onClick={() => setOpen(true)}>Open</DesignButton>
<DesignSideSheet open={open} onOpenChange={setOpen} title="Filters">
  <div className="px-4 py-4">Content here</div>
</DesignSideSheet>

{/* With footer */}
<DesignSideSheet
  open={open}
  onOpenChange={setOpen}
  title="All filters"
  footer={
    <>
      <DesignButton variant="outlined" theme="muted" size="medium" onClick={() => setOpen(false)}>Reset</DesignButton>
      <DesignButton variant="filled" theme="primary" size="medium" onClick={() => setOpen(false)}>Apply</DesignButton>
    </>
  }
>
  <div className="px-4 py-4">Filter fields</div>
</DesignSideSheet>

{/* With overlay */}
<DesignSideSheet open={open} onOpenChange={setOpen} title="Details" showOverlay>
  <div className="px-4 py-4">Detail content</div>
</DesignSideSheet>`} />
      </div>
    </div>
  );
};

export default SideSheetDocs;
