import { useState } from "react";
import SideNavSidebar from "./SideNavSidebar";
import MultiPanelContent from "./MultiPanelContent";

const MultiPanelPreview = () => {
  const [activeNav, setActiveNav] = useState("listings");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen bg-spacing-bg flex overflow-hidden">
      <SideNavSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        hideSections={["Payments", "Support", "Settings"]}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className={`flex-1 pt-6 pb-6 pr-6 flex flex-col min-h-0 ${collapsed ? 'pl-6' : 'pl-0'}`}>
          <MultiPanelContent />
        </main>
      </div>
    </div>
  );
};

export default MultiPanelPreview;
