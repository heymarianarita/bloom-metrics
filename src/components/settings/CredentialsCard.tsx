import * as React from "react";
import { CheckCircle, FloppyDisk, Key, Trash } from "@phosphor-icons/react";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignDivider } from "@/components/ds/DesignDivider";
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

/** Admin-only card for storing integration tokens used by the backend. */
const CredentialsCard = ({ sourceKey }: { sourceKey: string }) => {
  const { toast } = useToast();
  const status = useCredentialStatus();
  const save = useSetCredential();
  const remove = useDeleteCredential();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});

  const defs = CREDENTIAL_DEFS.filter((d) => d.sourceKey === sourceKey);
  if (defs.length === 0) return null;

  const statusByName = new Map((status.data ?? []).map((s) => [s.name, s]));

  const onSave = async (name: string, label: string) => {
    const value = (values[name] ?? "").trim();
    if (!value) {
      toast({ title: "Nothing to save", description: `Enter a value for ${label}.`, variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({ name, value });
      setValues((prev) => ({ ...prev, [name]: "" }));
      setEditing((prev) => ({ ...prev, [name]: false }));
      toast({ title: "Saved", description: `${label} updated.` });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const onRemove = async (name: string, label: string) => {
    try {
      await remove.mutateAsync(name);
      toast({ title: "Removed", description: `${label} removed.` });
    } catch (err) {
      toast({
        title: "Could not remove",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DesignSpacer size="small" />
      <DesignDivider />
      <DesignSpacer size="small" />
      <div className="flex items-center gap-2">
        <Key size={14} className="text-muted-foreground" />
        <h3 className="text-[14px] font-medium text-foreground">Credentials</h3>
      </div>
      <p className="text-[12px] text-muted-foreground mt-1">
        Stored securely. Values can never be read back — save a new one to replace it.
      </p>
      <DesignSpacer size="small" />
      <div className="flex flex-col gap-4">
        {defs.map((def) => {
          const saved = statusByName.get(def.name);
          return (
            <div key={def.name} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-foreground">{def.label}</span>
                {saved && saved.readable === false ? (
                  <DesignBadge theme="error" styling="light">
                    Needs re-entering
                  </DesignBadge>
                ) : saved ? (
                  <DesignBadge theme="success" styling="light">
                    <CheckCircle size={12} /> Set {new Date(saved.updated_at).toLocaleDateString()}
                  </DesignBadge>
                ) : (
                  <DesignBadge theme="muted" styling="light">
                    Not set
                  </DesignBadge>
                )}
              </div>
              {saved && !editing[def.name] ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">
                    {saved.readable === false
                      ? "Saved with an old encryption key and can't be read. Replace it with the current value."
                      : `Saved and hidden. Updated ${new Date(saved.updated_at).toLocaleString()}.`}
                  </span>
                  <DesignButton
                    variant="outlined"
                    theme="muted"
                    size="small"
                    onClick={() => setEditing((prev) => ({ ...prev, [def.name]: true }))}
                  >
                    Replace
                  </DesignButton>
                  <DesignButton
                    variant="outlined"
                    theme="error"
                    size="small"
                    icon={<Trash size={16} />}
                    onClick={() => onRemove(def.name, def.label)}
                  >
                    Remove
                  </DesignButton>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <DesignInputText
                      type={def.secret ? "password" : "text"}
                      placeholder={saved ? "Enter a new value to replace" : "Paste value"}
                      helperText={def.helper}
                      value={values[def.name] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [def.name]: e.target.value }))
                      }
                    />
                  </div>
                  <DesignButton
                    variant="filled"
                    theme="primary"
                    size="medium"
                    icon={<FloppyDisk size={16} />}
                    isLoading={save.isPending}
                    onClick={() => onSave(def.name, def.label)}
                  >
                    Save
                  </DesignButton>
                  {saved && (
                    <DesignButton
                      variant="outlined"
                      theme="muted"
                      size="medium"
                      onClick={() => {
                        setEditing((prev) => ({ ...prev, [def.name]: false }));
                        setValues((prev) => ({ ...prev, [def.name]: "" }));
                      }}
                    >
                      Cancel
                    </DesignButton>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CredentialsCard;
