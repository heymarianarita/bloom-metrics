import { useState } from "react";
import { DesignTabs } from "@/components/ds/DesignTabs";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";
import { DesignRating } from "@/components/ds/DesignRating";
import { Heart, MapPin } from "lucide-react";

const props = [
  { name: "tabs", type: "Array<{ id: string; label: string; badge?: number }>", description: "Tab items (required)" },
  { name: "activeTab", type: "string", description: "Active tab ID (required)" },
  { name: "onTabChange", type: "(tabId: string) => void", description: "Tab change handler (required)" },
];

const mockItems = [
  { id: 1, name: "Vintage denim jacket", price: "€25.00", size: "M", rating: 4.5, reviews: 12 },
  { id: 2, name: "Wool sweater", price: "€18.00", size: "S", rating: 5.0, reviews: 8 },
  { id: 3, name: "Linen trousers", price: "€22.00", size: "L", rating: 4.0, reviews: 3 },
];

const mockSelling = [
  { id: 4, name: "Silk scarf", price: "€12.00", views: 48, favourites: 5 },
  { id: 5, name: "Leather belt", price: "€15.00", views: 23, favourites: 2 },
];

const TabsDocs = () => {
  const [active, setActive] = useState("all");
  const [profileTab, setProfileTab] = useState("items");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader title="Tabs" description="Horizontal tab bar for switching between views or sections." />

      <ComponentSection title="Default">
        <div className="w-full">
          <DesignTabs
            tabs={[
              { id: "all", label: "All" },
              { id: "selling", label: "Selling" },
              { id: "buying", label: "Buying" },
              { id: "favourites", label: "Favourites" },
            ]}
            activeTab={active}
            onTabChange={setActive}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="With badges">
        <div className="w-full">
          <DesignTabs
            tabs={[
              { id: "all", label: "All", badge: 24 },
              { id: "unread", label: "Unread", badge: 3 },
              { id: "archived", label: "Archived" },
            ]}
            activeTab={active}
            onTabChange={setActive}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Real-world usage" description="Seller profile with tabs switching between wardrobe sections.">
        <div className="w-full max-w-sm rounded-xl border border-docs-border overflow-hidden bg-background">
          {/* Seller header */}
          <div className="flex items-center gap-3 p-4">
            <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-base shrink-0">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">maria_style</div>
              <DesignRating value={4.9} size="small" showRating reviewCount={64} />
            </div>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Heart className="w-5 h-5 text-content-secondary" />
            </button>
          </div>

          {/* Tabs */}
          <DesignTabs
            tabs={[
              { id: "items", label: "Items", badge: mockItems.length + mockSelling.length },
              { id: "reviews", label: "Reviews", badge: 64 },
              { id: "about", label: "About" },
            ]}
            activeTab={profileTab}
            onTabChange={setProfileTab}
          />

          {/* Tab content */}
          <div className="p-4">
            {profileTab === "items" && (
              <div className="grid grid-cols-2 gap-2">
                {mockItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-docs-border overflow-hidden">
                    <div className="aspect-square bg-muted" />
                    <div className="p-2">
                      <div className="text-xs text-foreground font-medium truncate">{item.name}</div>
                      <div className="text-xs text-docs-muted">{item.size}</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{item.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {profileTab === "reviews" && (
              <div className="flex flex-col gap-3">
                {[
                  { user: "anna_k", rating: 5, text: "Great quality, fast shipping!" },
                  { user: "tom_92", rating: 4, text: "Nice item, as described." },
                ].map((review) => (
                  <div key={review.user} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{review.user}</span>
                      <DesignRating value={review.rating} size="small" />
                    </div>
                    <p className="text-xs text-docs-muted">{review.text}</p>
                  </div>
                ))}
              </div>
            )}
            {profileTab === "about" && (
              <div className="flex flex-col gap-2 text-xs text-docs-muted">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Berlin, Germany</span>
                </div>
                <p>Selling preloved fashion pieces from my wardrobe. Shipping within 2 days.</p>
              </div>
            )}
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignTabs } from '@/components/ds/DesignTabs';

const [active, setActive] = useState('all');

<DesignTabs
  tabs={[{ id: 'all', label: 'All' }, { id: 'selling', label: 'Selling' }]}
  activeTab={active}
  onTabChange={setActive}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};
export default TabsDocs;
