import { useState } from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter, DataTableTab } from "@/components/ds/DesignDataTable";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignGrid, DesignGridItem } from "@/components/ds/DesignGrid";
import {
  Users,
  Package,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";

/* ── Stats ── */
const stats = [
  { label: "Total Users", value: "2,847", change: "+12%", icon: <Users className="w-5 h-5 text-muted-foreground" /> },
  { label: "Active Orders", value: "184", change: "+8%", icon: <Package className="w-5 h-5 text-muted-foreground" /> },
  { label: "Revenue", value: "€24,500", change: "+23%", icon: <BarChart3 className="w-5 h-5 text-muted-foreground" /> },
];

/* ── Order data ── */
interface Order {
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

const orderStatusTheme = (s: string) => {
  if (s === "Delivered") return "success" as const;
  if (s === "Shipped") return "primary" as const;
  if (s === "Cancelled") return "error" as const;
  if (s === "Pending") return "highlight" as const;
  return "primary" as const;
};

const buyers = ["Emma Johnson", "Lucas Martin", "Sofia Garcia", "Noah Williams", "Olivia Brown"];
const items = ["Zara Wool Coat – Size M", "Nike Air Max 90 – US 10", "Levi's 501 Jeans – W32", "H&M Cashmere Sweater – L", "Adidas Ultraboost – US 9"];
const sellers = ["vintage_closet", "streetwear_hub", "nordic_style", "eco_fashion", "sneaker_vault"];
const shippingMethods = ["DHL Express", "DPD Standard", "Mondial Relay", "Hermes", "GLS Parcel"];
const paymentMethods = ["Visa •••• 4242", "PayPal", "Klarna", "Apple Pay", "Mastercard •••• 8831"];
const orderStatuses = ["Delivered", "Shipped", "Pending", "Delivered", "Cancelled"];

const sampleOrders: Order[] = Array.from({ length: 12 }, (_, i) => ({
  id: `order-${i + 1}`,
  orderNumber: `#VNT-${(20240100 + i * 7).toString()}`,
  buyer: buyers[i % buyers.length],
  item: items[i % items.length],
  price: `€${(12.5 + i * 3.4).toFixed(2)}`,
  shippingMethod: shippingMethods[i % shippingMethods.length],
  trackingNumber: `TR${(9283740 + i * 113).toString()}`,
  paymentMethod: paymentMethods[i % paymentMethods.length],
  seller: sellers[i % sellers.length],
  status: orderStatuses[i % orderStatuses.length],
}));

const orderColumns: DataTableColumn<Order>[] = [
  {
    key: "order",
    header: "Order",
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
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-xs text-[var(--muted-foreground)]">Buyer</p>
        <p className="text-sm font-medium text-[var(--foreground)]">{row.buyer}</p>
        <p className="text-xs text-[var(--muted-foreground)]">Seller</p>
        <p className="text-sm font-medium text-[var(--foreground)]">@{row.seller}</p>
      </div>
    ),
  },
  {
    key: "shipping",
    header: "Shipping",
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
    render: (row) => (
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-[var(--foreground)]">{row.paymentMethod}</p>
        <div className="mt-1" />
        <DesignBadge theme={orderStatusTheme(row.status)}>{row.status}</DesignBadge>
      </div>
    ),
  },
];

const orderFilters: DataTableFilter[] = [
  {
    id: "date",
    label: "Date",
    options: [
      { value: "today", label: "Today" },
      { value: "yesterday", label: "Yesterday" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
  },
  {
    id: "shipping",
    label: "Shipping method",
    options: [
      { value: "dhl", label: "DHL Express" },
      { value: "dpd", label: "DPD Standard" },
      { value: "mondial", label: "Mondial Relay" },
      { value: "hermes", label: "Hermes" },
      { value: "gls", label: "GLS Parcel" },
    ],
  },
];

const orderSideSheetFilters: DataTableFilter[] = [
  {
    id: "date-range",
    label: "Order date",
    options: [
      { value: "today", label: "Today" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
  },
  {
    id: "seller-country",
    label: "Seller country",
    options: [
      { value: "de", label: "Germany" },
      { value: "fr", label: "France" },
      { value: "nl", label: "Netherlands" },
      { value: "se", label: "Sweden" },
      { value: "es", label: "Spain" },
    ],
  },
  {
    id: "price-range",
    label: "Price range",
    options: [
      { value: "0-20", label: "Under €20" },
      { value: "20-50", label: "€20 – €50" },
      { value: "50-100", label: "€50 – €100" },
      { value: "100+", label: "Over €100" },
    ],
  },
  {
    id: "category",
    label: "Item category",
    options: [
      { value: "clothing", label: "Clothing" },
      { value: "shoes", label: "Shoes" },
      { value: "bags", label: "Bags & Accessories" },
      { value: "outerwear", label: "Outerwear" },
    ],
  },
];

const orderTabs: DataTableTab[] = [
  { id: "all", label: "All", count: 274 },
  { id: "pending", label: "Pending", count: 32 },
  { id: "shipped", label: "Shipped", count: 56 },
  { id: "delivered", label: "Delivered", count: 173 },
  { id: "cancelled", label: "Cancelled", count: 13 },
];

/* ── Recent activity ── */
const recentActivity = [
  { time: "2 min ago", action: "Order #VNT-1248 marked as shipped", type: "info" },
  { time: "15 min ago", action: "New dispute opened by sofia_garcia", type: "warning" },
  { time: "1 hr ago", action: "Payout of €1,240 processed", type: "success" },
  { time: "2 hr ago", action: "Listing flagged: Nike Air Max 90", type: "warning" },
  { time: "3 hr ago", action: "New member registration: noah_w", type: "info" },
  { time: "4 hr ago", action: "Order #VNT-1241 delivered", type: "success" },
];

const MultiPanelContent = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="flex-1 flex flex-col gap-[12px] min-h-0 w-full">
      {/* Two panels: Primary (2/3) + Secondary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[12px] flex-1 min-h-0">
        {/* Primary panel (2/3) — Orders */}
        <DesignCard variant="default" className="lg:col-span-2 flex flex-col overflow-y-auto min-h-0">
          <div className="px-5 pt-5 pb-3">
            <DesignPageHeader
              title="All listings"
              subtitle="Manage and track all marketplace listings"
              primaryAction={<DesignButton variant="filled" theme="primary" size="medium">Create Listing</DesignButton>}
              secondaryActions={<DesignButton variant="outlined" theme="primary" size="medium">Export</DesignButton>}
            />
          </div>

          {/* Stats row */}
          <div className="px-5 pb-3">
            <DesignGrid margin={0} gutter={12}>
              {stats.map((stat) => (
                <DesignGridItem key={stat.label} colSpan={4} colSpanSm={4}>
                  <DesignStatCard
                    label={stat.label}
                    value={stat.value}
                    change={stat.change}
                    changeUp
                    icon={stat.icon}
                  />
                </DesignGridItem>
              ))}
            </DesignGrid>
          </div>

          {/* Orders table */}
          <div className="flex-1">
            <DesignDataTable
              title="Recent Orders"
              columns={orderColumns}
              data={sampleOrders}
              rowKey={(row) => row.id}
              filters={orderFilters}
              sideSheetFilters={orderSideSheetFilters}
              tabs={orderTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectable
              selectedKeys={selected}
              onSelectionChange={setSelected}
              actions={[
                { icon: <Pencil className="w-4 h-4" />, tooltip: "Edit", onClick: () => {} },
                { icon: <Copy className="w-4 h-4" />, tooltip: "Duplicate", onClick: () => {} },
                { icon: <Trash2 className="w-4 h-4" />, tooltip: "Delete", onClick: () => {} },
              ]}
              rowToggle
              pageSize={5}
              totalResultsLabel={`${sampleOrders.length} results`}
            />
          </div>
        </DesignCard>

        {/* Secondary panel (1/3) — Activity */}
        <DesignCard variant="default" className="flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <DesignPageHeader
              title="Activity"
              subtitle="Recent marketplace events"
              showBackChevron={false}
              primaryAction={<DesignButton variant="flat" theme="primary" size="small">View all</DesignButton>}
            />
          </div>

          <div className="px-5 pb-5 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.type === "success" ? "bg-[var(--btn-success)]" :
                  item.type === "warning" ? "bg-[var(--highlight)]" :
                  "bg-primary"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}

            {/* Quick stats at bottom */}
            <div className="mt-auto pt-4 space-y-3">
              <div className="p-3 rounded-[6px] bg-[var(--spacing-bg)]">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-[var(--highlight)]" />
                  <p className="text-sm font-medium text-foreground">3 disputes pending</p>
                </div>
                <p className="text-xs text-muted-foreground">Requires attention within 24h</p>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--spacing-bg)]">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[var(--btn-success)]" />
                  <p className="text-sm font-medium text-foreground">Revenue up 23%</p>
                </div>
                <p className="text-xs text-muted-foreground">Compared to last week</p>
              </div>
            </div>
          </div>
        </DesignCard>
      </div>
    </div>
  );
};

export default MultiPanelContent;
