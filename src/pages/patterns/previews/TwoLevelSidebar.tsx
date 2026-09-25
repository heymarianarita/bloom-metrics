import { useState, useEffect } from "react";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { DesignBadge } from "@/components/ds/DesignBadge";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  MoreVertical,
  ShoppingBag,
  MessageSquare,
  Flag,
  Truck,
  Tag,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  Bell,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SubItem = {
  label: string;
  id: string;
  badge?: string;
};

type PrimaryCategory = {
  icon: React.ElementType;
  label: string;
  id: string;
  badge?: string;
  children: SubItem[];
};

const categories: PrimaryCategory[] = [
  {
    icon: LayoutDashboard,
    label: "Overview",
    id: "overview",
    children: [
      { label: "Dashboard", id: "dashboard" },
      { label: "Analytics", id: "analytics" },
      { label: "Reports", id: "reports" },
      { label: "Activity log", id: "activity-log" },
      { label: "Quick stats", id: "quick-stats" },
    ],
  },
  {
    icon: ShoppingBag,
    label: "Listings",
    id: "listings",
    badge: "1.2k",
    children: [
      { label: "All listings", id: "listings-all" },
      { label: "Pending review", id: "listings-pending", badge: "24" },
      { label: "Flagged", id: "listings-flagged", badge: "3" },
      { label: "Drafts", id: "listings-drafts" },
      { label: "Archived", id: "listings-archived" },
      { label: "Featured", id: "listings-featured" },
      { label: "Bulk upload", id: "listings-bulk" },
    ],
  },
  {
    icon: Truck,
    label: "Orders",
    id: "orders",
    badge: "38",
    children: [
      { label: "All orders", id: "orders-all" },
      { label: "In transit", id: "orders-transit" },
      { label: "Delivered", id: "orders-delivered" },
      { label: "Disputes", id: "orders-disputes", badge: "5" },
      { label: "Returns", id: "orders-returns" },
      { label: "Cancelled", id: "orders-cancelled" },
      { label: "Shipping labels", id: "orders-labels" },
    ],
  },
  {
    icon: Users,
    label: "Members",
    id: "members",
    children: [
      { label: "All members", id: "members-all" },
      { label: "Active", id: "members-active" },
      { label: "Suspended", id: "members-suspended" },
      { label: "Verification", id: "members-verification" },
      { label: "Invited", id: "members-invited" },
      { label: "Top sellers", id: "members-top-sellers" },
    ],
  },
  {
    icon: CreditCard,
    label: "Payments",
    id: "payments",
    children: [
      { label: "Transactions", id: "payments-transactions" },
      { label: "Payouts", id: "payments-payouts" },
      { label: "Refunds", id: "payments-refunds" },
      { label: "Invoices", id: "payments-invoices" },
      { label: "Payment methods", id: "payments-methods" },
    ],
  },
  {
    icon: Tag,
    label: "Categories",
    id: "categories",
    children: [
      { label: "All categories", id: "categories-all" },
      { label: "Create new", id: "categories-new" },
      { label: "Attributes", id: "categories-attributes" },
      { label: "Size guides", id: "categories-sizes" },
      { label: "Brand directory", id: "categories-brands" },
    ],
  },
  {
    icon: Flag,
    label: "Moderation",
    id: "moderation",
    badge: "7",
    children: [
      { label: "Reports", id: "moderation-reports", badge: "7" },
      { label: "Content review", id: "moderation-content" },
      { label: "Auto-mod rules", id: "moderation-rules" },
      { label: "Blocked words", id: "moderation-blocked" },
      { label: "Appeal queue", id: "moderation-appeals", badge: "2" },
    ],
  },
  {
    icon: MessageSquare,
    label: "Messages",
    id: "messages",
    children: [
      { label: "Support inbox", id: "messages-inbox" },
      { label: "Announcements", id: "messages-announcements" },
      { label: "Templates", id: "messages-templates" },
      { label: "Automated replies", id: "messages-auto" },
      { label: "Feedback", id: "messages-feedback" },
    ],
  },
];

interface TwoLevelSidebarProps {
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  activeSubItem: string;
  setActiveSubItem: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TwoLevelSidebar = ({
  activeCategory,
  setActiveCategory,
  activeSubItem,
  setActiveSubItem,
  collapsed,
  onToggleCollapse,
}: TwoLevelSidebarProps) => {
  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div className="flex sticky top-0 h-screen shrink-0">
        {/* Left bar — Primary categories */}
        <div className="w-[60px] bg-[var(--primary-extra-dark)] flex flex-col h-full">
          {/* Logo */}
          <div className="p-2 flex items-center justify-center pt-3">
            <div className="w-8 h-8 rounded-[6px] overflow-hidden shrink-0">
              <img src={vintedIconRounded} alt="Vinted" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Primary nav icons */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col items-center gap-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <DesignTooltip key={cat.id} content={cat.label} side="right">
                  <button
                    onClick={() => {
                      setActiveCategory(cat.id);
                      // Auto-select first child
                      if (cat.children.length > 0 && !cat.children.some((c) => c.id === activeSubItem)) {
                        setActiveSubItem(cat.children[0].id);
                      }
                    }}
                    className={`w-10 h-10 flex items-center justify-center rounded-[6px] transition-colors relative
                      ${isActive
                        ? "text-white bg-[rgba(255,255,255,0.15)]"
                        : "text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.04)]"
                      }
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--primary-extra-dark)]`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {cat.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                </DesignTooltip>
              );
            })}
          </nav>

          {/* User avatar (collapsed) */}
          <div className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 flex items-center justify-center rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.04)] transition-colors mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--primary-extra-dark)]">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shrink-0">
                    JD
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-[200px]">
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
        </div>

        {/* Right bar — Sub-categories (collapsible) */}
        <div
          className={`bg-spacing-bg flex flex-col h-full transition-[width] duration-200 overflow-hidden ${collapsed ? "w-0" : "w-[220px]"}`}
        >
          {/* Category header + collapse toggle */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-[580] text-foreground truncate">
              {activeCategoryData?.label ?? ""}
            </h3>
            <DesignTooltip content="Collapse panel" side="bottom">
              <button
                onClick={onToggleCollapse}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </DesignTooltip>
          </div>

          {/* Sub-items list */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-4 flex flex-col gap-0.5">
            {activeCategoryData?.children.map((sub) => {
              const isActive = activeSubItem === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubItem(sub.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm transition-colors w-full text-left
                    ${isActive
                      ? "text-[var(--primary-extra-dark)] font-medium bg-[rgba(0,119,130,0.08)]"
                      : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                    }
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
                >
                  <span className="flex-1 truncate">{sub.label}</span>
                  {sub.badge && (
                    <DesignBadge theme="primary" styling="light">{sub.badge}</DesignBadge>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Expand button — shown when right panel is collapsed */}
        {collapsed && (
          <div className="flex items-start pt-3 px-1">
            <DesignTooltip content="Expand panel" side="right">
              <button
                onClick={onToggleCollapse}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </DesignTooltip>
          </div>
        )}
      </div>
    </TooltipPrimitive.Provider>
  );
};

export default TwoLevelSidebar;
