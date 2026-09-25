import { DesignNotification } from "@/components/ds/DesignNotification";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignLabel } from "@/components/ds/DesignLabel";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { ArrowRight } from "lucide-react";

const props = [
  { name: "body", type: "ReactNode", description: "Notification message content (required)" },
  { name: "variant", type: '"info" | "success" | "warning" | "error"', default: '"info"', description: "Semantic variant controlling icon and color" },
  { name: "icon", type: "ReactNode", description: "Custom icon override (set to null to hide)" },
  { name: "suffix", type: "ReactNode", description: "Content rendered on the right (e.g. action arrow)" },
  { name: "showClose", type: "boolean", default: "false", description: "Show a close/dismiss button" },
  { name: "forceVisibility", type: "boolean", default: "false", description: "Keep notification visible permanently" },
  { name: "displayDuration", type: "number", description: "Duration in ms before auto-dismissing (default 5000)" },
  { name: "onClick", type: "() => void", description: "Handler called when the notification is clicked" },
  { name: "onClose", type: '(closeType: "timeout" | "manual") => void', description: "Handler called when the notification is dismissed" },
];

const NotificationDocs = () => {
  return (
    <div className="p-10 max-w-5xl">
      <PageHeader
        title="Notification"
        description="Toast notification component that appears temporarily to show messages, alerts, or confirmations. Supports semantic variants, icons, close button, and auto-dismiss."
      />

      <ComponentSection title="Variants">
        <div className="w-full space-y-3">
          <DesignNotification
            variant="info"
            body="Your item has been successfully deleted."
            suffix={<ArrowRight className="w-5 h-5 text-primary" />}
            forceVisibility
          />
          <DesignNotification
            variant="success"
            body="Payment confirmed successfully."
            forceVisibility
          />
          <DesignNotification
            variant="warning"
            body="Your listing will expire in 2 days."
            forceVisibility
          />
          <DesignNotification
            variant="error"
            body="Something went wrong. Please try again."
            forceVisibility
          />
        </div>
      </ComponentSection>

      <ComponentSection title="With close button">
        <div className="w-full space-y-3">
          <DesignNotification
            variant="info"
            body="You have 3 unread messages."
            showClose
            forceVisibility
          />
          <DesignNotification
            variant="success"
            body="Profile updated."
            showClose
            forceVisibility
          />
        </div>
      </ComponentSection>

      <ComponentSection title="With suffix action">
        <div className="w-full space-y-3">
          <DesignNotification
            variant="info"
            body="Your item has been successfully deleted."
            suffix={<ArrowRight className="w-5 h-5 text-primary" />}
            forceVisibility
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Clickable">
        <div className="w-full">
          <DesignNotification
            variant="info"
            body="Tap to view your order status."
            onClick={() => {}}
            forceVisibility
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Order status screen with contextual notifications stacked above content.">
        <DesignCard className="w-full max-w-[375px] p-0 overflow-hidden">
          <div className="p-4 space-y-3">
            <DesignNotification
              variant="success"
              body="Your order has been confirmed!"
              showClose
              forceVisibility
            />
            <DesignNotification
              variant="info"
              body="Estimated delivery: March 21–23"
              suffix={<ArrowRight className="w-5 h-5 text-primary" />}
              onClick={() => {}}
              forceVisibility
            />
          </div>
          <DesignDivider />
          <div className="px-0">
            <DesignLabel text="Order details" className="px-4 pt-3" />
            <DesignCell title="Wireless Headphones" subtitle="Qty: 1" suffix={<span className="text-sm text-[var(--text-primary)]">€89.00</span>} />
            <DesignCell title="USB-C Cable" subtitle="Qty: 2" suffix={<span className="text-sm text-[var(--text-primary)]">€12.00</span>} />
            <DesignCell title="Shipping" suffix={<span className="text-sm text-[var(--text-primary)]">Free</span>} />
          </div>
        </DesignCard>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignNotification } from '@/components/ds/DesignNotification';

// Info variant (default)
<DesignNotification
  body="Your item has been successfully deleted."
  forceVisibility
/>

// Success with close button
<DesignNotification
  variant="success"
  body="Payment confirmed."
  showClose
  onClose={(type) => console.log('Closed via', type)}
  forceVisibility
/>

// Auto-dismiss after 5 seconds
<DesignNotification
  variant="warning"
  body="Your listing will expire soon."
  displayDuration={5000}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default NotificationDocs;
