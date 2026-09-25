import { useState } from "react";
import { DesignDialog } from "@/components/ds/DesignDialog";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignNote } from "@/components/ds/DesignNote";
import { DesignNavigation } from "@/components/ds/DesignNavigation";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { DesignLabel } from "@/components/ds/DesignLabel";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { DesignCell } from "@/components/ds/DesignCell";
import { AlertCircle, X, ShieldCheck, Package, Share2, Copy, Flag, EyeOff, Heart } from "lucide-react";
const props = [
  { name: "open", type: "boolean", description: "Controls visibility" },
  { name: "onOpenChange", type: "(open: boolean) => void", description: "Open state callback" },
  { name: "title", type: "string", description: "Dialog heading" },
  { name: "children", type: "ReactNode", description: "Dialog body content" },
  { name: "trigger", type: "ReactNode", description: "Element that triggers the dialog" },
  { name: "style", type: '"modal" | "fullScreen"', default: '"modal"', description: "Dialog display style" },
  { name: "hideClose", type: "boolean", default: "false", description: "Hide the close button" },
  { name: "icon", type: "ReactNode", description: "Icon displayed above the title" },
];

const DialogDocs = () => {
  const [showDiscard, setShowDiscard] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader
        title="Dialog"
        description="Modal dialog for confirmations, alerts, warnings, and focused user tasks."
      />

      {/* Discard changes */}
      <ComponentSection title="Destructive — Discard changes">
        <DesignButton variant="filled" theme="error" onClick={() => setShowDiscard(true)}>Discard changes</DesignButton>
        <DesignDialog open={showDiscard} onOpenChange={setShowDiscard} title="Discard changes?" hideClose>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">You won't be able to undo this action.</p>
            <div className="flex flex-col gap-2 pt-2">
              <DesignButton variant="filled" theme="error" fullWidth onClick={() => setShowDiscard(false)}>Delete</DesignButton>
              <DesignButton variant="flat" theme="error" fullWidth onClick={() => setShowDiscard(false)}>Cancel</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* Warning with icon */}
      <ComponentSection title="Warning with icon">
        <DesignButton variant="filled" theme="error" onClick={() => setShowWarning(true)}>Show warning</DesignButton>
        <DesignDialog
          open={showWarning}
          onOpenChange={setShowWarning}
          title="Sharing your email can lead to phishing attacks"
          hideClose
          icon={
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Scammers may act as trusted contacts, using your data to manipulate others and compromise your security.{" "}
              <a href="#" className="text-destructive underline">See phishing examples</a>
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <DesignButton variant="filled" theme="error" fullWidth onClick={() => setShowWarning(false)}>Edit message</DesignButton>
              <DesignButton variant="flat" theme="error" fullWidth onClick={() => setShowWarning(false)}>Proceed at your own risk</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* Form dialog with close */}
      <ComponentSection title="Form — Make an offer">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowOffer(true)}>Make an offer</DesignButton>
        <DesignDialog open={showOffer} onOpenChange={setShowOffer} title="Make an offer">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Offer your price</label>
              <DesignInputText placeholder="€0.00" className="mt-1" />
            </div>
            <DesignNote text="You have 5 offer(s) left today. This limit makes it easier for members to manage and review them." />
            <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShowOffer(false)}>Make an offer</DesignButton>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* Error / Something went wrong */}
      <ComponentSection title="Error — Something went wrong">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowError(true)}>Trigger error</DesignButton>
        <DesignDialog open={showError} onOpenChange={setShowError} title="Something went wrong" hideClose>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">Content not found. Please try again later.</p>
            <div className="pt-2">
              <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShowError(false)}>Close</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Price breakdown */}
      <ComponentSection title="With Navigation — Price breakdown">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowPrice(true)}>Price breakdown</DesignButton>
        <DesignDialog open={showPrice} onOpenChange={setShowPrice} hideClose>
         <div className="-mx-4">
            <DesignNavigation
              title="Price breakdown"
              rightButton={
                <button
                  onClick={() => setShowPrice(false)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              }
            />
          </div>
          <div className="space-y-0">
            <div className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Testing</p>
                <p className="text-sm font-medium text-foreground">€25.00</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Buyer Protection fee</p>
                <p className="text-sm font-medium text-foreground">€1.95</p>
              </div>
            </div>
            <DesignDivider margin={0} />
            <DesignLabel text="Select at checkout" styling="default" />
            <div className="flex items-center gap-3 py-3">
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Postage</p>
                <p className="text-sm font-medium text-foreground">from €2.69</p>
                <p className="text-xs text-muted-foreground">Depends on the shipping choice</p>
              </div>
            </div>
            <DesignDivider margin={0} />
            <DesignNote text="Our Buyer Protection fee is mandatory when you purchase an item. It is added to every purchase made with the 'Buy Now' button. The item price is set by the seller and may be subject to negotiation." styling="default" />
            <div className="pt-2">
              <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShowPrice(false)}>OK, close</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Filter */}
      <ComponentSection title="With Navigation — Filter">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowFilter(true)}>Filter</DesignButton>
        <DesignDialog open={showFilter} onOpenChange={setShowFilter} hideClose>
          <div className="-mx-4">
            <DesignNavigation
              title="Filter"
              leftButton={
                <button
                  onClick={() => setShowFilter(false)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              }
              rightButton={
                <button className="text-sm font-medium text-primary hover:underline px-1">
                  Reset
                </button>
              }
            />
          </div>
          <div className="-mx-4 space-y-0">
            <DesignLabel text="Category" styling="default" />
            <DesignCell title="Clothing" showChevron />
            <DesignCell title="Shoes" showChevron />
            <DesignCell title="Accessories" showChevron />
            <DesignDivider margin={0} />
            <DesignLabel text="Condition" styling="default" />
            <DesignCell title="New with tags" controlType="checkbox" />
            <DesignCell title="Very good" controlType="checkbox" />
            <DesignCell title="Good" controlType="checkbox" />
            <DesignDivider margin={0} />
            <DesignLabel text="Price range" styling="default" />
            <div className="flex gap-2 py-3 px-4">
              <DesignInputText placeholder="Min €" className="flex-1" />
              <DesignInputText placeholder="Max €" className="flex-1" />
            </div>
            <div className="pt-2 px-4">
              <DesignButton variant="filled" theme="primary" fullWidth onClick={() => setShowFilter(false)}>Show results</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Sort by */}
      <ComponentSection title="With Navigation — Sort by">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowSort(true)}>Sort by</DesignButton>
        <DesignDialog open={showSort} onOpenChange={setShowSort} hideClose>
          <div className="-mx-4">
            <DesignNavigation
              title="Sort by"
              rightButton={
                <button
                  onClick={() => setShowSort(false)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              }
            />
          </div>
          <div className="-mx-4 space-y-0">
            <DesignCell title="Relevance" suffix={<span className="text-sm text-primary">✓</span>} />
            <DesignCell title="Price: Low to High" />
            <DesignCell title="Price: High to Low" />
            <DesignCell title="Newest first" />
            <DesignCell title="Most popular" />
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Share */}
      <ComponentSection title="With Navigation — Share">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowShare(true)}>Share</DesignButton>
        <DesignDialog open={showShare} onOpenChange={setShowShare} hideClose>
          <div className="-mx-4">
            <DesignNavigation
              title="Share"
              rightButton={
                <button
                  onClick={() => setShowShare(false)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              }
            />
          </div>
          <div className="-mx-4 space-y-0">
            <DesignCell title="Copy link" icon={Copy} />
            <DesignCell title="Share via messages" icon={Share2} />
            <DesignCell title="Add to favourites" icon={Heart} />
            <DesignDivider margin={0} />
            <DesignCell title="Report this item" icon={Flag} iconClassName="text-destructive" />
            <DesignCell title="Hide this item" icon={EyeOff} />
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Report */}
      <ComponentSection title="With Navigation — Report issue">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowReport(true)}>Report</DesignButton>
        <DesignDialog open={showReport} onOpenChange={setShowReport} hideClose>
          <div className="-mx-4">
            <DesignNavigation
              title="Report this item"
              showBackButton
              onBackClick={() => setShowReport(false)}
            />
          </div>
          <div className="-mx-4 space-y-0">
            <DesignLabel text="What's wrong with this item?" styling="default" />
            <DesignCell title="Spam or misleading" />
            <DesignCell title="Prohibited item" />
            <DesignCell title="Counterfeit or fake" />
            <DesignCell title="Offensive content" />
            <DesignCell title="Other" />
          </div>
        </DesignDialog>
      </ComponentSection>

      {/* With Navigation — Settings */}
      <ComponentSection title="With Navigation — Notification settings">
        <DesignButton variant="filled" theme="primary" onClick={() => setShowSettings(true)}>Notification settings</DesignButton>
        <DesignDialog open={showSettings} onOpenChange={setShowSettings} hideClose>
          <div className="-mx-4">
            <DesignNavigation
              title="Notifications"
              rightButton={
                <button
                  onClick={() => setShowSettings(false)}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[6px] transition-colors text-foreground hover:bg-surface-hover active:bg-surface-active"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              }
            />
          </div>
          <div className="-mx-4 space-y-0">
            <DesignCell title="Push notifications" subtitle="Receive alerts on your device" controlType="toggle" checked />
            <DesignCell title="Email notifications" subtitle="Get updates in your inbox" controlType="toggle" />
            <DesignCell title="New message alerts" controlType="toggle" checked />
            <DesignDivider margin={0} />
            <DesignLabel text="Marketing" styling="default" />
            <DesignCell title="Promotions & offers" controlType="toggle" />
            <DesignCell title="Newsletter" controlType="toggle" />
            <DesignNote text="You can change your notification preferences at any time in your account settings." styling="default" />
          </div>
        </DesignDialog>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Delete account confirmation with destructive action and safety warning.">
        <DesignButton variant="outlined" theme="error" onClick={() => setShowError(true)}>Delete my account</DesignButton>
        <DesignDialog
          open={showError}
          onOpenChange={setShowError}
          title="Delete your account?"
          hideClose
          icon={
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This will permanently delete your profile, listings, messages, and transaction history. This action cannot be undone.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <DesignButton variant="filled" theme="error" fullWidth onClick={() => setShowError(false)}>Yes, delete everything</DesignButton>
              <DesignButton variant="flat" theme="muted" fullWidth onClick={() => setShowError(false)}>Keep my account</DesignButton>
            </div>
          </div>
        </DesignDialog>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignDialog } from '@/components/ds/DesignDialog';
import { DesignButton } from '@/components/ds/DesignButton';
import { useState } from 'react';

const [show, setShow] = useState(false);

<DesignButton onClick={() => setShow(true)}>Open</DesignButton>

<DesignDialog open={show} onOpenChange={setShow} title="Confirm action" hideClose>
  <p>Are you sure you want to proceed?</p>
  <DesignButton variant="filled" fullWidth onClick={() => setShow(false)}>Confirm</DesignButton>
  <DesignButton variant="flat" fullWidth onClick={() => setShow(false)}>Cancel</DesignButton>
</DesignDialog>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};

export default DialogDocs;
