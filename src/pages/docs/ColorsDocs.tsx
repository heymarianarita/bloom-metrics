const colorGroups = [
  {
    label: "Primary (Teal)",
    description: "Brand color. Use for interactive elements, links, active states, and key UI accents.",
    tokens: [
      { name: "Extra Dark", hex: "#003D42", cssVar: "--primary-extra-dark", usage: "Heavy contrast text on light teal" },
      { name: "Dark", hex: "#005A63", cssVar: "--primary-dark", usage: "Hover states, emphasis" },
      { name: "Default", hex: "#007782", cssVar: "--primary-default", usage: "Buttons, links, active indicators" },
      { name: "Medium", hex: "#33B3C2", cssVar: "--primary-medium", usage: "Secondary accents, decorative" },
      { name: "Light", hex: "#E6FAFA", cssVar: "--primary-light", usage: "Subtle backgrounds, selected row tints" },
      { name: "Extra Light", hex: "#E6FAFA", cssVar: "--primary-extra-light", usage: "Very subtle fills, hover tints" },
    ],
  },
  {
    label: "Success (Green)",
    description: "Positive feedback. Use for success messages, confirmations, verified badges, and completed states.",
    tokens: [
      { name: "Extra Dark", hex: "#134A30", cssVar: "--success-extra-dark", usage: "High-contrast success text" },
      { name: "Dark", hex: "#1D6442", cssVar: "--success-dark", usage: "Hover on success elements" },
      { name: "Default", hex: "#28865A", cssVar: "--success-default", usage: "Success icons, text, borders" },
      { name: "Medium", hex: "#4DB87A", cssVar: "--success-medium", usage: "Light success accents" },
      { name: "Light", hex: "#A3E4B8", cssVar: "--success-light", usage: "Success background tint" },
      { name: "Extra Light", hex: "#EBFCEF", cssVar: "--success-extra-light", usage: "Subtle success banner backgrounds" },
    ],
  },
  {
    label: "Error / Destructive (Red)",
    description: "Negative feedback. Use for error messages, validation failures, destructive actions, and alerts.",
    tokens: [
      { name: "Extra Dark", hex: "#6B232C", cssVar: "--error-extra-dark", usage: "High-contrast error text" },
      { name: "Dark", hex: "#9A323F", cssVar: "--error-dark", usage: "Hover on error elements" },
      { name: "Default", hex: "#D04555", cssVar: "--error-default", usage: "Error icons, validation text, destructive buttons" },
      { name: "Medium", hex: "#E56978", cssVar: "--error-medium", usage: "Light error accents" },
      { name: "Extra Light", hex: "#FFF4F4", cssVar: "--error-extra-light", usage: "Error banner backgrounds" },
    ],
  },
  {
    label: "Highlight / Attention (Yellow)",
    description: "Promotional and attention-grabbing. Use for badges, sale tags, star ratings, promotional banners, and cautionary notices.",
    tokens: [
      { name: "Extra Dark", hex: "#8B6A2E", cssVar: "--highlight-extra-dark", usage: "High-contrast highlight text" },
      { name: "Dark", hex: "#C9942F", cssVar: "--highlight-dark", usage: "Hover on highlight elements" },
      { name: "Default", hex: "#F9BB42", cssVar: "--highlight-default", usage: "Star ratings, promo badges, sale tags" },
      { name: "Medium", hex: "#FBCE73", cssVar: "--highlight-medium", usage: "Light highlight accents" },
      { name: "Light", hex: "#FDE6B3", cssVar: "--highlight-light", usage: "Highlight background tint" },
      { name: "Extra Light", hex: "#FFF5E5", cssVar: "--highlight-extra-light", usage: "Subtle highlight banner backgrounds" },
    ],
  },
  {
    label: "Neutral (Greyscale)",
    description: "Structural and typographic. Use for text, borders, dividers, backgrounds, and disabled states.",
    tokens: [
      { name: "Level 1 — Near Black", hex: "#15191A", cssVar: "--greyscale-1", usage: "Primary text, headings (also: --text-strong)" },
      { name: "Level 2 — Dark Grey", hex: "#5A6566", cssVar: "--greyscale-2", usage: "Secondary text, captions (also: --text-subtle)" },
      { name: "Level 3 — Medium Grey", hex: "#9CA3A5", cssVar: "--greyscale-3", usage: "Placeholder text, disabled text" },
      { name: "Level 4 — Light Grey", hex: "#B6BEBF", cssVar: "--greyscale-4", usage: "Borders, dividers" },
      { name: "Level 5 — Very Light Grey", hex: "#F0F2F2", cssVar: "--greyscale-5", usage: "Subtle backgrounds, hover fills" },
      { name: "Level 6 — White", hex: "#FFFFFF", cssVar: "--greyscale-6", usage: "Page background, card surface" },
    ],
  },
  {
    label: "Text Foreground",
    description: "Semantic aliases for text. 'Strong' is near-black for headings/body; 'Subtle' is grey for supporting content.",
    tokens: [
      { name: "Strong (Near Black)", hex: "#15191A", cssVar: "--text-strong", usage: "Headings, body text, high-emphasis labels" },
      { name: "Subtle (Grey)", hex: "#5A6566", cssVar: "--text-subtle", usage: "Captions, descriptions, low-emphasis content" },
    ],
  },
];

const ColorsDocs = () => {
  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <header className="border-b border-docs-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-docs-heading">Colors</h1>
          <p className="text-sm text-docs-muted mt-1">Complete color token system with semantic scales and usage guidance.</p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        {colorGroups.map((group) => (
          <section key={group.label}>
            <h2 className="text-lg font-semibold text-docs-heading mb-1">{group.label}</h2>
            {group.description && (
              <p className="text-sm text-docs-muted mb-4">{group.description}</p>
            )}
            <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {group.tokens.map((token) => (
                    <div key={token.cssVar} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full aspect-square rounded-lg border border-docs-border shadow-sm"
                        style={{ backgroundColor: token.hex }}
                      />
                      <div className="text-center">
                        <p className="text-xs font-medium text-docs-heading">{token.name}</p>
                        <code className="text-[10px] text-docs-muted">{token.hex}</code>
                      </div>
                      <code className="text-[10px] text-docs-muted bg-docs-code px-1.5 py-0.5 rounded text-center break-all">
                        {token.cssVar}
                      </code>
                      {token.usage && (
                        <p className="text-[10px] text-docs-muted text-center leading-tight">{token.usage}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default ColorsDocs;