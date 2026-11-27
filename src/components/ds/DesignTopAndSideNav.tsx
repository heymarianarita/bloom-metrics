import { useState, ReactNode } from "react";
import SideNavSidebar, { navSections } from "@/pages/patterns/previews/SideNavSidebar";
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
import { MoreVertical, Settings, HelpCircle, LogOut } from "lucide-react";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";

interface DesignTopAndSideNavProps {
  /** Navigation tabs displayed in the top bar (defaults to sidebar section labels) */
  navTabs?: string[];
  /** Currently active top tab */
  activeTab?: string;
  /** Callback when a top tab is selected */
  onTabChange?: (tab: string) => void;
  /** Currently active sidebar nav item */
  activeNav?: string;
  /** Callback when a sidebar nav item is selected */
  onNavChange?: (id: string) => void;
  /** Logo image source */
  logoSrc?: string;
  /** Logo alt text */
  logoAlt?: string;
  /** Title displayed next to the logo */
  title?: string;
  /** User display name */
  userName?: string;
  /** User initials for avatar */
  userInitials?: string;
  /** Content to render in the main area */
  children?: ReactNode;
}

const DesignTopAndSideNav = ({
  navTabs,
  activeTab: controlledActiveTab,
  onTabChange,
  activeNav: controlledActiveNav,
  onNavChange,
  logoSrc = vintedIconRounded,
  logoAlt = "Logo",
  title = "Vinted Admin",
  userName = "John Doe",
  userInitials = "JD",
  children,
}: DesignTopAndSideNavProps) => {
  const sectionLabels = navTabs ?? navSections.map((s) => s.label);
  const [internalActiveTab, setInternalActiveTab] = useState(sectionLabels.includes("Marketplace") ? "Marketplace" : sectionLabels[0] || "");
  const [internalActiveNav, setInternalActiveNav] = useState("listings");
  const [collapsed, setCollapsed] = useState(false);

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const handleTabChange = (tab: string) => {
    (onTabChange ?? setInternalActiveTab)(tab);
    // Auto-select the first item in the new section
    const section = navSections.find((s) => s.label === tab);
    if (section && section.items.length > 0) {
      const firstItem = section.items[0];
      const firstId = firstItem.children ? firstItem.children[0].id : firstItem.id;
      (onNavChange ?? setInternalActiveNav)(firstId);
    }
  };
  const activeNav = controlledActiveNav ?? internalActiveNav;
  const handleNavChange = onNavChange ?? setInternalActiveNav;

  return (
    <div className="h-screen bg-spacing-bg flex flex-col overflow-hidden">
      {/* Top Bar */}
      <TooltipProvider>
        <nav className="h-14 w-full bg-primary-dark flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt={logoAlt} className="h-8 w-8 rounded-[6px] shrink-0" />
              <span className="text-white font-medium text-sm">{title}</span>
            </div>
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {sectionLabels.map((item) => (
                  <NavigationMenuItem key={item}>
                    <NavigationMenuLink
                      onClick={() => handleTabChange(item)}
                      className={`px-4 py-2 rounded-[6px] text-sm font-medium transition-colors min-h-[32px] cursor-pointer
                        ${activeTab === item
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
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">{userName}</span>
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

      {/* Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        <SideNavSidebar
          activeNav={activeNav}
          setActiveNav={handleNavChange}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          hideHeader
          sectionFilter={activeTab}
          showDivider={false}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <main className="flex-1 p-4 flex flex-col min-h-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export { DesignTopAndSideNav };
export default DesignTopAndSideNav;
