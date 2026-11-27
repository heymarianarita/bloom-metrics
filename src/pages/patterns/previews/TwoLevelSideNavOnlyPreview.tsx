import { useState, useEffect } from "react";
import TwoLevelSidebar from "./TwoLevelSidebar";

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

const TwoLevelSideNavOnlyPreview = () => {
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
      <div className="flex-1" />
    </div>
  );
};

export default TwoLevelSideNavOnlyPreview;
