import { useState } from "react";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import type { DataTableColumn, DataTableFilter, DataTableAction, DataTableTab } from "@/components/ds/DesignDataTable";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignGrid } from "@/components/ds/DesignGrid";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Copy, Trash2, Package, MoreVertical, LogOut, Settings, HelpCircle, Flag, SearchX } from "lucide-react";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";

/* ── Nav ── */
const navItems = ["Overview", "Orders", "Flagged", "Analytics"];

/* ── Table data ── */
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
  sellerCity: string;
  status: string;
}

const statusTheme = (s: string) => {
  if (s === "Delivered") return "success" as const;
  if (s === "Shipped") return "primary" as const;
  if (s === "Cancelled") return "error" as const;
  if (s === "Pending") return "highlight" as const;
  return "primary" as const;
};

const buyers = ["Emma Johnson", "Lucas Martin", "Sofia Garcia", "Noah Williams", "Olivia Brown", "Liam Davis", "Ava Miller", "Ethan Wilson"];
const items = ["Zara Wool Coat – Size M", "Nike Air Max 90 – US 10", "Levi's 501 Jeans – W32", "H&M Cashmere Sweater – L", "Adidas Ultraboost – US 9", "Mango Leather Bag", "COS Merino Scarf", "Uniqlo Down Jacket – XL"];
const sellers = ["vintage_closet", "streetwear_hub", "nordic_style", "eco_fashion", "sneaker_vault", "boho_finds", "luxury_resale", "denim_archive"];
const cities = ["Berlin", "Paris", "Amsterdam", "Stockholm", "Madrid", "Milan", "Warsaw", "Copenhagen"];
const shipping = ["DHL Express", "DPD Standard", "Mondial Relay", "Hermes", "GLS Parcel", "PostNord"];
const payments = ["Visa •••• 4242", "PayPal", "Klarna", "Apple Pay", "Mastercard •••• 8831", "Bank Transfer"];
const statuses = ["Delivered", "Shipped", "Pending", "Delivered", "Cancelled"];

const sampleOrders: Order[] = Array.from({ length: 35 }, (_, i) => ({
  id: `order-${i + 1}`,
  orderNumber: `#VNT-${(20240100 + i * 7).toString()}`,
  buyer: buyers[i % buyers.length],
  item: items[i % items.length],
  price: `€${(12.5 + i * 3.4).toFixed(2)}`,
  shippingMethod: shipping[i % shipping.length],
  trackingNumber: `TR${(9283740 + i * 113).toString()}`,
  paymentMethod: payments[i % payments.length],
  seller: sellers[i % sellers.length],
  sellerCity: cities[i % cities.length],
  status: statuses[i % statuses.length],
}));

const columns: DataTableColumn<Order>[] = [
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
        <DesignBadge theme={statusTheme(row.status)}>{row.status}</DesignBadge>
      </div>
    ),
    width: "22%",
  },
];

const filters: DataTableFilter[] = [
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

const sideSheetFilters: DataTableFilter[] = [
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

const tabs: DataTableTab[] = [
  { id: "all", label: "All", count: 274 },
  { id: "pending", label: "Pending", count: 32 },
  { id: "shipped", label: "Shipped", count: 56 },
  { id: "delivered", label: "Delivered", count: 173 },
  { id: "cancelled", label: "Cancelled", count: 13 },
];

const actions: DataTableAction<Order>[] = [
  { icon: <Pencil className="w-4 h-4" />, tooltip: "Edit", onClick: () => {} },
  { icon: <Copy className="w-4 h-4" />, tooltip: "Duplicate", onClick: () => {} },
  { icon: <Trash2 className="w-4 h-4" />, tooltip: "Delete", onClick: () => {} },
];

/* ── Flagged config ── */
const flaggedFilters: DataTableFilter[] = [
  {
    id: "reason",
    label: "Reason",
    options: [
      { value: "counterfeit", label: "Counterfeit" },
      { value: "prohibited", label: "Prohibited item" },
      { value: "misleading", label: "Misleading description" },
      { value: "scam", label: "Scam attempt" },
    ],
  },
  {
    id: "severity",
    label: "Severity",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ],
  },
  {
    id: "source",
    label: "Reported by",
    options: [
      { value: "user", label: "User report" },
      { value: "auto", label: "Auto-detection" },
      { value: "moderator", label: "Moderator" },
    ],
  },
];

const flaggedSideSheetFilters: DataTableFilter[] = [
  {
    id: "date-range",
    label: "Report date",
    options: [
      { value: "today", label: "Today" },
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
    ],
  },
  {
    id: "category",
    label: "Item category",
    options: [
      { value: "clothing", label: "Clothing" },
      { value: "shoes", label: "Shoes" },
      { value: "bags", label: "Bags & Accessories" },
      { value: "electronics", label: "Electronics" },
    ],
  },
  {
    id: "seller-status",
    label: "Seller status",
    options: [
      { value: "active", label: "Active" },
      { value: "suspended", label: "Suspended" },
      { value: "new", label: "New seller" },
    ],
  },
];

const flaggedTabs: DataTableTab[] = [
  { id: "all", label: "All", count: 0 },
  { id: "pending-review", label: "Pending review", count: 0 },
  { id: "in-progress", label: "In progress", count: 0 },
  { id: "resolved", label: "Resolved", count: 0 },
  { id: "dismissed", label: "Dismissed", count: 0 },
];

const flaggedColumns: DataTableColumn<Order>[] = [
  {
    key: "item",
    header: "Flagged item",
    render: (row) => (
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">{row.item}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{row.price}</p>
      </div>
    ),
    width: "28%",
  },
  {
    key: "seller",
    header: "Seller",
    render: (row) => (
      <p className="text-sm font-medium text-[var(--foreground)]">@{row.seller}</p>
    ),
    width: "22%",
  },
  {
    key: "reason",
    header: "Reason",
    render: () => (
      <p className="text-sm text-[var(--foreground)]">—</p>
    ),
    width: "28%",
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <DesignBadge theme={statusTheme(row.status)}>{row.status}</DesignBadge>
    ),
    width: "22%",
  },
];

const DataTablePreview = () => {
  const [activeNav, setActiveNav] = useState("Orders");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const isFlagged = activeNav === "Flagged";

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
                      onClick={() => { setActiveNav(item); setActiveTab("all"); setSelected([]); }}
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
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-[580] text-foreground">
            {isFlagged ? "Flagged Items" : "Orders"}
          </h1>
          {!isFlagged && (
            <DesignButton variant="filled" theme="primary" size="medium">New Order</DesignButton>
          )}
        </div>

        <div className="border border-[var(--border)] rounded-[6px] bg-[var(--background)] p-3 flex-1 flex flex-col min-h-0">
          <DesignDataTable
            columns={isFlagged ? flaggedColumns : columns}
            data={isFlagged ? [] : sampleOrders}
            rowKey={(row) => row.id}
            filters={isFlagged ? flaggedFilters : filters}
            sideSheetFilters={isFlagged ? flaggedSideSheetFilters : sideSheetFilters}
            tabs={isFlagged ? flaggedTabs : tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectable
            selectedKeys={selected}
            onSelectionChange={setSelected}
            actions={isFlagged ? [] : actions}
            rowToggle={!isFlagged}
            pageSize={5}
            totalResultsLabel={isFlagged ? "0 results" : `${sampleOrders.length} results`}
            className="flex-1 min-h-0"
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
      </DesignGrid>
    </div>
  );
};

export default DataTablePreview;
