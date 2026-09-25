import { ReactNode } from "react";

export function ComponentSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-docs-heading mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-docs-muted mb-4">{description}</p>
      )}
      <div className="rounded-xl border border-docs-border bg-background p-6 flex flex-wrap gap-4 items-center">
        {children}
      </div>
    </section>
  );
}
