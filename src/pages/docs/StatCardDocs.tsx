import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { DesignStatCard } from "@/components/ds/DesignStatCard";
import { Users, Package, BarChart3, Euro, ShoppingBag } from "lucide-react";

const props = [
  { name: "label", type: "string", required: true, description: "Label displayed at the top-left of the card" },
  { name: "value", type: "string", required: true, description: "Main metric value" },
  { name: "change", type: "string", required: false, description: 'Change indicator text (e.g. "+12%")' },
  { name: "changeUp", type: "boolean", required: false, default: "true", description: "Whether the change is positive (success) or negative (error)" },
  { name: "icon", type: "ReactNode", required: false, description: "Icon displayed at the top-right of the card" },
  { name: "variant", type: '"default" | "lifted" | "elevated"', required: false, default: '"default"', description: "Card variant passed to underlying DesignCard" },
];

const StatCardDocs = () => (
  <div className="space-y-10">
    <PageHeader
      title="StatCard"
      description="A pre-composed metric card used in dashboards to display a stat label, value, trend badge, and an optional icon."
    />

    {/* Default */}
    <ComponentSection title="Default" description="Basic stat card with label, value, change badge, and icon.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <DesignStatCard label="Total Users" value="2,847" change="+12%" changeUp icon={<Users className="w-5 h-5" />} />
        <DesignStatCard label="Active Orders" value="184" change="+8%" changeUp icon={<Package className="w-5 h-5" />} />
        <DesignStatCard label="Revenue" value="€24,500" change="+23%" changeUp icon={<BarChart3 className="w-5 h-5" />} />
      </div>
    </ComponentSection>

    {/* Negative change */}
    <ComponentSection title="Negative change" description="When the trend is negative, the badge shows an error theme.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <DesignStatCard label="Conversion Rate" value="3.2%" change="-0.4%" changeUp={false} icon={<BarChart3 className="w-5 h-5" />} />
        <DesignStatCard label="Total Sales" value="€124,500" change="+18%" changeUp icon={<Euro className="w-5 h-5" />} />
      </div>
    </ComponentSection>

    {/* Without change */}
    <ComponentSection title="Without change badge" description="The change prop is optional — omit it for a simpler display.">
      <div className="max-w-xs">
        <DesignStatCard label="Active Listings" value="8,432" icon={<ShoppingBag className="w-5 h-5" />} />
      </div>
    </ComponentSection>

    {/* Lifted variant */}
    <ComponentSection title="Lifted variant" description="Use variant='lifted' for a shadow-based elevation style.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <DesignStatCard variant="lifted" label="Total Users" value="2,847" change="+12%" changeUp icon={<Users className="w-5 h-5" />} />
        <DesignStatCard variant="lifted" label="Active Orders" value="184" change="+8%" changeUp icon={<Package className="w-5 h-5" />} />
        <DesignStatCard variant="lifted" label="Revenue" value="€24,500" change="+23%" changeUp icon={<BarChart3 className="w-5 h-5" />} />
      </div>
    </ComponentSection>

    {/* Props */}
    <ComponentSection title="Props">
      <PropsTable props={props} />
    </ComponentSection>
  </div>
);

export default StatCardDocs;
