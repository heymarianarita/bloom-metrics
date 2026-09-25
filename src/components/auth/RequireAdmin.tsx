import { ReactNode } from "react";
import RequireRole from "@/components/auth/RequireRole";

/** Backwards-compatible wrapper: admin-only gate. */
const RequireAdmin = ({ children }: { children: ReactNode }) => (
  <RequireRole role="admin">{children}</RequireRole>
);

export default RequireAdmin;
