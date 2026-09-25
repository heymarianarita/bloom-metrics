import { useState } from "react";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter, DataTableAction, DataTableTab, SortDirection } from "@/components/ds/DesignDataTable";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Pencil, Copy, Trash2, Package, SearchX } from "lucide-react";

/* ── Sample data ── */

interface OrderRow {
  id: string;
  orderNumber: string;
  buyer: string;
  item: string;
  price: string;
  shippingMethod: string;
  trackingNumber: string;
  paymentMethod: string;
  seller: string;
  status: string;
}

const statusTheme = (s: string) => {
  if (s === "Delivered") return "success" as const;
  if (s === "Shipped") return "primary" as const;
  if (s === "Cancelled") return "error" as const;
  if (s === "Pending") return "highlight" as const;
  return "primary" as const;
};

const sampleOrders: OrderRow[] = [
  { id: "1", orderNumber: "#VNT-20240100", buyer: "Emma Johnson", item: "Zara Wool Coat – Size M", price: "€45.00", shippingMethod: "DHL Express", trackingNumber: "TR9283740", paymentMethod: "Visa •••• 4242", seller: "vintage_closet", status: "Delivered" },
  { id: "2", orderNumber: "#VNT-20240107", buyer: "Lucas Martin", item: "Nike Air Max 90 – US 10", price: "€78.50", shippingMethod: "DPD Standard", trackingNumber: "TR9283853", paymentMethod: "PayPal", seller: "streetwear_hub", status: "Shipped" },
  { id: "3", orderNumber: "#VNT-20240114", buyer: "Sofia Garcia", item: "Levi's 501 Jeans – W32", price: "€32.00", shippingMethod: "Mondial Relay", trackingNumber: "TR9283966", paymentMethod: "Klarna", seller: "nordic_style", status: "Pending" },
  { id: "4", orderNumber: "#VNT-20240121", buyer: "Noah Williams", item: "H&M Cashmere Sweater – L", price: "€25.90", shippingMethod: "Hermes", trackingNumber: "TR9284079", paymentMethod: "Apple Pay", seller: "eco_fashion", status: "Delivered" },
  { id: "5", orderNumber: "#VNT-20240128", buyer: "Olivia Brown", item: "Adidas Ultraboost – US 9", price: "€92.00", shippingMethod: "GLS Parcel", trackingNumber: "TR9284192", paymentMethod: "Mastercard •••• 8831", seller: "sneaker_vault", status: "Cancelled" },
  { id: "6", orderNumber: "#VNT-20240135", buyer: "Liam Davis", item: "Mango Leather Bag", price: "€55.40", shippingMethod: "PostNord", trackingNumber: "TR9284305", paymentMethod: "Bank Transfer", seller: "boho_finds", status: "Delivered" },
  { id: "7", orderNumber: "#VNT-20240142", buyer: "Ava Miller", item: "COS Merino Scarf", price: "€18.00", shippingMethod: "DHL Express", trackingNumber: "TR9284418", paymentMethod: "Visa •••• 4242", seller: "luxury_resale", status: "Shipped" },
  { id: "8", orderNumber: "#VNT-20240149", buyer: "Ethan Wilson", item: "Uniqlo Down Jacket – XL", price: "€67.80", shippingMethod: "DPD Standard", trackingNumber: "TR9284531", paymentMethod: "PayPal", seller: "denim_archive", status: "Pending" },
];

const columns: DataTableColumn<OrderRow>[] = [
  {
    key: "order",
    header: "Order",
    sortable: true,
    render: (row) => (
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{row.orderNumber}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{row.item}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{row.price}</p>
      </div>
    ),
  },
  {
    key: "buyer",
    header: "Buyer & Seller",
    sortable: true,
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{row.buyer}</p>
        <p className="text-sm font-medium text-[var(--foreground)]">@{row.seller}</p>
      </div>
    ),
  },
  {
    key: "shipping",
    header: "Shipping",
    sortable: true,
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{row.shippingMethod}</p>
        <p className="text-sm text-[var(--foreground)]">{row.trackingNumber}</p>
      </div>
    ),
  },
  {
    key: "payment",
    header: "Payment & Status",
    sortable: true,
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{row.paymentMethod}</p>
        <div className="mt-1" />
        <DesignBadge theme={statusTheme(row.status)}>{row.status}</DesignBadge>
      </div>
    ),
  },
];

const filters: DataTableFilter[] = [
  { id: "status", label: "Status", options: [{ value: "delivered", label: "Delivered" }, { value: "shipped", label: "Shipped" }, { value: "pending", label: "Pending" }, { value: "cancelled", label: "Cancelled" }] },
  { id: "shipping", label: "Shipping method", options: [{ value: "dhl", label: "DHL Express" }, { value: "dpd", label: "DPD Standard" }, { value: "mondial", label: "Mondial Relay" }] },
  { id: "payment", label: "Payment method", options: [{ value: "visa", label: "Visa" }, { value: "paypal", label: "PayPal" }, { value: "klarna", label: "Klarna" }] },
];

const sideSheetFilters: DataTableFilter[] = [
  { id: "date-range", label: "Order date", options: [{ value: "today", label: "Today" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }] },
  { id: "price-range", label: "Price range", options: [{ value: "0-20", label: "Under €20" }, { value: "20-50", label: "€20 – €50" }, { value: "50-100", label: "€50 – €100" }] },
];

const tabs: DataTableTab[] = [
  { id: "all", label: "All", count: 274 },
  { id: "pending", label: "Pending", count: 32 },
  { id: "shipped", label: "Shipped", count: 56 },
  { id: "delivered", label: "Delivered", count: 173 },
  { id: "cancelled", label: "Cancelled", count: 13 },
];

const actions: DataTableAction<OrderRow>[] = [
  { icon: <Pencil className="w-4 h-4" />, tooltip: "Edit", onClick: () => {} },
  { icon: <Copy className="w-4 h-4" />, tooltip: "Duplicate", onClick: () => {} },
  { icon: <Trash2 className="w-4 h-4" />, tooltip: "Delete", onClick: () => {} },
];

/* ── Documentation tables ── */

const anatomyItems = [
  { name: "Title bar", description: "Optional header with title (18px/580 weight) and titleAction slot. Rendered above the toolbar when the 'title' prop is set." },
  { name: "Toolbar", description: "Two-row area with px-5 horizontal padding (aligned with title bar and card content) and 12px gaps. No bottom border — flows directly into column headers. Contains search, filter dropdowns, 'All filters' button, reset link, and tab chips." },
  { name: "Search bar", description: "200px wide DesignInputBar with left search icon. Clears via X icon on the right." },
  { name: "Filter dropdowns", description: "180px wide DesignInputSelect components for inline filters. Additional filters appear in the side sheet." },
  { name: "Wrapping filters", description: "When wrapFilters is true, the toolbar filters wrap to multiple rows. The 'All filters' side sheet button is hidden (since all filters are already visible inline). Selected filter values are displayed as removable DesignChip components below the toolbar with a 'Clear all' link and results count." },
  { name: "All filters button", description: "DesignButton (outlined/muted) that opens the side sheet. Shows active count as 'N/total'. Truncated with DesignTooltip on hover. Hidden when wrapFilters is enabled." },
  { name: "Reset filters", description: "Text link with RotateCcw icon. Clears all filters and search. Only visible when filters are active and wrapFilters is false." },
  { name: "Active filter chips", description: "When wrapFilters is true and filters are selected, filled rounded pill-shaped chips (variant='filled', radius='round') with X suffix appear below the toolbar. Includes 'Clear all' link and results label." },
  { name: "Tab chips", description: "DesignChip row below filters. Each shows label + optional count. 12px gap between chips. Wraps to multiple lines when space is limited." },
  { name: "Column headers", description: "44px height row with 14px/375 weight text in muted-foreground. Sortable columns show an ArrowUpDown icon that cycles through asc → desc → none on click. Header text on hover transitions to foreground color. Single-line only — long titles are truncated with a DesignTooltip on hover revealing the full text." },
  { name: "Table rows", description: "Top-aligned cells with px-4 py-3 padding. Hover: primary color at 6% opacity. Separated by border-bottom. Cell text is truncated with a DesignTooltip on hover revealing the full content. For JSX-rendered cells, plain text is recursively extracted for the tooltip." },
  { name: "Toolbar layout", description: "Filters default to single row (no wrapping). When wrapFilters is true, filters wrap to multiple rows with active chips displayed below." },
  { name: "Row actions", description: "Right-aligned cell with DesignToggle and a MoreVertical dropdown (consolidated actions)." },
  { name: "Pagination", description: "DesignPagination right-aligned at bottom, visible when pageCount > 1. Border-top separator." },
  { name: "Side sheet", description: "33.33vw width, square corners, no overlay. 60px header, stacked filter inputs (pt-1 top padding, space-y-4 gap), 85px footer with Reset + Show results." },
  { name: "Empty state", description: "DesignEmptyState rendered when data array is empty. Supports icon, title, body text, and action button." },
];

const specRows = [
  { spec: "Toolbar padding", value: "20px horizontal (px-5), 12px top (py-3), 24px bottom (pb-[24px]). Left edge aligns with title bar and card content (px-5)." },
  { spec: "Toolbar gap", value: "12px between rows" },
  { spec: "Search bar width", value: "200px" },
  { spec: "Filter dropdown width", value: "180px" },
  { spec: "Header row height", value: "44px" },
  { spec: "Header font", value: "14px, weight 375, muted-foreground, truncate + DesignTooltip on hover. Sortable headers show ArrowUpDown icon (3.5×3.5)" },
  { spec: "Header sort interaction", value: "Click cycles: none → asc (ArrowUp) → desc (ArrowDown) → none. Hover: text color transitions to foreground" },
  { spec: "Toolbar wrapping", value: "Default: flex-nowrap (single row). wrapFilters: flex-wrap with active chips row below. Tab chips always wrap (flex-wrap)." },
  { spec: "Pagination alignment", value: "Right-aligned (flex justify-end)" },
  { spec: "Cell padding", value: "px-4 py-3" },
  { spec: "Cell truncation", value: "All cells use overflow-hidden + truncate with max-w-0 on table-fixed. A DesignTooltip on hover reveals the full text. For JSX content, text is recursively extracted via extractText()." },
  { spec: "Cell alignment", value: "Top (align-top)" },
  { spec: "Row hover", value: "primary at 6% opacity" },
  { spec: "Actions column width", value: "96px" },
  { spec: "Side sheet width", value: "33.33vw, min 360px" },
  { spec: "Side sheet radius", value: "0 (square corners)" },
  { spec: "Side sheet overlay", value: "48% opacity" },
  { spec: "Side sheet header", value: "60px height" },
  { spec: "Side sheet footer", value: "85px height" },
  { spec: "Side sheet filter gap", value: "16px (space-y-4)" },
  { spec: "Table layout", value: "table-fixed — all columns share equal width by default. Use the optional 'width' prop on individual columns to override." },
  { spec: "Page size default", value: "5 rows" },
];

const stateRows = [
  { state: "Row — Default", description: "No background." },
  { state: "Row — Hover", description: "Background rgba(0,119,130,0.06) — primary at 6%." },
  { state: "Row — Selected", description: "Checkbox checked. Controlled via selectedKeys." },
  { state: "Row toggle — On/Off", description: "DesignToggle in actions column." },
  { state: "Filter — Active", description: "DesignInputSelect shows selected value. 'All filters' button shows count." },
  { state: "Tab — Active", description: "DesignChip isActive highlights the selected tab." },
  { state: "Empty", description: "DesignEmptyState with icon, title, body, and optional action." },
  { state: "Header — Sortable", description: "Shows ArrowUpDown icon. Clicking cycles asc → desc → none. Active sort shows ArrowUp or ArrowDown." },
  { state: "Header — Sort hover", description: "Text color transitions from muted-foreground to foreground." },
  { state: "Cell — Truncated", description: "Text overflowing the cell is truncated with an ellipsis. A DesignTooltip appears on hover showing the full cell text (extracted recursively for JSX content)." },
];

const props = [
  { name: "columns", type: "DataTableColumn<T>[]", description: "Column definitions: key, header, render function, width, sortable" },
  { name: "data", type: "T[]", description: "Array of row objects" },
  { name: "rowKey", type: "(row, index) => string", description: "Unique key extractor per row" },
  { name: "title", type: "string", description: "Optional title displayed inside the card, above the toolbar" },
  { name: "titleAction", type: "ReactNode", description: "Action element next to the title (e.g. 'View All' button)" },
  { name: "searchPlaceholder", type: "string", default: '"Search"', description: "Placeholder for the search bar" },
  { name: "filters", type: "DataTableFilter[]", description: "Inline filter dropdowns in the toolbar" },
  { name: "sideSheetFilters", type: "DataTableFilter[]", description: "Additional filters shown only in the 'All filters' side sheet" },
  { name: "tabs", type: "DataTableTab[]", description: "Tab chips below the filter row" },
  { name: "activeTab", type: "string", description: "Currently active tab ID" },
  { name: "onTabChange", type: "(tabId) => void", description: "Tab selection handler" },
  { name: "totalResultsLabel", type: "string", description: "Override the results count text" },
  { name: "selectable", type: "boolean", default: "false", description: "Enable row checkboxes" },
  { name: "selectedKeys", type: "string[]", description: "Controlled selected row keys" },
  { name: "onSelectionChange", type: "(keys) => void", description: "Selection change callback" },
  { name: "actions", type: "DataTableAction<T>[]", description: "Row actions shown in a 'More' dropdown (icon + tooltip + onClick)" },
  { name: "rowToggle", type: "boolean", default: "false", description: "Show a toggle switch per row" },
  { name: "toggledKeys", type: "string[]", description: "Controlled toggled row keys" },
  { name: "onToggleChange", type: "(key, checked) => void", description: "Toggle change callback" },
  { name: "pageSize", type: "number", default: "5", description: "Rows per page" },
  { name: "hidePagination", type: "boolean", default: "false", description: "Hide pagination controls" },
  { name: "hideHeader", type: "boolean", default: "false", description: "Hide the column header row" },
  { name: "wrapFilters", type: "boolean", default: "false", description: "Allow toolbar filters to wrap to multiple rows. When enabled, the 'All filters' side sheet button is hidden and selected values appear as removable chips below the toolbar with 'Clear all' and results count." },
  { name: "sortKey", type: "string", description: "Currently sorted column key" },
  { name: "sortDirection", type: '"asc" | "desc" | null', description: "Current sort direction" },
  { name: "onSortChange", type: "(key, direction) => void", description: "Sort change callback. Direction cycles: null → asc → desc → null" },
  { name: "emptyIcon", type: "ReactNode", description: "Icon for empty state" },
  { name: "emptyTitle", type: "string", default: '"No results found"', description: "Empty state heading" },
  { name: "emptyBody", type: "string", description: "Empty state description text" },
  { name: "emptyAction", type: "ReactNode", description: "Empty state call-to-action (e.g. DesignButton)" },
  { name: "className", type: "string", description: "Additional CSS classes for the wrapper" },
];

const DataTableDocs = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="DataTable"
        description="A high-density data management component with a two-row toolbar (search, filters, tabs), side sheet for additional filters, selectable rows, consolidated row actions, pagination, and built-in empty state."
      />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Pattern note:</strong> This is a <strong>composed component</strong> that assembles DesignInputBar, DesignInputSelect, DesignChip, DesignCheckbox, DesignToggle, DesignPagination, and DesignEmptyState into a full table layout. See <a href="/patterns/pattern-3/preview" className="text-primary underline">Pattern 3 preview</a> for the full implementation.
      </div>

      {/* Full example */}
      <ComponentSection title="Default — Full Example" description="Table with search, filters, tabs, checkboxes, row actions (toggle + more dropdown), and pagination.">
        <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)] overflow-hidden">
          <DesignDataTable
            columns={columns}
            data={sampleOrders}
            rowKey={(row) => row.id}
            filters={filters}
            sideSheetFilters={sideSheetFilters}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectable
            selectedKeys={selected}
            onSelectionChange={setSelected}
            actions={actions}
            rowToggle
            pageSize={5}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key, dir) => { setSortKey(key); setSortDirection(dir); }}
            totalResultsLabel={`${sampleOrders.length} results`}
          />
        </div>
      </ComponentSection>

      {/* Wrapping filters example */}
      <ComponentSection title="Wrapping Filters" description="Enable wrapFilters to allow filter dropdowns to wrap to multiple rows. Selected values appear as removable chips below with 'Clear all' and results count.">
        <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)] overflow-hidden">
          <DesignDataTable
            columns={columns}
            data={sampleOrders}
            rowKey={(row) => row.id}
            filters={[...filters, ...sideSheetFilters]}
            wrapFilters
            pageSize={5}
            totalResultsLabel={`${sampleOrders.length} results`}
          />
        </div>
      </ComponentSection>

      {/* Empty state */}
      <ComponentSection title="Empty State" description="When data is empty, the component renders a DesignEmptyState with configurable icon, title, body, and action.">
        <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)] overflow-hidden">
          <DesignDataTable
            columns={columns}
            data={[]}
            rowKey={(row) => row.id}
            filters={filters}
            tabs={[
              { id: "all", label: "All", count: 0 },
              { id: "pending", label: "Pending review", count: 0 },
              { id: "resolved", label: "Resolved", count: 0 },
            ]}
            activeTab="all"
            selectable
            actions={actions}
            rowToggle
            totalResultsLabel="0 results"
            emptyIcon={<SearchX className="w-12 h-12 text-[var(--muted-foreground)]" />}
            emptyTitle="No flagged items"
            emptyBody="There are no flagged items to review. Flagged items from user reports and auto-detection will appear here."
            emptyAction={
              <DesignButton variant="filled" theme="primary" size="medium">
                Review Settings
              </DesignButton>
            }
          />
        </div>
      </ComponentSection>

      {/* Anatomy */}
      <ComponentSection title="Anatomy">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium w-[180px]">Element</th>
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
        </div>
      </ComponentSection>

      {/* Design specs */}
      <ComponentSection title="Design specs">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium w-[220px]">Property</th>
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
        </div>
      </ComponentSection>

      {/* Interaction states */}
      <ComponentSection title="Interaction states">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium w-[200px]">State</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((row) => (
                <tr key={row.state} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium text-foreground">{row.state}</td>
                  <td className="py-2 text-muted-foreground">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComponentSection>

      {/* Usage */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Usage</h2>
        <CodeBlock code={`import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter, DataTableTab } from "@/components/ds/DesignDataTable";

const columns: DataTableColumn<Order>[] = [
  {
    key: "order",
    header: "Order",
    render: (row) => (
      <div>
        <p className="text-sm font-medium">{row.orderNumber}</p>
        <p className="text-xs text-muted">{row.item}</p>
      </div>
    ),
    width: "28%",
  },
  // ... more columns
];

const filters: DataTableFilter[] = [
  { id: "status", label: "Status", options: [
    { value: "delivered", label: "Delivered" },
    { value: "shipped", label: "Shipped" },
  ]},
];

const sideSheetFilters: DataTableFilter[] = [
  { id: "date", label: "Order date", options: [
    { value: "7d", label: "Last 7 days" },
  ]},
];

const tabs: DataTableTab[] = [
  { id: "all", label: "All", count: 274 },
  { id: "pending", label: "Pending", count: 32 },
];

<DesignDataTable
  columns={columns}
  data={orders}
  rowKey={(row) => row.id}
  filters={filters}
  sideSheetFilters={sideSheetFilters}
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  selectable
  selectedKeys={selected}
  onSelectionChange={setSelected}
  actions={[
    { icon: <Pencil className="w-4 h-4" />, tooltip: "Edit", onClick: (row) => edit(row) },
    { icon: <Trash2 className="w-4 h-4" />, tooltip: "Delete", onClick: (row) => remove(row) },
  ]}
  rowToggle
  pageSize={5}
/>`} />
      </div>

      {/* Empty state usage */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Empty State Usage</h2>
        <CodeBlock code={`<DesignDataTable
  columns={columns}
  data={[]}  // empty array triggers empty state
  rowKey={(row) => row.id}
  filters={filters}
  emptyIcon={<SearchX className="w-12 h-12 text-muted-foreground" />}
  emptyTitle="No flagged items"
  emptyBody="There are no flagged items to review."
  emptyAction={
    <DesignButton variant="filled" theme="primary" size="medium">
      Review Settings
    </DesignButton>
  }
/>`} />
      </div>

      {/* Props */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default DataTableDocs;