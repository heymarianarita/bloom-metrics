import { useState } from "react";
import SideNavSidebar from "./SideNavSidebar";
import WhiteSideNavContent from "./WhiteSideNavContent";

const WhiteSideNavPreview = () => {
  const [activeNav, setActiveNav] = useState("listings");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-spacing-bg flex">
      {/* White background sidebar wrapper */}
      <div className="[&_aside]:bg-background [&_aside]:border-r [&_aside]:border-border">
        <SideNavSidebar
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          hideSections={["Overview", "Payments", "Support", "Settings"]}
          noTopMargin
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 pt-6 pb-6 pr-6 flex flex-col ${collapsed ? 'pl-6' : 'pl-6'}`}>
          <WhiteSideNavContent />
        </main>
      </div>
    </div>
  );
};

export default WhiteSideNavPreview;
