import * as React from "react";
import { Sparkle } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignTooltip } from "@/components/ds/DesignTooltip";
import { toast } from "@/hooks/use-toast";

interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** What still has to be set before AI can tell what the metric is about, e.g. "pick a dataset", or null when it's ready. */
  missing: string | null;
  /** Writes a description from the metric's settings; resolves to "" when it couldn't. */
  write: () => Promise<string>;
}

export function DescriptionField({ value, onChange, missing, write }: DescriptionFieldProps) {
  const [writing, setWriting] = React.useState(false);

  const onWrite = async () => {
    setWriting(true);
    const description = await write();
    setWriting(false);
    if (description) onChange(description);
    else toast({ title: "Couldn't write a description", description: "Try again, or write one yourself.", variant: "destructive" });
  };

  const action = value.trim() ? "Rewrite with AI" : "Write with AI";

  return (
    <DesignInputText
      label="Description"
      helperText={missing ? `To write one with AI, ${missing}.` : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      suffix={
        <DesignTooltip content={action}>
          <DesignButton
            variant="flat"
            theme="primary"
            aria-label={action}
            icon={<Sparkle size={16} />}
            disabled={!!missing}
            isLoading={writing}
            onClick={onWrite}
          />
        </DesignTooltip>
      }
    />
  );
}
