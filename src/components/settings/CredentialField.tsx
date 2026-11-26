import * as React from "react";
import { CheckCircle, FloppyDisk, Trash } from "@phosphor-icons/react";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { useToast } from "@/hooks/use-toast";
import {
  CREDENTIAL_DEFS,
  useCredentialStatus,
  useDeleteCredential,
  useSetCredential,
} from "@/hooks/useCredentials";
import { formatDate, formatDateTime } from "@/lib/formatDate";

/** One stored integration token: its status, and (for admins) a field to save, replace or remove it. */
const CredentialField = ({ def, onChange }: { def: (typeof CREDENTIAL_DEFS)[number]; onChange?: () => void }) => {
  const { toast } = useToast();
  const status = useCredentialStatus();
  const save = useSetCredential();
  const remove = useDeleteCredential();
  const [value, setValue] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const saved = (status.data ?? []).find((s) => s.name === def.name);

  const onSave = async () => {
    if (!value.trim()) {
      toast({ title: "Nothing to save", description: `Enter a value for ${def.label}.`, variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ name: def.name, value: value.trim() });
      setValue("");
      setEditing(false);
      onChange?.();
      toast({ title: "Saved", description: `${def.label} updated.` });
    } catch (err) {
      toast({ title: "Could not save", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  const onRemove = async () => {
    try {
      await remove.mutateAsync(def.name);
      onChange?.();
      toast({ title: "Removed", description: `${def.label} removed.` });
    } catch (err) {
      toast({ title: "Could not remove", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{def.label}</span>
        {saved && saved.readable === false ? (
          <DesignBadge theme="error" styling="light">
            Needs re-entering
          </DesignBadge>
        ) : saved ? (
          <DesignBadge theme="success" styling="light">
            <CheckCircle size={12} /> Set {formatDate(saved.updated_at)}
          </DesignBadge>
        ) : (
          <DesignBadge theme="muted" styling="light">
            Not set
          </DesignBadge>
        )}
      </div>
      {saved && !editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saved.readable === false
              ? "Saved with an old encryption key and can't be read. Replace it with the current value."
              : `Saved and hidden. Updated ${formatDateTime(saved.updated_at)}.`}
          </span>
          <DesignButton variant="outlined" theme="muted" size="small" onClick={() => setEditing(true)}>
            Replace
          </DesignButton>
          <DesignButton variant="outlined" theme="error" size="small" icon={<Trash size={16} />} isLoading={remove.isPending} onClick={onRemove}>
            Remove
          </DesignButton>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <DesignInputText
                type={def.secret ? "password" : "text"}
                aria-label={def.label}
                placeholder={saved ? "Enter a new value to replace" : "Paste value"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <DesignButton variant="filled" theme="primary" size="medium" icon={<FloppyDisk size={16} />} isLoading={save.isPending} onClick={onSave}>
              Save
            </DesignButton>
            {saved && (
              <DesignButton
                variant="outlined"
                theme="muted"
                size="medium"
                onClick={() => {
                  setEditing(false);
                  setValue("");
                }}
              >
                Cancel
              </DesignButton>
            )}
          </div>
          {/* Under the row, so the field and its buttons line up. */}
          <p className="-mt-1 text-xs text-[var(--input-title)]">{def.helper}</p>
        </>
      )}
    </div>
  );
};

export default CredentialField;
