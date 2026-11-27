import { useState, useEffect } from "react";
import TwoLevelSidebar from "./TwoLevelSidebar";
import MultiPanelContent from "./MultiPanelContent";

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

const TwoLevelMultiPanelPreview = () => {
  const isSmall = useMediaQuery("(max-width: 1024px)");
  const [activeCategory, setActiveCategory] = useState("overview");
  const [activeSubItem, setActiveSubItem] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(isSmall);

  useEffect(() => {
    setCollapsed(isSmall);
  }, [isSmall]);

  return (
    <div className="h-screen bg-spacing-bg flex overflow-hidden">
      <TwoLevelSidebar
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        activeSubItem={activeSubItem}
        setActiveSubItem={setActiveSubItem}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className={`flex-1 pt-6 pb-6 pr-6 flex flex-col min-h-0 ${collapsed ? 'pl-6' : 'pl-0'}`}>
          <MultiPanelContent />
        </main>
      </div>
    </div>
  );
};

export default TwoLevelMultiPanelPreview;
