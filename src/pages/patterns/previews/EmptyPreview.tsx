import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { FileText } from "lucide-react";

const EmptyPreview = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <DesignEmptyState
      icon={<FileText className="w-12 h-12 text-muted-foreground" />}
      title="Preview coming soon"
      body="This screen preview is not yet built."
    />
  </div>
);

export default EmptyPreview;
