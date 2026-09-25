import { useState } from "react";
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
import { MoreVertical, LogOut, Settings, HelpCircle } from "lucide-react";

const navItems = ["Overview", "Orders", "Flagged", "Analytics"];

const TopNavOnlyPreview = () => {
  const [activeNav, setActiveNav] = useState("Flagged");

  return (
    <div className="min-h-screen bg-spacing-bg flex flex-col">
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
      <div className="flex-1" />
    </div>
  );
};

export default TopNavOnlyPreview;
