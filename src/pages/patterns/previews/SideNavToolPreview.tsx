import { useState } from "react";
import SideNavSidebar from "./SideNavSidebar";
import SideNavInternalContent from "./SideNavInternalContent";

const SideNavToolPreview = () => {
  const [activeNav, setActiveNav] = useState("listings");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-spacing-bg flex">
      <SideNavSidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        hideSections={["Payments", "Support", "Settings"]}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 pt-6 pb-6 pr-6 flex flex-col ${collapsed ? 'pl-6' : 'pl-0'}`}>
          <SideNavInternalContent />
        </main>
      </div>
    </div>
  );
};

export default SideNavToolPreview;
