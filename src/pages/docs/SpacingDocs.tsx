const SpacingDocs = () => {
  const spacingScale = [
    { name: "2xs", value: "2px", tailwind: "0.5" },
    { name: "xs", value: "4px", tailwind: "1" },
    { name: "sm", value: "8px", tailwind: "2" },
    { name: "md", value: "12px", tailwind: "3" },
    { name: "base", value: "16px", tailwind: "4" },
    { name: "lg", value: "24px", tailwind: "6" },
    { name: "xl", value: "32px", tailwind: "8" },
    { name: "2xl", value: "48px", tailwind: "12" },
    { name: "3xl", value: "64px", tailwind: "16" },
  ];

  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <header className="border-b border-docs-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-docs-heading">Spacing</h1>
          <p className="text-sm text-docs-muted mt-1">Foundation Documentation</p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Spacing Scale</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="bg-docs-preview-header px-6 py-3 border-b border-docs-border">
              <span className="text-xs font-medium text-docs-muted uppercase tracking-wide">8pt Grid System</span>
            </div>
            <div className="p-6 space-y-4">
              {spacingScale.map((s) => (
                <div key={s.name} className="flex items-center gap-4">
                  <div className="w-20 shrink-0">
                    <span className="text-sm font-medium text-docs-heading">{s.name}</span>
                  </div>
                  <code className="text-xs text-docs-code-text bg-docs-code px-1.5 py-0.5 rounded w-16 text-center">{s.value}</code>
                  <code className="text-xs text-docs-code-text bg-docs-code px-1.5 py-0.5 rounded w-12 text-center">{s.tailwind}</code>
                  <div className="flex-1">
                    <div
                      className="h-4 bg-primary/20 rounded-sm"
                      style={{ width: s.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Layout Hierarchy</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="p-6 space-y-6">
              {[
                { pad: "0px", title: "Full-Width Elements", desc: "Navigation headers, bottom navigation, cell lists, dividers" },
                { pad: "16px", title: "Standard Content Container", desc: "Form inputs, buttons, text content, cards" },
                { pad: "8-12px", title: "Reduced Padding Layouts", desc: "Grid-based content, product catalogs, chip rows" },
              ].map((l) => (
                <div key={l.pad} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <code className="text-docs-code-text bg-docs-code px-2 py-0.5 rounded text-sm">{l.pad}</code>
                    <h3 className="text-sm font-medium text-docs-heading">{l.title}</h3>
                  </div>
                  <p className="text-sm text-docs-muted leading-relaxed ml-14">{l.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SpacingDocs;
