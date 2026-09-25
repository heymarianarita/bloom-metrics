import { useState } from "react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter, DataTableTab } from "@/components/ds/DesignDataTable";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignGrid, DesignGridItem } from "@/components/ds/DesignGrid";
import { Users, Package, BarChart3, MoreVertical, LogOut, Settings, HelpCircle, Clock, ShieldCheck, MessageSquare, Columns3, Pencil, Copy, Trash2 } from "lucide-react";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const stats = [
  { label: "Total Users", value: "2,847", change: "+12%", icon: <Users className="w-5 h-5 text-muted-foreground" /> },
  { label: "Active Orders", value: "184", change: "+8%", icon: <Package className="w-5 h-5 text-muted-foreground" /> },
  { label: "Revenue", value: "€24,500", change: "+23%", icon: <BarChart3 className="w-5 h-5 text-muted-foreground" /> },
];

/* ── Orders table data ── */
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

const buyers = ["Emma Johnson", "Lucas Martin", "Sofia Garcia", "Noah Williams", "Olivia Brown", "Liam Davis", "Ava Miller", "Ethan Wilson"];
const items = ["Zara Wool Coat – Size M", "Nike Air Max 90 – US 10", "Levi's 501 Jeans – W32", "H&M Cashmere Sweater – L", "Adidas Ultraboost – US 9", "Mango Leather Bag", "COS Merino Scarf", "Uniqlo Down Jacket – XL"];
const sellers = ["vintage_closet", "streetwear_hub", "nordic_style", "eco_fashion", "sneaker_vault", "boho_finds", "luxury_resale", "denim_archive"];
const shippingMethods = ["DHL Express", "DPD Standard", "Mondial Relay", "Hermes", "GLS Parcel", "PostNord"];
const paymentMethods = ["Visa •••• 4242", "PayPal", "Klarna", "Apple Pay", "Mastercard •••• 8831", "Bank Transfer"];
const orderStatuses = ["Delivered", "Shipped", "Pending", "Delivered", "Cancelled"];

const sampleOrders: Order[] = Array.from({ length: 35 }, (_, i) => ({
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

const navItems = ["Overview", "Orders", "Flagged", "Analytics"];

const InternalToolPreview = () => {
  const [activeNav, setActiveNav] = useState("Flagged");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-spacing-bg flex flex-col">
      {/* Top Bar */}
      <TooltipProvider>
      <nav className="h-14 w-full bg-primary-dark flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <img src={vintedIconRounded} alt="Vinted" className="h-8 w-8 rounded-[6px] shrink-0" />
              <span className="text-white font-medium text-sm">Vinted Admin</span>
            </div>
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {navItems.map((item) => (
                  <NavigationMenuItem key={item}>
                    <NavigationMenuLink
                      onClick={() => setActiveNav(item)}
                      className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors min-h-[32px] cursor-pointer
                        ${activeNav === item
                          ? "bg-white/[0.12] text-white"
                          : "text-white/70 hover:bg-white/[0.06] active:bg-white/[0.08]"
                        }`}
                    >
                      {item}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] hover:bg-white/10 active:bg-white/25 h-auto">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">JD</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">John Doe</span>
            </Button>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-9 h-9 rounded-[6px] text-white hover:bg-white/10 active:bg-white/25">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">More actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <HelpCircle className="w-4 h-4" /> Help & Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </TooltipProvider>

      {/* Content */}
      <DesignGrid columns={false} className="flex-1 flex flex-col gap-6 py-6">
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

        {/* Recent Orders Table */}
        <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)]">
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
      </DesignGrid>
    </div>
  );
};

export default InternalToolPreview;