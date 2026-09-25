import { useState } from "react";
import { DesignBottomNavigation } from "@/components/ds/DesignBottomNavigation";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Home, Search, PlusCircle, Mail, User, Heart, ShoppingBag, Bell, Settings } from "lucide-react";

const props = [
  { name: "items", type: "BottomNavItem[]", description: "Navigation items array with id, label, optional icon and badge" },
  { name: "activeId", type: "string", description: "ID of the currently active item" },
  { name: "onItemClick", type: "(id: string) => void", description: "Called when an item is tapped" },
];

const itemProps = [
  { name: "id", type: "string", description: "Unique identifier for the item" },
  { name: "label", type: "string", description: "Text label displayed below the icon" },
  { name: "icon", type: "ReactNode", description: "Custom icon (defaults to built-in icons matching id)" },
  { name: "badge", type: "boolean | number", description: "Shows a red dot indicator on the icon" },
];

const defaultItems = [
  { id: "home", label: "Home" },
  { id: "search", label: "Search" },
  { id: "sell", label: "Sell" },
  { id: "inbox", label: "Inbox" },
  { id: "profile", label: "Profile" },
];

const BottomNavigationDocs = () => {
  const [active1, setActive1] = useState("home");
  const [active2, setActive2] = useState("home");
  const [active3, setActive3] = useState("feed");
  const [active4, setActive4] = useState("home");

  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <PageHeader
          title="BottomNavigation"
          description="Mobile bottom tab bar for primary app navigation with icons, labels, and badge indicators. Tap each tab to see it become active."
        />

        {/* Default */}
        <ComponentSection title="Default" description="Standard 5-tab layout. Click any tab to navigate.">
          <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
            <div className="h-40 flex items-center justify-center bg-docs-code/30">
              <span className="text-sm text-docs-muted capitalize">{active1} screen</span>
            </div>
            <DesignBottomNavigation
              items={defaultItems}
              activeId={active1}
              onItemClick={setActive1}
            />
          </div>
        </ComponentSection>

        {/* With badges */}
        <ComponentSection title="With badges" description="Badge dots indicate unread content. Try switching tabs.">
          <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
            <div className="h-40 flex items-center justify-center bg-docs-code/30">
              <span className="text-sm text-docs-muted capitalize">{active2} screen</span>
            </div>
            <DesignBottomNavigation
              items={[
                { id: "home", label: "Home" },
                { id: "search", label: "Search" },
                { id: "sell", label: "Sell" },
                { id: "inbox", label: "Inbox", badge: true },
                { id: "profile", label: "Profile", badge: true },
              ]}
              activeId={active2}
              onItemClick={setActive2}
            />
          </div>
        </ComponentSection>

        {/* Custom icons */}
        <ComponentSection title="Custom icons" description="Pass custom icons via the icon prop.">
          <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
            <div className="h-40 flex items-center justify-center bg-docs-code/30">
              <span className="text-sm text-docs-muted capitalize">{active3} screen</span>
            </div>
            <DesignBottomNavigation
              items={[
                { id: "feed", label: "Feed", icon: <Home className="w-6 h-6" /> },
                { id: "favorites", label: "Favorites", icon: <Heart className="w-6 h-6" /> },
                { id: "orders", label: "Orders", icon: <ShoppingBag className="w-6 h-6" /> },
                { id: "alerts", label: "Alerts", icon: <Bell className="w-6 h-6" />, badge: true },
                { id: "settings", label: "Settings", icon: <Settings className="w-6 h-6" /> },
              ]}
              activeId={active3}
              onItemClick={setActive3}
            />
          </div>
        </ComponentSection>

        {/* 3-tab variant */}
        <ComponentSection title="3-tab variant" description="Works with fewer items too.">
          <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
            <div className="h-40 flex items-center justify-center bg-docs-code/30">
              <span className="text-sm text-docs-muted capitalize">{active4} screen</span>
            </div>
            <DesignBottomNavigation
              items={[
                { id: "home", label: "Home" },
                { id: "search", label: "Search" },
                { id: "profile", label: "Profile" },
              ]}
              activeId={active4}
              onItemClick={setActive4}
            />
          </div>
        </ComponentSection>

        {/* Real-world usage */}
        <ComponentSection title="Example: Real-world usage" description="E-commerce app with product grid and bottom navigation.">
          <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
             <div className="p-4 space-y-3 bg-background">
              <DesignNavigation title="Discover" theme="none" showDivider={false} />
              <div className="grid grid-cols-2 gap-3 px-4">
                {[
                  { name: "Vintage Jacket", price: "€45" },
                  { name: "Sneakers", price: "€62" },
                  { name: "Leather Bag", price: "€89" },
                  { name: "Silk Scarf", price: "€28" },
                ].map((item) => (
                  <DesignCard key={item.name} variant="lifted" className="overflow-hidden">
                    <div className="h-20 bg-muted flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-content-secondary" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-content truncate">{item.name}</p>
                      <p className="text-xs text-primary font-medium">{item.price}</p>
                    </div>
                  </DesignCard>
                ))}
              </div>
            </div>
            <DesignBottomNavigation
              items={[
                { id: "home", label: "Home" },
                { id: "search", label: "Search" },
                { id: "sell", label: "Sell" },
                { id: "inbox", label: "Inbox", badge: true },
                { id: "profile", label: "Profile" },
              ]}
              activeId={active1}
              onItemClick={setActive1}
            />
          </div>
        </ComponentSection>

        {/* Usage */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
          <CodeBlock code={`import { DesignBottomNavigation } from '@/components/ds/DesignBottomNavigation';

const [active, setActive] = useState("home");

<DesignBottomNavigation
  items={[
    { id: "home", label: "Home" },
    { id: "search", label: "Search" },
    { id: "sell", label: "Sell" },
    { id: "inbox", label: "Inbox", badge: true },
    { id: "profile", label: "Profile" },
  ]}
  activeId={active}
  onItemClick={setActive}
/>`} />
        </div>

        {/* Props */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Component Props</h2>
          <PropsTable props={props} />
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-4">BottomNavItem</h2>
          <PropsTable props={itemProps} />
        </section>
      </div>
    </div>
  );
};

export default BottomNavigationDocs;
