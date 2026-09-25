import { useState } from "react";
import SideNavSidebar from "./SideNavSidebar";

const SideNavOnlyPreview = () => {
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
      <div className="flex-1" />
    </div>
  );
};

export default SideNavOnlyPreview;
