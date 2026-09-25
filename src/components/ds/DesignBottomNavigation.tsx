import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Home, Search, PlusCircle, Mail, User } from "lucide-react";

const bottomNavVariants = cva(
  "flex items-center justify-around w-full h-14 bg-background border-t border-divider font-sans"
);

const bottomNavItemVariants = cva(
  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 cursor-pointer transition-colors",
  {
    variants: {
      active: {
        true: "text-primary",
        false: "text-content-secondary",
      },
    },
    defaultVariants: { active: false },
  }
);

export interface BottomNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: boolean | number;
}

const defaultIcons: Record<string, React.ReactNode> = {
  home: <Home className="w-6 h-6" />,
  search: <Search className="w-6 h-6" />,
  sell: <PlusCircle className="w-6 h-6" />,
  inbox: <Mail className="w-6 h-6" />,
  profile: <User className="w-6 h-6" />,
};

export interface DesignBottomNavigationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof bottomNavVariants> {
  items: BottomNavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
}

const DesignBottomNavigation = React.forwardRef<HTMLElement, DesignBottomNavigationProps>(
  ({ className, items, activeId, onItemClick, ...props }, ref) => {
    return (
      <nav ref={ref} className={cn(bottomNavVariants({ className }))} {...props}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(bottomNavItemVariants({ active: isActive }))}
            >
              <div className="relative">
                {item.icon || defaultIcons[item.id.toLowerCase()] || <Home className="w-6 h-6" />}
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[8px] h-2 bg-destructive rounded-full" />
                )}
              </div>
              <span className="text-[11px] leading-[14px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }
);

DesignBottomNavigation.displayName = "DesignBottomNavigation";

export { DesignBottomNavigation };
