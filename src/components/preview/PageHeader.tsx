export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10 pb-6 border-b border-docs-border">
      <h1 className="text-3xl font-bold text-docs-heading mb-2">{title}</h1>
      <p className="text-base text-docs-muted">{description}</p>
    </div>
  );
}
