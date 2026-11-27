import * as React from "react";

/** A titled group of fields in a metric form, set apart from the next by a divider. */
export const FormSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
    <div className="flex flex-col gap-1">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </section>
);
