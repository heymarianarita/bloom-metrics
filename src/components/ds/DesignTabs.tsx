import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignTab {
  id: string;
  label: string;
  badge?: number;
}

export interface DesignTabsProps {
  tabs: DesignTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const DesignTabs = React.forwardRef<HTMLDivElement, DesignTabsProps>(
  ({ tabs, activeTab, onTabChange, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex border-b border-divider", className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{ fontWeight: 375 }}
            className={cn(
              "flex-1 py-3 text-center text-sm transition-colors relative font-sans whitespace-nowrap",
              activeTab === tab.id ? "text-content" : "text-content-secondary"
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && <span className="ml-1">{tab.badge}</span>}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>
    );
  }
);

DesignTabs.displayName = "DesignTabs";

export { DesignTabs };
