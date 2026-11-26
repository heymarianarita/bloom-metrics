import { Key } from "@phosphor-icons/react";
import { DesignDivider } from "@/components/ds/DesignDivider";
import CredentialField from "@/components/settings/CredentialField";
import { CREDENTIAL_DEFS } from "@/hooks/useCredentials";
import { SECTION_GAP } from "@/components/settings/source/SourceCard";

/** Admin-only card for storing integration tokens used by the backend. */
const CredentialsCard = ({ sourceKey }: { sourceKey: string }) => {
  const defs = CREDENTIAL_DEFS.filter((d) => d.sourceKey === sourceKey);
  if (defs.length === 0) return null;

  return (
    <>
      <DesignDivider margin={SECTION_GAP} />
      <div className="flex items-center gap-2">
        <Key size={14} className="text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Credentials</h3>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Stored securely. Values can never be read back — save a new one to replace it.
      </p>
      <div className="flex flex-col gap-4 mt-2">
        {defs.map((def) => (
          <CredentialField key={def.name} def={def} />
        ))}
      </div>
    </>
  );
};

export default CredentialsCard;
