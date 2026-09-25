import { useState } from "react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter } from "@/components/ds/DesignDataTable";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignGrid, DesignGridItem } from "@/components/ds/DesignGrid";
import {
  Clock,
  ShieldCheck,
  MessageSquare,
  Columns3,
  Users,
  Package,
  BarChart3,
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
    width: "28%",
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
    width: "22%",
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
    width: "22%",
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
    width: "22%",
  },
];

const orderFilters: DataTableFilter[] = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "delivered", label: "Delivered" },
      { value: "shipped", label: "Shipped" },
      { value: "pending", label: "Pending" },
      { value: "cancelled", label: "Cancelled" },
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
  {
    id: "payment",
    label: "Payment method",
    options: [
      { value: "visa", label: "Visa" },
      { value: "paypal", label: "PayPal" },
      { value: "klarna", label: "Klarna" },
      { value: "apple-pay", label: "Apple Pay" },
      { value: "mastercard", label: "Mastercard" },
    ],
  },
];

const WhiteSideNavContent = () => {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <DesignGrid columns={false} className="flex-1 flex flex-col gap-6">
      <DesignPageHeader
        breadcrumbs={[
          { label: "Flagged orders", onClick: () => {} },
          { label: "Order #ORD-1236" },
        ]}
        title="Order #ORD-1236 · €32.50"
        statusIndicator={<DesignBadge theme="error" styling="light" icon={<Clock className="w-3 h-3" />}>Flagged</DesignBadge>}
        subtitle="Placed by Lisa M. · Created 14 Mar 2026"
        iconActions={
          <>
            <DesignTooltip content="Approve" side="bottom">
              <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-spacing-bg transition-colors">
                <ShieldCheck className="w-[18px] h-[18px]" />
              </button>
            </DesignTooltip>
            <DesignTooltip content="Comments" side="bottom">
              <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-spacing-bg transition-colors">
                <MessageSquare className="w-[18px] h-[18px]" />
              </button>
            </DesignTooltip>
            <DesignTooltip content="Details" side="bottom">
              <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-spacing-bg transition-colors">
                <Columns3 className="w-[18px] h-[18px]" />
              </button>
            </DesignTooltip>
          </>
        }
        secondaryActions={
          <DesignButton variant="outlined" theme="primary" size="medium">Assign</DesignButton>
        }
        primaryAction={
          <DesignButton variant="filled" theme="primary" size="medium">Resolve...</DesignButton>
        }
      />

      {/* Stats cards */}
      <DesignGrid margin={0}>
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

      {/* Orders Table */}
      <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)] p-3">
        <DesignDataTable
          title="Related Orders"
          columns={orderColumns}
          data={sampleOrders}
          rowKey={(row) => row.id}
          filters={orderFilters}
          wrapFilters
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          pageSize={5}
          totalResultsLabel={`${sampleOrders.length} results`}
        />
      </div>
    </DesignGrid>
  );
};

export default WhiteSideNavContent;
