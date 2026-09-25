const GettingStarted = () => {
  return (
    <div className="min-h-screen bg-docs-bg text-docs-foreground">
      <header className="border-b border-docs-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-docs-heading">Mini Bloom Design System</h1>
          <p className="text-sm text-docs-muted mt-1">Getting Started</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Introduction</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="p-6 space-y-4">
              <p className="text-docs-foreground leading-relaxed">
                The <strong>Mini Bloom Design System</strong> is a comprehensive reference documenting the visual language and
                component library. It provides consistent patterns for building cohesive user interfaces.
              </p>
              <p className="text-docs-foreground leading-relaxed">
                This documentation covers foundations (colors, typography, spacing), all UI components, and
                layout patterns to ensure visual consistency across all implementations.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Design Principles</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="bg-docs-preview-header px-6 py-3 border-b border-docs-border">
              <span className="text-xs font-medium text-docs-muted uppercase tracking-wide">Core Principles</span>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Spacious & Warm", desc: "Generous spacing and warm neutrals create an inviting, breathable interface that feels professional but human." },
                  { title: "8pt Spacing System", desc: "Consistent spacing based on an 8-point grid creates visual harmony and predictable layouts." },
                  { title: "Semantic Colors", desc: "Colors are used purposefully with clear semantic meaning: primary for actions, success for confirmations, error for warnings." },
                  { title: "Typography with Figtree", desc: "Figtree font family with a crafted type scale ensures readable, accessible content across all components." },
                ].map((p) => (
                  <div key={p.title} className="space-y-3">
                    <h3 className="text-sm font-medium text-docs-heading">{p.title}</h3>
                    <p className="text-sm text-docs-muted leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-docs-heading mb-4">Documentation Structure</h2>
          <div className="bg-background rounded-lg border border-docs-border overflow-hidden">
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { title: "Foundations", desc: "Colors, Typography, and Spacing tokens that form the visual base of the system." },
                  { title: "Components", desc: "Individual UI components with states, variants, and detailed specifications." },
                  { title: "Patterns", desc: "Screen layout patterns showing how components compose together in real screens." },
                ].map((s) => (
                  <div key={s.title} className="p-4 bg-docs-code rounded-lg">
                    <h3 className="text-sm font-medium text-docs-heading mb-2">{s.title}</h3>
                    <p className="text-xs text-docs-muted leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-docs-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-docs-muted">Mini Bloom Design System Documentation</p>
        </div>
      </footer>
    </div>
  );
};

export default GettingStarted;
