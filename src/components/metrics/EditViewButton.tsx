import { useNavigate } from "react-router-dom";
import { PencilSimple } from "@phosphor-icons/react";
import { DesignButton } from "@/components/ds/DesignButton";
import { useCanEdit, useSession } from "@/hooks/useAuth";

/**
 * "Edit view": opens this Metrics tab in Metrics → Views, where what it shows and in which
 * order is set. Only admins and editors see it.
 */
export const EditViewButton = ({ tabSlug }: { tabSlug: string | undefined }) => {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: canEdit } = useCanEdit(user);
  if (!canEdit || !tabSlug) return null;
  return (
    <DesignButton
      variant="flat"
      theme="muted"
      size="medium"
      icon={<PencilSimple size={16} />}
      onClick={() => navigate(`/settings/views?tab=${encodeURIComponent(tabSlug)}`)}
    >
      Edit view
    </DesignButton>
  );
};
