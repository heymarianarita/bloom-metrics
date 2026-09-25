import { useState } from "react";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import vintedIcon from "@/assets/vinted-icon-rounded.svg";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  MoreVertical,
  ShoppingBag,
  Truck,
  PanelLeftClose,
  PanelLeftOpen,
  Flag,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  icon: React.ElementType;
  label: string;
  id: string;
  badge?: string;
  children?: { label: string; id: string }[];
};

// navSections is exported from the interface block below
const SideNavItem = ({
  item,
  activeNav,
  setActiveNav,
  collapsed,
}: {
  item: NavItem;
  activeNav: string;
  setActiveNav: (id: string) => void;
  collapsed: boolean;
}) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some((c) => c.id === activeNav);
  const isActive = activeNav === item.id;
  const [open, setOpen] = useState(isChildActive);

  // Collapsed: icon-only with tooltip
  if (collapsed) {
    const tooltipLabel = item.badge ? `${item.label} (${item.badge})` : item.label;
    return (
      <DesignTooltip content={tooltipLabel} side="right">
          <button
            onClick={() => setActiveNav(hasChildren ? item.children![0].id : item.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-[6px] transition-colors relative
              ${isActive || isChildActive ? "text-[var(--primary-extra-dark)] bg-[rgba(0,119,130,0.08)]" : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.badge && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
      </DesignTooltip>
    );
  }

  // Expanded: with children
  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors w-full text-left
              ${isChildActive ? "text-[var(--primary-extra-dark)] hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]" : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <DesignBadge theme="primary" styling="light">{item.badge}</DesignBadge>
            )}
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 pl-[15px] border-l border-border mt-0.5 mb-1 flex flex-col gap-0.5">
            {item.children!.map((child) => {
              const isChildItemActive = activeNav === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setActiveNav(child.id)}
                  className={`text-left w-full px-3 py-1.5 rounded-[6px] text-sm transition-colors
                    ${isChildItemActive
                      ? "text-[var(--primary-extra-dark)] font-medium bg-[rgba(0,119,130,0.08)] hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                    }
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
                >
                  {child.label}
                </button>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Expanded: no children
  return (
    <button
      onClick={() => setActiveNav(item.id)}
      className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors w-full text-left
        ${isActive ? "text-[var(--primary-extra-dark)] bg-[rgba(0,119,130,0.08)]" : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <DesignBadge theme="primary" styling="light">{item.badge}</DesignBadge>
      )}
    </button>
  );
};

interface SideNavSidebarProps {
  activeNav: string;
  setActiveNav: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hideHeader?: boolean;
  /** When set, only show items from this section label */
  sectionFilter?: string;
  /** Section labels to hide from the sidebar */
  hideSections?: string[];
  /** Show a right border on the sidebar */
  showRightBorder?: boolean;
  /** Show a vertical divider line on the right edge of the sidebar */
  showDivider?: boolean;
  /** Remove top margin from the sidebar */
  noTopMargin?: boolean;
}

export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
      { icon: BarChart3, label: "Analytics", id: "analytics" },
      { icon: Flag, label: "Reports", id: "reports" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        icon: ShoppingBag,
        label: "Listings",
        id: "listings",
        badge: "1.2k",
        children: [
          { label: "All listings", id: "listings" },
          { label: "Pending review", id: "listings-pending" },
          { label: "Flagged", id: "listings-flagged" },
        ],
      },
      {
        icon: Truck,
        label: "Orders",
        id: "orders",
        badge: "38",
        children: [
          { label: "All orders", id: "orders" },
          { label: "In transit", id: "orders-transit" },
          { label: "Disputes", id: "orders-disputes" },
        ],
      },
      { icon: Users, label: "Members", id: "members" },
      { icon: MessageSquare, label: "Messages", id: "messages" },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        icon: BarChart3,
        label: "Transactions",
        id: "transactions",
        children: [
          { label: "All transactions", id: "transactions" },
          { label: "Payouts", id: "payouts" },
          { label: "Refunds", id: "refunds" },
          { label: "Pending", id: "transactions-pending" },
        ],
      },
      {
        icon: Flag,
        label: "Disputes",
        id: "payment-disputes",
        badge: "5",
        children: [
          { label: "Open disputes", id: "payment-disputes" },
          { label: "Under review", id: "disputes-review" },
          { label: "Resolved", id: "disputes-resolved" },
        ],
      },
      {
        icon: ShoppingBag,
        label: "Invoices",
        id: "invoices",
        children: [
          { label: "All invoices", id: "invoices" },
          { label: "Overdue", id: "invoices-overdue" },
        ],
      },
      { icon: BarChart3, label: "Revenue", id: "revenue" },
    ],
  },
  {
    label: "Support",
    items: [
      {
        icon: MessageSquare,
        label: "Tickets",
        id: "tickets",
        badge: "12",
        children: [
          { label: "Open tickets", id: "tickets" },
          { label: "Resolved", id: "tickets-resolved" },
          { label: "Escalated", id: "tickets-escalated" },
          { label: "Awaiting reply", id: "tickets-awaiting" },
        ],
      },
      {
        icon: Users,
        label: "Agents",
        id: "agents",
        children: [
          { label: "All agents", id: "agents" },
          { label: "Performance", id: "agents-performance" },
          { label: "Schedules", id: "agents-schedules" },
        ],
      },
      { icon: HelpCircle, label: "Knowledge base", id: "knowledge-base" },
      { icon: BarChart3, label: "Satisfaction", id: "satisfaction" },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: Settings, label: "General", id: "settings-general" },
      {
        icon: Users,
        label: "Team",
        id: "settings-team",
        children: [
          { label: "Members", id: "settings-team" },
          { label: "Roles", id: "settings-roles" },
          { label: "Invitations", id: "settings-invitations" },
        ],
      },
      { icon: Flag, label: "Permissions", id: "settings-permissions" },
      { icon: HelpCircle, label: "Integrations", id: "settings-integrations" },
      { icon: BarChart3, label: "Audit log", id: "settings-audit" },
    ],
  },
];

const SideNavSidebar = ({ activeNav, setActiveNav, collapsed, onToggleCollapse, hideHeader = false, sectionFilter, hideSections = [], showRightBorder = false, showDivider = false, noTopMargin = false }: SideNavSidebarProps) => {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
    <div className={`flex shrink-0 sticky top-0 h-screen ${noTopMargin ? "" : "pt-2"} relative ${showDivider ? "border-r border-border" : ""}`}>
    <aside
      className={`bg-spacing-bg flex flex-col shrink-0 h-full transition-[width] duration-200 ${
        collapsed ? "w-[60px]" : "w-[256px]"
      } ${showRightBorder ? "border-r border-border" : ""}`}
    >
      {/* Workspace header */}
      {!hideHeader && (
      <div className="px-4 py-3">
        <div className="flex items-center">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-8 h-8 rounded-[6px] overflow-hidden shrink-0">
              <img src={vintedIcon} alt="Vinted" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-[580] text-foreground truncate leading-tight">Vinted Admin</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">Enterprise</p>
              </div>
            )}
          </div>
          {!showDivider && !collapsed && (
            <div className="ml-auto">
              <DesignTooltip content="Collapse sidebar" side="bottom">
                <button
                  onClick={onToggleCollapse}
                  className="w-8 h-8 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </DesignTooltip>
            </div>
          )}
          {!showDivider && collapsed && (
            <div className="ml-1">
              <DesignTooltip content="Expand sidebar" side="right">
                <button
                  onClick={onToggleCollapse}
                  className="w-6 h-6 flex items-center justify-center rounded-[6px] hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
                </button>
              </DesignTooltip>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Nav sections */}
      <nav className={`flex-1 overflow-y-auto ${hideHeader ? "pt-4" : "pt-6 pb-2"} ${collapsed ? "px-2" : "px-3"}`}>
        {(sectionFilter
          ? navSections.filter((s) => s.label === sectionFilter)
          : navSections.filter((s) => !hideSections.includes(s.label))
        ).map((section, index) => (
          <div key={section.label}>
            {index > 0 && (
              <div className={`my-2 border-t border-border ${collapsed ? "mx-1" : "mx-3"}`} />
            )}
            <div className="mb-2">
              <div className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
                {section.items.map((item) => (
                  <SideNavItem key={item.id} item={item} activeNav={activeNav} setActiveNav={setActiveNav} collapsed={collapsed} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </nav>


      {/* User section */}
      <div className="p-3">
        {collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 flex items-center justify-center rounded-[6px] hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
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
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 rounded-[6px] w-full hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium shrink-0">
                  JD
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">John Doe</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">john@vinted.com</p>
                </div>
                <MoreVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-[232px]">
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
        )}
      </div>
    </aside>
      {/* Collapse/expand button centered on divider */}
      {showDivider && !hideHeader && (
        <DesignTooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <button
            onClick={onToggleCollapse}
            className="absolute top-2 -right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-background border border-border text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </button>
        </DesignTooltip>
      )}
    </div>
    </TooltipPrimitive.Provider>
  );
};

export default SideNavSidebar;
