import { useState } from "react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
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

const anatomyItems = [
  { name: "Container", description: "Full-width bar, 56px height (h-14), primary-dark background. Flex layout with justify-between." },
  { name: "Left section", description: "Brand logo + app name, followed by horizontal navigation tabs with a 48px gap (gap-12)." },
  { name: "Navigation tabs", description: "Inline links using NavigationMenu. Active tab has white/12% background; inactive is white/70% with hover at white/6%." },
  { name: "Right section", description: "Action buttons: user avatar with name, and a MoreVertical dropdown for secondary actions." },
];

const specRows = [
  { spec: "Height", value: "56px (h-14)" },
  { spec: "Background", value: "--primary-dark" },
  { spec: "Padding", value: "0 16px (px-4)" },
  { spec: "Text color", value: "white" },
  { spec: "Font size (tabs)", value: "14px (text-sm), font-medium" },
  { spec: "Tab border radius", value: "6px" },
  { spec: "Tab padding", value: "8px 16px (py-2 px-4)" },
  { spec: "Tab min-height", value: "32px" },
  { spec: "Icon size", value: "16×16px (w-4 h-4) for nav icons, 20×20px (w-5 h-5) for menu trigger" },
  { spec: "Avatar size", value: "32×32px (w-8 h-8)" },
  { spec: "Logo gap to nav", value: "48px (gap-12)" },
];

const stateRows = [
  { state: "Tab — Default", description: "Text white/70%. No background." },
  { state: "Tab — Hover", description: "Background white/6%." },
  { state: "Tab — Active/Pressed", description: "Background white/8%." },
  { state: "Tab — Selected", description: "Background white/12%. Text full white." },
  { state: "Icon button — Hover", description: "Background white/10%." },
  { state: "Icon button — Active", description: "Background white/25%." },
];

const TopBarDocs = () => {
  const [activeNav, setActiveNav] = useState("Overview");
  const navItems = ["Overview", "Orders", "Flagged", "Analytics"];

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Top Bar"
        description="A full-width horizontal navigation bar used at the top of internal tool layouts. Contains brand identity, inline navigation tabs, and user actions."
      />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Pattern note:</strong> This is a <strong>composed pattern</strong>, not a single design-system component. It combines NavigationMenu, Avatar, DropdownMenu, and Tooltip primitives with Mini-Bloom tokens. See <a href="/patterns/pattern-1/preview" className="text-primary underline">Pattern 1 preview</a> for the full implementation.
      </div>

      {/* Live preview */}
      <ComponentSection title="Default">
        <div className="w-full rounded-[6px] overflow-hidden">
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
                      <Settings className="w-4 h-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer">
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>
          </TooltipProvider>
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

      {/* Specs */}
      <ComponentSection title="Design specs">
        <div className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium w-[200px]">Property</th>
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

      {/* Usage code */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

<nav className="h-14 w-full bg-primary-dark flex items-center justify-between px-4">
  {/* Left: Brand + Tabs */}
  <div className="flex items-center gap-12">
    <div className="flex items-center gap-2">
      <img src={vintedIconRounded} alt="Logo" className="h-8 w-8 rounded-[6px]" />
      <span className="text-white font-medium text-sm">App Name</span>
    </div>
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {tabs.map((tab) => (
          <NavigationMenuItem key={tab}>
            <NavigationMenuLink
              onClick={() => setActive(tab)}
              className={\`px-4 py-2 rounded-[6px] text-sm font-medium cursor-pointer
                \${active === tab
                  ? "bg-white/[0.12] text-white"
                  : "text-white/70 hover:bg-white/[0.06]"
                }\`}
            >
              {tab}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  </div>

  {/* Right: User + Actions */}
  <div className="flex items-center gap-2">
    <Avatar className="w-8 h-8">
      <AvatarFallback className="bg-white/20 text-white text-xs">JD</AvatarFallback>
    </Avatar>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-[6px] text-white hover:bg-white/10">
          <MoreVertical className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</nav>`} />
      </div>
    </div>
  );
};

export default TopBarDocs;
