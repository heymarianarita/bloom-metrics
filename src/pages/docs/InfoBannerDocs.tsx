import { useState } from "react";
import { DesignInfoBanner } from "@/components/ds/DesignInfoBanner";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { CreditCard, Truck, Package } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "type", type: '"info" | "success" | "warning" | "error"', default: '"info"', description: "Semantic type — controls color and icon" },
  { name: "title", type: "string", description: "Optional bold heading above the body" },
  { name: "description", type: "string", description: "Main body content of the banner" },
  { name: "onClose", type: "() => void", description: "Callback when dismiss button is clicked" },
  { name: "showCloseButton", type: "boolean", default: "true", description: "Shows a dismiss button" },
  { name: "actionLabel", type: "string", description: "Action button label" },
  { name: "onAction", type: "() => void", description: "Action button callback" },
  { name: "linkLabel", type: "string", description: "Link label" },
  { name: "linkHref", type: "string", description: "Link URL" },
];

const InfoBannerDocs = () => {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    info: true, success: true, warning: true, error: true,
  });

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="InfoBanner"
        description="An inline message banner for conveying contextual information, warnings, errors, or success states to the user."
      />

      <ComponentSection title="Types" description="Controls the semantic color and leading icon of the banner.">
        <div className="w-full space-y-3">
          {(["info", "success", "warning", "error"] as const).map((type) => (
            visible[type] && (
              <DesignInfoBanner
                key={type}
                type={type}
                title={`${type.charAt(0).toUpperCase() + type.slice(1)} banner`}
                description={`This is a ${type} message with relevant information for the user.`}
                onClose={() => setVisible((prev) => ({ ...prev, [type]: false }))}
              />
            )
          ))}
          {!Object.values(visible).some(Boolean) && (
            <button className="text-sm text-primary hover:underline" onClick={() => setVisible({ info: true, success: true, warning: true, error: true })}>
              Reset all banners
            </button>
          )}
        </div>
      </ComponentSection>

      <ComponentSection title="With title" description="An optional title adds a bold heading above the body.">
        <div className="w-full space-y-3">
          <DesignInfoBanner type="info" title="Shipping update" description="Your tracking number is available in the order details." showCloseButton={false} />
          <DesignInfoBanner type="warning" title="Account suspended" description="Your account has been temporarily suspended pending review." showCloseButton={false} />
        </div>
      </ComponentSection>

      <ComponentSection title="With actions" description="Add action buttons or links below the body.">
        <div className="w-full space-y-3">
          <DesignInfoBanner
            type="warning"
            title="Verify your phone number"
            description="To continue selling, please verify your phone number."
            actionLabel="Verify now"
            showCloseButton={false}
          />
          <DesignInfoBanner
            type="info"
            description="New buyer protection policy is now active."
            linkLabel="Learn more"
            linkHref="#"
            showCloseButton={false}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Order detail screen with contextual banners above order info.">
        <div className="w-full max-w-md mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
          <div className="p-4">
            <DesignInfoBanner
              type="success"
              title="Payment received"
              description="€49.95 has been charged to your Visa ending in 4242."
              showCloseButton={false}
            />
          </div>
          <DesignDivider margin={0} />
          <DesignCell title="Vintage Denim Jacket" subtitle="€45.00" icon={Package} showDivider />
          <DesignCell title="Shipping" subtitle="€4.95" icon={Truck} showDivider />
          <DesignCell title="Visa •••• 4242" suffix={<DesignBadge theme="success" styling="light">Paid</DesignBadge>} icon={CreditCard} />
          <div className="p-4">
            <DesignInfoBanner
              type="info"
              description="Your tracking number will be available once the seller ships your item."
              showCloseButton={false}
              linkLabel="Track order"
              linkHref="#"
            />
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignInfoBanner } from '@/components/ds/DesignInfoBanner';

// Basic info banner
<DesignInfoBanner
  type="info"
  description="Your parcel is on its way."
/>

// With title and close button
<DesignInfoBanner
  type="warning"
  title="Verify your account"
  description="Complete verification to keep selling."
  onClose={handleClose}
/>

// With action
<DesignInfoBanner
  type="error"
  description="Payment failed."
  actionLabel="Update card"
  onAction={handleUpdate}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default InfoBannerDocs;
