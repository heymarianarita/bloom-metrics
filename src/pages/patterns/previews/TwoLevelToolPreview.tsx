import { useState, useEffect } from "react";
import TwoLevelSidebar from "./TwoLevelSidebar";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignGrid } from "@/components/ds/DesignGrid";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
};

const TwoLevelToolPreview = () => {
  const isSmall = useMediaQuery("(max-width: 1024px)");
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeSubItem, setActiveSubItem] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(isSmall);

  useEffect(() => {
    setCollapsed(isSmall);
  }, [isSmall]);

  return (
    <div className="min-h-screen bg-spacing-bg flex">
      <TwoLevelSidebar
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeSubItem={activeSubItem}
        setActiveSubItem={setActiveSubItem}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 pt-6 pb-6 pr-6 flex flex-col ${collapsed ? 'pl-6' : 'pl-0'}`}>
          <DesignGrid columns={false} className="bg-background rounded-[6px] border border-border p-6 flex-1 flex flex-col">
            <DesignPageHeader
              breadcrumbs={[
                { label: activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1), onClick: () => {} },
                { label: activeSubItem.charAt(0).toUpperCase() + activeSubItem.slice(1) },
              ]}
              title={activeSubItem.charAt(0).toUpperCase() + activeSubItem.slice(1)}
              subtitle={`Viewing ${activeCategory} → ${activeSubItem}`}
              primaryAction={
                <DesignButton variant="filled" theme="primary" size="medium">Save changes</DesignButton>
              }
              secondaryActions={
                <DesignButton variant="outlined" theme="primary" size="medium">Export</DesignButton>
              }
            />
          </DesignGrid>
        </main>
      </div>
    </div>
  );
};

export default TwoLevelToolPreview;
