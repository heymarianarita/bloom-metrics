const TypographyDocs = () => {
  const typeScale = [
    { name: "Heading 1", size: "24px", weight: "600", lineHeight: "32px", sample: "The quick brown fox" },
    { name: "Heading 2", size: "20px", weight: "600", lineHeight: "28px", sample: "The quick brown fox" },
    { name: "Heading 3", size: "17px", weight: "600", lineHeight: "24px", sample: "The quick brown fox" },
    { name: "Body", size: "16px", weight: "400", lineHeight: "22px", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Body Medium", size: "16px", weight: "500", lineHeight: "22px", sample: "The quick brown fox jumps over" },
    { name: "Small", size: "14px", weight: "400", lineHeight: "18px", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Caption", size: "12px", weight: "400", lineHeight: "16px", sample: "The quick brown fox jumps over the lazy dog" },
    { name: "Label", size: "11px", weight: "500", lineHeight: "14px", sample: "LABEL TEXT" },
  ];

  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <header className="border-b border-docs-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-docs-heading">Typography</h1>
          <p className="text-sm text-docs-muted mt-1">Foundation Documentation</p>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Type Scale</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="bg-docs-preview-header px-6 py-3 border-b border-docs-border">
              <span className="text-xs font-medium text-docs-muted uppercase tracking-wide">Figtree Font Family</span>
            </div>
            <div className="p-6 space-y-6">
              {typeScale.map((t) => (
                <div key={t.name} className="flex items-baseline gap-6 py-3 border-b border-docs-border last:border-0">
                  <div className="w-32 shrink-0">
                    <span className="text-sm font-medium text-docs-heading">{t.name}</span>
                    <div className="flex gap-2 mt-1">
                      <code className="text-[10px] text-docs-code-text bg-docs-code px-1 py-0.5 rounded">{t.size}</code>
                      <code className="text-[10px] text-docs-code-text bg-docs-code px-1 py-0.5 rounded">{t.weight}</code>
                    </div>
                  </div>
                  <span
                    className="text-docs-foreground"
                    style={{ fontSize: t.size, fontWeight: Number(t.weight), lineHeight: t.lineHeight }}
                  >
                    {t.sample}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TypographyDocs;
