import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignButton } from "@/components/ds/DesignButton";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { Search, ShoppingBag, Inbox, Heart } from "lucide-react";

const props = [
  { name: "title", type: "string", description: "Main heading text" },
  { name: "body", type: "string", description: "Supporting description text" },
  { name: "icon", type: "ReactNode", description: "Icon displayed above the title" },
  { name: "action", type: "ReactNode", description: "Action element (e.g. button) below the body" },
  { name: "className", type: "string", description: "Additional CSS class names" },
];

const EmptyStateDocs = () => (
  <div className="p-10 max-w-4xl">
    <PageHeader title="EmptyState" description="Placeholder shown when a section has no content." />

    <ComponentSection title="With action" description="Prompts the user to take an action when no content exists.">
      <DesignEmptyState
        icon={<ShoppingBag className="w-12 h-12" />}
        title="Nothing here yet"
        body="Start by adding your first item for sale."
        action={<DesignButton theme="primary" variant="filled">Add item</DesignButton>}
      />
    </ComponentSection>

    <ComponentSection title="No results" description="Feedback after a search returns nothing.">
      <DesignEmptyState
        icon={<Search className="w-12 h-12" />}
        title="No results found"
        body="Try adjusting your search filters."
      />
    </ComponentSection>

    <ComponentSection title="Empty inbox" description="Shown when there are no messages.">
      <DesignEmptyState
        icon={<Inbox className="w-12 h-12" />}
        title="Your inbox is empty"
        body="Messages from buyers and sellers will appear here."
      />
    </ComponentSection>

    <ComponentSection title="Favourites" description="Empty state with a themed action button.">
      <DesignEmptyState
        icon={<Heart className="w-12 h-12" />}
        title="No favourites yet"
        body="Items you like will be saved here."
        action={<DesignButton theme="primary" variant="outlined">Browse items</DesignButton>}
      />
    </ComponentSection>

    <ComponentSection title="Example: Real-world usage" description="Orders tab showing empty state when a new user has no purchases yet.">
      <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden bg-background">
        <div className="px-4 py-3 border-b border-docs-border">
          <p className="text-base font-medium text-content">My Orders</p>
        </div>
        <div className="py-10">
          <DesignEmptyState
            icon={<ShoppingBag className="w-12 h-12" />}
            title="No orders yet"
            body="When you buy something, your orders and tracking info will show up here."
            action={<DesignButton theme="primary" variant="filled">Start shopping</DesignButton>}
          />
        </div>
      </div>
    </ComponentSection>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
      <CodeBlock code={`import { DesignEmptyState } from '@/components/ds/DesignEmptyState';
import { DesignButton } from '@/components/ds/DesignButton';
import { ShoppingBag } from 'lucide-react';

// With action
<DesignEmptyState
  icon={<ShoppingBag className="w-12 h-12" />}
  title="Nothing here yet"
  body="Start by adding your first item."
  action={<DesignButton theme="primary" variant="filled">Add item</DesignButton>}
/>

// Without action
<DesignEmptyState
  icon={<Search className="w-12 h-12" />}
  title="No results found"
  body="Try adjusting your search filters."
/>`} />
    </div>

    <div className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
      <PropsTable props={props} />
    </div>
  </div>
);

export default EmptyStateDocs;
