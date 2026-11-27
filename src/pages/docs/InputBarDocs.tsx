import { useState } from "react";
import { DesignInputBar } from "@/components/ds/DesignInputBar";
import { DesignBubble } from "@/components/ds/DesignBubble";
import { DesignCell } from "@/components/ds/DesignCell";
import { DesignDivider } from "@/components/ds/DesignDivider";
import { Search, X, Send, Mail } from "lucide-react";
import { PageHeader } from "@/components/preview/PageHeader";
import { ComponentSection } from "@/components/preview/ComponentSection";
import { PropsTable } from "@/components/preview/PropsTable";
import { CodeBlock } from "@/components/preview/CodeBlock";

const props = [
  { name: "placeholder", type: "string", description: "Placeholder text" },
  { name: "leftIcon", type: "ReactNode", description: "Left icon element" },
  { name: "rightIcon", type: "ReactNode", description: "Right icon element" },
  { name: "onLeftIconClick", type: "() => void", description: "Left icon click handler" },
  { name: "onRightIconClick", type: "() => void", description: "Right icon click handler" },
  { name: "multiline", type: "boolean", default: "false", description: "Renders as textarea" },
  { name: "maxRows", type: "number", default: "5", description: "Max rows in multiline mode" },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the input" },
];

const InputBarDocs = () => {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="p-10 max-w-4xl">
      <PageHeader title="InputBar" description="Compact borderless input bar for search and messaging contexts." />

      <ComponentSection title="Basic">
        <div className="flex flex-col gap-4 w-80">
          <DesignInputBar placeholder="Enter text..." />
          <DesignInputBar placeholder="With default value" defaultValue="Hello World" />
        </div>
      </ComponentSection>

      <ComponentSection title="With icons">
        <div className="flex flex-col gap-4 w-80">
          <DesignInputBar placeholder="Search..." leftIcon={<Search className="w-4 h-4" />} />
          <DesignInputBar placeholder="Email address" leftIcon={<Mail className="w-4 h-4" />} />
          <DesignInputBar placeholder="Type a message..." rightIcon={<Send className="w-4 h-4" />} />
          <DesignInputBar
            placeholder="Search with clear"
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={searchValue ? <X className="w-4 h-4" /> : undefined}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onRightIconClick={() => setSearchValue("")}
          />
        </div>
      </ComponentSection>

      <ComponentSection title="Multiline">
        <div className="flex flex-col gap-4 w-80">
          <DesignInputBar multiline placeholder="Write a message..." maxRows={5} />
          <DesignInputBar multiline placeholder="Type here..." leftIcon={<Mail className="w-4 h-4" />} rightIcon={<Send className="w-4 h-4" />} />
        </div>
      </ComponentSection>

      <ComponentSection title="Disabled">
        <div className="flex flex-col gap-4 w-80">
          <DesignInputBar placeholder="Disabled input" disabled />
          <DesignInputBar placeholder="Disabled with icon" leftIcon={<Search className="w-4 h-4" />} disabled />
        </div>
      </ComponentSection>

      <ComponentSection title="Example: Real-world usage" description="Chat conversation screen with message input bar at the bottom.">
        <div className="w-full max-w-sm mx-auto rounded-lg border border-docs-border overflow-hidden">
          <div className="bg-background">
            <DesignCell
              prefix={<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">AL</div>}
              title="Anna Larsson"
              bodyText="Online"
              styling="tight"
            />
          </div>
          <DesignDivider margin={0} />
          <div className="p-4 space-y-2 bg-[var(--highlight-tint)]">
            <div className="flex justify-start">
              <DesignBubble text="Hi! Is this jacket still available?" footer="10:32" className="max-w-[240px]" />
            </div>
            <div className="flex justify-end">
              <DesignBubble text="Yes it is! Want me to hold it for you?" footer="10:34" inverse className="max-w-[240px]" />
            </div>
          </div>
          <DesignDivider margin={0} />
          <div className="bg-background">
            <DesignInputBar
              placeholder="Type a message…"
              rightIcon={<Send className="w-4 h-4" />}
            />
          </div>
        </div>
      </ComponentSection>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-3">Usage</h2>
        <CodeBlock code={`import { DesignInputBar } from '@/components/ds/DesignInputBar';
import { Search } from 'lucide-react';

<DesignInputBar
  placeholder="Search..."
  leftIcon={<Search className="w-4 h-4" />}
/>`} />
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-docs-heading mb-4">Props</h2>
        <PropsTable props={props} />
      </div>
    </div>
  );
};
export default InputBarDocs;
