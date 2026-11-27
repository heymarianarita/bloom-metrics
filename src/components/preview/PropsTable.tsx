type Prop = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export function PropsTable({ props }: { props: Prop[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-docs-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-docs-border bg-docs-code">
            <th className="px-4 py-3 text-left font-semibold text-docs-heading">Prop</th>
            <th className="px-4 py-3 text-left font-semibold text-docs-heading">Type</th>
            <th className="px-4 py-3 text-left font-semibold text-docs-heading">Default</th>
            <th className="px-4 py-3 text-left font-semibold text-docs-heading">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop, i) => (
            <tr key={prop.name} className={i % 2 === 0 ? "bg-background" : "bg-docs-code/50"}>
              <td className="px-4 py-3 font-mono text-xs text-primary font-medium">{prop.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-docs-muted">{prop.type}</td>
              <td className="px-4 py-3 font-mono text-xs text-docs-muted">{prop.default ?? "—"}</td>
              <td className="px-4 py-3 text-docs-muted">{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
