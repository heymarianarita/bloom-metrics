import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import {
  Settings,
  LogOut,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  TrendUp,
  PuzzlePiece,
  BookOpenText,
  Plugs,
  Table,
  Sliders,
  ChartLineUp,
  Cube,
  ClockCounterClockwise,
  UsersThree,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";
import { signOut, useCanEdit, useMyRole, useSession } from "@/hooks/useAuth";
import { ga4PropertySlug, useGa4Analytics } from "@/hooks/useGa4Analytics";
import { useManualMetrics } from "@/hooks/useManualMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAiTemplateDatasetRows } from "@/hooks/useAiTemplateMetrics";
import { usePerformanceEntries } from "@/hooks/usePerformanceEntries";
import { usePerformanceSheet } from "@/hooks/usePerformanceSheet";

export const APP_NAME = "Bloom Metrics";

const PERF_TAB_KEY = "bloom:has-performance";
const readPerfFlag = () => {
  try {
    return localStorage.getItem(PERF_TAB_KEY) === "1";
  } catch {
    return false;
  }
};

export const topTabs = [
  { label: "Metrics", path: "/metrics/impact", match: "/metrics" },
  { label: "OKRs", path: "/okrs", match: "/okrs" },
  { label: "Performance", path: "/performance", match: "/performance" },
];

type NavItem = {
  label: string;
  path: string;
  icon: PhosphorIcon;
  badge?: string;
  children?: { label: string; path: string }[];
};

export const metricsNavItems: NavItem[] = [
  { label: "Impact", path: "/metrics/impact", icon: TrendUp },
  {
    label: "Adoption",
    path: "/metrics/adoption",
    icon: PuzzlePiece,
    children: [
      { label: "Overview", path: "/metrics/adoption" },
      { label: "Figma", path: "/metrics/adoption/design" },
      { label: "AI prototyping", path: "/metrics/adoption/ai-prototyping" },
    ],
  },
  { label: "Documentation", path: "/metrics/documentation", icon: BookOpenText },
];

export const settingsNavItems: NavItem[] = [
  {
    label: "Data",
    path: "/settings/manual-metrics",
    icon: Sliders,
    children: [
      { label: "Datasets", path: "/settings/manual-metrics" },
      { label: "Dynamic sources", path: "/settings/data-sources" },
    ],
  },
  { label: "Metrics", path: "/settings/metrics", icon: ChartLineUp },
  { label: "Components", path: "/settings/components", icon: Cube },
  { label: "Performance", path: "/settings/performance", icon: Table },
  { label: "Data history", path: "/settings/history", icon: ClockCounterClockwise },
];

export const adminNavItems: NavItem[] = [
  { label: "Users", path: "/settings/users", icon: UsersThree },
];

interface AppShellProps {
  children?: ReactNode;
}

const initialsFor = (email?: string | null) =>
  (email ?? "?")
    .split("@")[0]
    .split(/[.\-_]/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const AppShell = ({ children }: AppShellProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: canEdit } = useCanEdit(user);
  const { data: myRole } = useMyRole(user);
  const isAdmin = myRole === "admin";

  // Hide top tabs that have no data behind them.
  const { data: perfEntries, isSuccess: perfEntriesLoaded } = usePerformanceEntries();
  const { data: perfSheet, isSuccess: perfSheetLoaded, isError: perfSheetError } = usePerformanceSheet();
  const hasPerformance =
    (perfEntries?.length ?? 0) > 0 || (perfSheet?.quarters?.length ?? 0) > 0;
  const perfResolved = perfEntriesLoaded && (perfSheetLoaded || perfSheetError);
  // Until the data loads, use what this browser saw last time so the tab doesn't flash in and out.
  const [perfSeen, setPerfSeen] = useState(readPerfFlag);
  useEffect(() => {
    if (!perfResolved) return;
    setPerfSeen(hasPerformance);
    try {
      localStorage.setItem(PERF_TAB_KEY, hasPerformance ? "1" : "0");
    } catch {
      /* private mode: fall back to showing it once loaded */
    }
  }, [perfResolved, hasPerformance]);
  const showPerformance = perfResolved ? hasPerformance : perfSeen;
  const visibleTabs = topTabs.filter((tab) => tab.match !== "/performance" || showPerformance);

  const inSettings = pathname.startsWith("/settings");
  const inMetrics = pathname.startsWith("/metrics");

  // Documentation gets one sub-tab per Google Analytics property.
  const { data: ga4Data } = useGa4Analytics(undefined, undefined, { enabled: inMetrics });
  const documentationChildren = (ga4Data?.properties ?? [])
    .filter((property) => ga4PropertySlug(property))
    .map((property) => ({
      label: property.label || property.id,
      path: `/metrics/documentation/${ga4PropertySlug(property)}`,
    }));

  // Adoption gets one sub-tab per metric configured in Settings → Metrics, named exactly as there.
  const { data: allMetrics } = useManualMetrics();
  const adoptionMetrics = (allMetrics ?? []).filter(
    (metric) => !metric.archived && metric.surface === "Adoption",
  );
  // Hide sidebar entries whose dataset has no rows yet.
  const adoptionDatasetIds = Array.from(
    new Set(adoptionMetrics.filter((m) => m.source_type !== "dynamic" && m.dataset_id).map((m) => m.dataset_id!)),
  ).sort();
  const { data: datasetRowCounts } = useQuery({
    queryKey: ["nav-dataset-row-counts", adoptionDatasetIds],
    enabled: inMetrics && adoptionDatasetIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        adoptionDatasetIds.map(async (id) => {
          const { count } = await supabase
            .from("manual_dataset_rows")
            .select("id", { count: "exact", head: true })
            .eq("dataset_id", id);
          return [id, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });
  const { data: aiRows, isSuccess: aiLoaded } = useAiTemplateDatasetRows();
  const hideAi = aiLoaded && (aiRows?.length ?? 0) === 0;
  const adoptionChildren = adoptionMetrics
    .filter(
      (m) =>
        m.source_type === "dynamic" ||
        !m.dataset_id ||
        !datasetRowCounts ||
        (datasetRowCounts[m.dataset_id] ?? 0) > 0,
    )
    .map((metric) => ({ label: metric.name, path: `/metrics/adoption/${metric.slug}` }));

  const metricsItems = metricsNavItems.map((item) => {
    if (item.path === "/metrics/documentation" && documentationChildren.length) {
      return {
        ...item,
        children: [{ label: "Overview", path: "/metrics/documentation" }, ...documentationChildren],
      };
    }
    if (item.path === "/metrics/adoption") {
      const base = item.children ?? [];
      return {
        ...item,
        children: [
          ...base.slice(0, 2),
          ...adoptionChildren,
          ...base.slice(2).filter((c) => !(hideAi && c.path === "/metrics/adoption/ai-prototyping")),
        ],
      };
    }
    return item;
  });

  const navItems = inSettings
    ? isAdmin
      ? [...settingsNavItems, ...adminNavItems]
      : settingsNavItems
    : metricsItems;
  const showSidebar = pathname.startsWith("/metrics") || inSettings;

  return (
    <div className="h-screen bg-spacing-bg flex flex-col overflow-hidden">
      {/* Top Bar — global navigation */}
      <TooltipProvider>
        <nav className="h-14 w-full bg-primary-dark flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <img
                src={vintedIconRounded}
                alt="Bloom Metrics logo"
                className="h-8 w-8 rounded-[6px] shrink-0"
              />
              <span className="text-white font-medium text-sm">{APP_NAME}</span>
            </div>
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {visibleTabs.map((tab) => {
                  const isActive = pathname.startsWith(tab.match);
                  return (
                    <NavigationMenuItem key={tab.label}>
                      <NavigationMenuLink asChild>
                        <NavLink
                          to={tab.path}
                          className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors min-h-[32px] cursor-pointer
                            ${
                              isActive
                                ? "bg-white/[0.12] text-white"
                                : "text-white/70 hover:bg-white/[0.06] active:bg-white/[0.08]"
                            }`}
                        >
                          {tab.label}
                        </NavLink>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Settings"
                    onClick={() => navigate("/settings/data-sources")}
                    className={`w-9 h-9 rounded-[6px] text-white hover:text-white active:text-white hover:bg-white/10 active:bg-white/25 ${
                      inSettings ? "bg-white/[0.12]" : ""
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Settings</TooltipContent>
              </Tooltip>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-1 h-9 px-3 rounded-[6px] text-white text-sm font-normal hover:text-white active:text-white hover:bg-white/10 active:bg-white/25 data-[state=open]:bg-white/[0.12]"
                  >
                    {user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    onClick={async () => {
                      await signOut();
                      navigate("/metrics");
                    }}
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="gap-2 text-white text-sm font-medium rounded-[6px] hover:text-white hover:bg-white/10 active:bg-white/25"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </Button>
            )}
          </div>
        </nav>
      </TooltipProvider>

      {/* Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {showSidebar && (
          <aside
            className={`bg-spacing-bg flex flex-col shrink-0 h-full pt-2 transition-[width] duration-200 ${
              collapsed ? "w-[60px]" : "w-[220px]"
            }`}
          >
            {/* Subsection navigation */}
            <nav
              className={`flex-1 overflow-y-auto pt-4 ${collapsed ? "px-2" : "px-3"}`}
            >
              <div className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
                {navItems.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                  <div key={item.path} className={collapsed ? "" : "w-full"}>
                  <NavLink to={item.path} end={!item.children}>
                    {({ isActive }) =>
                      collapsed ? (
                        <DesignTooltip content={item.label} side="right">
                          <span
                            className={`w-10 h-10 flex items-center justify-center rounded-[6px] transition-colors
                              ${
                                isActive
                                  ? "text-[var(--primary-extra-dark)] bg-[rgba(0,119,130,0.08)]"
                                  : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                              }`}
                          >
                            <ItemIcon size={16} className="shrink-0" />
                          </span>
                        </DesignTooltip>
                      ) : (
                        <span
                          className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors w-full
                            ${
                              isActive
                                ? "text-[var(--primary-extra-dark)] bg-[rgba(0,119,130,0.08)]"
                                : "text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                            }`}
                        >
                          <ItemIcon size={16} className="shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </span>
                      )
                    }
                  </NavLink>
                  {!collapsed &&
                    item.children &&
                    (pathname.startsWith(item.path) ||
                      item.children.some((child) => pathname.startsWith(child.path))) && (
                      <div className="ml-[19px] mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-border pl-3">
                        {item.children.map((child) => (
                          <NavLink key={child.path} to={child.path} end>
                            {({ isActive }) => (
                              <span
                                className={`flex items-center px-3 py-1.5 rounded-[6px] text-sm transition-colors w-full
                                  ${
                                    isActive
                                      ? "text-foreground font-medium bg-[rgba(0,119,130,0.06)]"
                                      : "text-muted-foreground font-normal hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)]"
                                  }`}
                              >
                                {child.label}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </nav>

            {/* Sidebar footer */}
            <div className="p-3">
              <div>

                <DesignTooltip
                  content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  side="right"
                >
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`h-8 flex items-center justify-center rounded-[6px] text-muted-foreground hover:bg-[rgba(0,119,130,0.06)] active:bg-[rgba(0,119,130,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      collapsed ? "w-10 mx-auto" : "w-8 ml-3"
                    }`}
                  >
                    {collapsed ? (
                      <PanelLeftOpen className="w-4 h-4" />
                    ) : (
                      <PanelLeftClose className="w-4 h-4" />
                    )}
                  </button>
                </DesignTooltip>
              </div>
            </div>
          </aside>
        )}

        {/* Content area — scrolls independently */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <main className="flex-1 p-4 flex flex-col min-h-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export { AppShell };
export default AppShell;
