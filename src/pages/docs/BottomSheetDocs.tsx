import { useState } from "react";
import { DesignBottomSheet } from "@/components/ds/DesignBottomSheet";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Shirt, Package, Truck, CreditCard, MapPin, Info } from "lucide-react";

const props = [
  { name: "open", type: "boolean", description: "Controls visibility" },
  { name: "onOpenChange", type: "(open: boolean) => void", description: "Open state callback" },
  { name: "title", type: "string", description: "Sheet heading shown in the navigation bar" },
  { name: "children", type: "ReactNode", description: "Sheet body content" },
  { name: "trigger", type: "ReactNode", description: "Optional trigger element (rendered via Drawer.Trigger)" },
];

const BottomSheetDocs = () => {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  const [show4, setShow4] = useState(false);
  const [show5, setShow5] = useState(false);
  const [show6, setShow6] = useState(false);
  const [showRealWorld, setShowRealWorld] = useState(false);
  const [sortValue, setSortValue] = useState("newest");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["M"]);
  const [selectedAddress, setSelectedAddress] = useState("home");

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <PageHeader
          title="BottomSheet"
          description="Slide-up panel anchored to the bottom of the screen for mobile-friendly overlays. Supports drag-to-dismiss, a navigation header with close button, and scrollable content."
        />

        {/* Basic */}
        <ComponentSection title="Basic" description="Simple content with a call-to-action button.">
          <DesignButton variant="filled" theme="primary" onClick={() => setShow1(true)}>
            Open bottom sheet
          </DesignButton>
          <DesignBottomSheet open={show1} onOpenChange={setShow1} title="Filter items">
            <div className="p-4 space-y-3">
              <p className="text-sm text-content-secondary">
                Use filters to narrow down results and find exactly what you're looking for.
              </p>
              <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShow1(false)}>
                Apply filters
              </DesignButton>
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Sort options with Cell + radio */}
        <ComponentSection title="Sort options" description="DesignCell with controlType='radio' — common sorting pattern.">
          <DesignButton variant="outlined" theme="primary" onClick={() => setShow2(true)}>
            Sort by: {sortValue === "newest" ? "Newest first" : sortValue === "price-low" ? "Price ↑" : sortValue === "price-high" ? "Price ↓" : "Relevance"}
          </DesignButton>
          <DesignBottomSheet open={show2} onOpenChange={setShow2} title="Sort by">
            <div>
              {[
                { id: "relevance", label: "Relevance" },
                { id: "newest", label: "Newest first" },
                { id: "price-low", label: "Price: low to high" },
                { id: "price-high", label: "Price: high to low" },
              ].map((opt, i, arr) => (
                <DesignCell
                  key={opt.id}
                  title={opt.label}
                  controlType="radio"
                  checked={sortValue === opt.id}
                  onCheckedChange={() => {
                    setSortValue(opt.id);
                    setShow2(false);
                  }}
                  showDivider={i < arr.length - 1}
                />
              ))}
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Multi-select with Cell + checkbox */}
        <ComponentSection title="Multi-select" description="DesignCell with controlType='checkbox' for selecting multiple values.">
          <DesignButton variant="outlined" theme="primary" onClick={() => setShow3(true)}>
            Sizes: {selectedSizes.length ? selectedSizes.join(", ") : "All"}
          </DesignButton>
          <DesignBottomSheet open={show3} onOpenChange={setShow3} title="Select sizes">
            <div>
              {["XS", "S", "M", "L", "XL", "XXL"].map((size, i) => (
                <DesignCell
                  key={size}
                  title={size}
                  controlType="checkbox"
                  checked={selectedSizes.includes(size)}
                  onCheckedChange={() => toggleSize(size)}
                  showDivider={i < 5}
                />
              ))}
              <div className="p-4">
                <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShow3(false)}>
                  Apply ({selectedSizes.length} selected)
                </DesignButton>
              </div>
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Action menu with Cell + icons */}
        <ComponentSection title="Action menu" description="DesignCell with icon prop — context menu pattern.">
          <DesignButton variant="outlined" theme="muted" onClick={() => setShow4(true)}>
            Item actions
          </DesignButton>
          <DesignBottomSheet open={show4} onOpenChange={setShow4} title="Actions">
            <div>
              <DesignCell title="Edit listing" icon={Shirt} showDivider onClick={() => setShow4(false)} />
              <DesignCell title="Mark as shipped" icon={Truck} showDivider onClick={() => setShow4(false)} />
              <DesignCell title="View package details" icon={Package} showDivider onClick={() => setShow4(false)} />
              <DesignCell title="Payment info" icon={CreditCard} onClick={() => setShow4(false)} />
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Address selection with Cell + radio + icon */}
        <ComponentSection title="Address picker" description="DesignCell combining icon, subtitle, and radio control.">
          <DesignButton variant="outlined" theme="primary" onClick={() => setShow5(true)}>
            Delivery address
          </DesignButton>
          <DesignBottomSheet open={show5} onOpenChange={setShow5} title="Delivery address">
            <div>
              {[
                { id: "home", label: "Home", detail: "123 Main Street, Apt 4B" },
                { id: "work", label: "Work", detail: "456 Business Ave, Floor 3" },
                { id: "other", label: "Other", detail: "789 Park Lane" },
              ].map((addr, i, arr) => (
                <DesignCell
                  key={addr.id}
                  title={addr.label}
                  subtitle={addr.detail}
                  icon={MapPin}
                  controlType="radio"
                  checked={selectedAddress === addr.id}
                  onCheckedChange={() => {
                    setSelectedAddress(addr.id);
                    setShow5(false);
                  }}
                  showDivider={i < arr.length - 1}
                />
              ))}
              <div className="p-4">
                <DesignButton variant="outlined" theme="primary" fullWidth onClick={() => setShow5(false)}>
                  + Add new address
                </DesignButton>
              </div>
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Scrollable long content */}
        <ComponentSection title="Scrollable content" description="Long text content scrolls within the sheet.">
          <DesignButton variant="outlined" theme="muted" onClick={() => setShow6(true)}>
            Terms & conditions
          </DesignButton>
          <DesignBottomSheet open={show6} onOpenChange={setShow6} title="Buyer Protection">
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-content-secondary">
                  Your purchase is protected by our Buyer Protection policy. If your item doesn't arrive or doesn't match the description, you can request a refund.
                </p>
              </div>
              <DesignDivider />
              <h3 className="text-sm font-medium text-content">What's covered</h3>
              <ul className="text-sm text-content-secondary space-y-2 list-disc pl-4">
                <li>Item not received within the estimated delivery window</li>
                <li>Item significantly different from the listing description</li>
                <li>Item damaged during shipping</li>
                <li>Wrong item received</li>
                <li>Counterfeit items</li>
              </ul>
              <DesignDivider />
              <h3 className="text-sm font-medium text-content">How to file a claim</h3>
              <p className="text-sm text-content-secondary">
                Go to your order details and tap "I have an issue" within 2 days of delivery. Provide photos and a description of the problem. Our team will review your case within 24 hours.
              </p>
              <DesignDivider />
              <p className="text-xs text-content-placeholder">
                Last updated: March 2026. For full terms, visit our Help Center.
              </p>
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Real-world usage */}
        <ComponentSection title="Example: Real-world usage" description="Product page 'Add to bag' sheet with size selection and price summary.">
          <DesignButton variant="filled" theme="primary" onClick={() => setShowRealWorld(true)}>
            Add to bag — €45
          </DesignButton>
          <DesignBottomSheet open={showRealWorld} onOpenChange={setShowRealWorld} title="Select size">
            <div>
              {["XS", "S", "M", "L", "XL"].map((size, i) => (
                <DesignCell
                  key={size}
                  title={size}
                  subtitle={size === "M" ? "Last one!" : "In stock"}
                  controlType="radio"
                  checked={selectedSizes.includes(size)}
                  onCheckedChange={() => {
                    setSelectedSizes([size]);
                  }}
                  showDivider={i < 4}
                />
              ))}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Subtotal</span>
                  <span className="font-medium text-content">€45.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Shipping</span>
                  <span className="font-medium text-content">€4.95</span>
                </div>
                <DesignDivider />
                <div className="flex justify-between text-base">
                  <span className="font-medium text-content">Total</span>
                  <span className="font-semibold text-content">€49.95</span>
                </div>
                <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShowRealWorld(false)}>
                  Add to bag
                </DesignButton>
              </div>
            </div>
          </DesignBottomSheet>
        </ComponentSection>

        {/* Usage */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
          <CodeBlock code={`import { DesignBottomSheet } from '@/components/ds/DesignBottomSheet';
import { DesignCell } from '@/components/ds/DesignCell';

const [visible, setVisible] = useState(false);
const [sort, setSort] = useState("newest");

<DesignBottomSheet open={visible} onOpenChange={setVisible} title="Sort by">
  <DesignCell
    title="Newest first"
    controlType="radio"
    checked={sort === "newest"}
    onCheckedChange={() => setSort("newest")}
    showDivider
  />
  <DesignCell
    title="Price: low to high"
    controlType="radio"
    checked={sort === "price-low"}
    onCheckedChange={() => setSort("price-low")}
  />
</DesignBottomSheet>`} />
        </div>

        {/* Props */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
          <PropsTable props={props} />
        </section>
      </div>
    </div>
  );
};

export default BottomSheetDocs;
