import { useState } from "react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg border border-docs-border bg-docs-code overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-docs-border">
        <span className="text-xs font-medium text-docs-muted uppercase tracking-wide">Usage</span>
        <button
          onClick={handleCopy}
          className="text-xs text-primary hover:underline font-medium"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-docs-code-text">{code}</code>
      </pre>
    </div>
  );
}
