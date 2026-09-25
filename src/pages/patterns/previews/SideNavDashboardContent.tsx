import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignDataTable } from "@/components/ds/DesignDataTable";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { DesignGrid, DesignGridItem } from "@/components/ds/DesignGrid";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import {
  Users,
  Package,
  BarChart3,
  Bell,
  Search,
  ShoppingBag,
  Euro,
  Eye,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  { label: "Total Sales", value: "€124,500", change: "+18%", up: true, icon: Euro },
  { label: "Active Listings", value: "8,432", change: "+12%", up: true, icon: ShoppingBag },
  { label: "New Members", value: "1,284", change: "+24%", up: true, icon: Users },
  { label: "Conversion Rate", value: "3.2%", change: "-0.4%", up: false, icon: BarChart3 },
];

const recentOrders = [
  { id: "#VNT-1248", buyer: "Anna K.", item: "Vintage Levi's 501", price: "€45.00", status: "Shipped", time: "2 min ago" },
  { id: "#VNT-1247", buyer: "Mark T.", item: "Nike Air Max 90", price: "€89.00", status: "Paid", time: "15 min ago" },
  { id: "#VNT-1246", buyer: "Lisa M.", item: "Zara Wool Coat", price: "€62.00", status: "Dispute", time: "1 hour ago" },
  { id: "#VNT-1245", buyer: "John D.", item: "Adidas Samba OG", price: "€78.00", status: "Shipped", time: "2 hours ago" },
  { id: "#VNT-1244", buyer: "Sophie R.", item: "H&M Cashmere Scarf", price: "€28.00", status: "Delivered", time: "3 hours ago" },
];

const topListings = [
  { name: "Vintage Denim Jacket", views: 2340, favorites: 142, price: "€45.00" },
  { name: "Leather Crossbody Bag", views: 1890, favorites: 98, price: "€62.00" },
  { name: "Nike Air Force 1", views: 1560, favorites: 87, price: "€95.00" },
  { name: "Cashmere Sweater", views: 1120, favorites: 76, price: "€38.00" },
];

const statusTheme = (status: string) => {
  switch (status) {
    case "Shipped": return "primary" as const;
    case "Paid": return "success" as const;
    case "Dispute": return "error" as const;
    case "Delivered": return "muted" as const;
    default: return "muted" as const;
  }
};

const orderColumns = [
  { key: "id", header: "Order", width: "120px", sortable: true, render: (row: typeof recentOrders[0]) => <span className="font-medium">{row.id}</span> },
  { key: "item", header: "Item", sortable: true, render: (row: typeof recentOrders[0]) => row.item },
  { key: "buyer", header: "Buyer", sortable: true, render: (row: typeof recentOrders[0]) => <span className="text-[var(--muted-foreground)]">{row.buyer}</span> },
  { key: "price", header: "Price", width: "100px", sortable: true, render: (row: typeof recentOrders[0]) => <span className="font-[580]">{row.price}</span> },
  { key: "status", header: "Status", width: "110px", sortable: true, render: (row: typeof recentOrders[0]) => <DesignBadge theme={statusTheme(row.status)} styling="light">{row.status}</DesignBadge> },
];

const listingColumns = [
  { key: "name", header: "Listing", width: "200px", sortable: true, render: (row: typeof topListings[0]) => <span className="font-medium truncate block">{row.name}</span> },
  { key: "views", header: "Views", width: "70px", sortable: true, render: (row: typeof topListings[0]) => (
    <span className="flex items-center gap-1 text-[var(--muted-foreground)] text-xs">
      <Eye className="w-3 h-3" /> {row.views.toLocaleString()}
    </span>
  )},
  { key: "favorites", header: "Saves", width: "60px", sortable: true, render: (row: typeof topListings[0]) => (
    <span className="flex items-center gap-1 text-[var(--muted-foreground)] text-xs">
      <ArrowUpRight className="w-3 h-3" /> {row.favorites}
    </span>
  )},
  { key: "price", header: "Price", width: "70px", sortable: true, render: (row: typeof topListings[0]) => <span className="font-[580]">{row.price}</span> },
];

const SideNavDashboardContent = () => {
  return (
    <DesignCard variant="default" className="w-full flex-1">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 max-w-[1280px] mx-auto w-full">
        <DesignPageHeader
          breadcrumbs={[
            { label: "Home", onClick: () => {} },
            { label: "Marketplace", onClick: () => {} },
            { label: "Dashboard" },
          ]}
          title="Dashboard"
          statusIndicator={<DesignBadge theme="success" styling="light">Live</DesignBadge>}
          subtitle="Marketplace overview for March 2026"
          iconActions={
            <>
              <DesignTooltip content="Search" side="bottom">
                <button className="w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-spacing-bg transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </DesignTooltip>
              <DesignTooltip content="Notifications" side="bottom">
                <button className="relative w-9 h-9 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-spacing-bg transition-colors">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
                </button>
              </DesignTooltip>
            </>
          }
          secondaryActions={
            <DesignButton variant="outlined" theme="primary" size="medium">
              Add Listing
            </DesignButton>
          }
          primaryAction={
            <DesignButton variant="filled" theme="primary" size="medium">
              Export
            </DesignButton>
          }
        />
      </div>

      {/* Dashboard content */}
      <div className="px-6 pb-6 flex flex-col gap-6 max-w-[1280px] mx-auto w-full">
        {/* Stats grid — center-aligned */}
        <DesignGrid margin={0}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <DesignGridItem key={stat.label} colSpan={3} colSpanSm={4}>
                <DesignStatCard
                  label={stat.label}
                  value={stat.value}
                  change={stat.change}
                  changeUp={stat.up}
                  icon={<Icon className="w-5 h-5" />}
                />
              </DesignGridItem>
            );
          })}
        </DesignGrid>

        {/* Recent Orders — full width */}
        <DesignCard variant="default">
          <DesignDataTable
            title="Recent Orders"
            titleAction={<DesignButton variant="flat" theme="primary" size="small">View All</DesignButton>}
            columns={orderColumns}
            data={recentOrders}
            rowKey={(row) => row.id}
            hideToolbar
            hidePagination
            pageSize={10}
          />
        </DesignCard>

        {/* Top Listings — full width */}
        <DesignCard variant="default">
          <DesignDataTable
            title="Top Listings"
            titleAction={<DesignButton variant="flat" theme="primary" size="small">View All</DesignButton>}
            columns={listingColumns}
            data={topListings}
            rowKey={(_, i) => String(i)}
            hideToolbar
            hidePagination
            pageSize={10}
          />
        </DesignCard>
      </div>
    </DesignCard>
  );
};

export default SideNavDashboardContent;
