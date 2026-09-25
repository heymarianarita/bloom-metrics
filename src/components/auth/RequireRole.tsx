import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldWarning } from "@phosphor-icons/react";
import AppShell from "@/components/layout/AppShell";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminExists, useMyRole, useSession, type AppRole } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

const satisfies = (role: AppRole | null | undefined, required: "admin" | "editor") => {
  if (required === "admin") return role === "admin";
  return role === "admin" || role === "editor";
};

/** Gate around management screens: signed in with the required role. */
const RequireRole = ({ children, role = "editor" }: { children: ReactNode; role?: "admin" | "editor" }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const { data: myRole, isLoading: roleLoading } = useMyRole(user);
  const { data: adminExists } = useAdminExists(Boolean(user) && !roleLoading && myRole !== "admin");

  if (loading || (user && roleLoading)) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <DesignLoader />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <DesignEmptyState
          icon={<ShieldWarning size={48} />}
          title="Sign in required"
          body="Management screens are only available to signed-in Vinted accounts."
          action={
            <DesignButton variant="filled" theme="primary" onClick={() => navigate("/auth")}>
              Go to sign in
            </DesignButton>
          }
        />
      </AppShell>
    );
  }

  if (!satisfies(myRole, role)) {
    const claim = async () => {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" });
      if (error) {
        toast({ title: "Could not claim admin", description: error.message, variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["my-role"] });
      queryClient.invalidateQueries({ queryKey: ["admin-exists"] });
    };

    return (
      <AppShell>
        <DesignEmptyState
          icon={<ShieldWarning size={48} />}
          title={role === "admin" ? "Admin access needed" : "Editing access needed"}
          body={
            adminExists === false
              ? "No admin exists yet — you can claim the first admin role for this workspace."
              : role === "admin"
                ? "Only admins can open this screen. Ask an admin to grant you the admin role."
                : "Ask an admin to make you an editor. You can keep viewing every reporting page."
          }
          action={
            adminExists === false ? (
              <DesignButton variant="filled" theme="primary" onClick={claim}>
                Claim admin role
              </DesignButton>
            ) : (
              <DesignButton variant="outlined" theme="primary" onClick={() => navigate("/metrics")}>
                Back to reporting
              </DesignButton>
            )
          }
        />
      </AppShell>
    );
  }

  return <>{children}</>;
};

export default RequireRole;
