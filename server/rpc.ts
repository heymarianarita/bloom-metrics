import { query, toIso } from "./db.ts";
import { adminExists, hasRole, type SessionUser } from "./auth.ts";
import { deleteCredential, isReadable, setCredential } from "./credentials.ts";

/** The Postgres functions the frontend calls through supabase.rpc(). */

type RpcResult = { status: number; data: unknown; error: { message: string; code: string } | null };

const ok = (data: unknown): RpcResult => ({ status: 200, data, error: null });
const fail = (status: number, message: string, code = "P0001"): RpcResult => ({ status, data: null, error: { message, code } });

export async function handleRpc(name: string, args: Record<string, unknown>, user: SessionUser | null): Promise<RpcResult> {
  // All four were granted to `authenticated` only.
  if (!user) return fail(401, "permission denied: sign in required", "42501");

  switch (name) {
    case "admin_exists":
      return ok(await adminExists());

    case "credential_status": {
      if (!(await hasRole(user.id, "admin"))) return ok([]);
      const rows = await query<{ name: string; value: string; updated_at: string; updated_by: string | null }>(
        "SELECT name, value, updated_at, updated_by FROM service_credentials ORDER BY name",
      );
      // The value itself never leaves the server; only whether it can still be decrypted.
      return ok(
        rows.map(({ value, ...r }) => ({ ...r, updated_at: toIso(r.updated_at), readable: isReadable(value) })),
      );
    }

    case "set_credential": {
      if (!(await hasRole(user.id, "admin"))) return fail(400, "Only admins can manage credentials");
      const credName = String(args._name ?? "").trim();
      const value = String(args._value ?? "");
      if (!credName) return fail(400, "Credential name is required");
      await setCredential(credName, value, user.id);
      return ok(null);
    }

    case "delete_credential": {
      if (!(await hasRole(user.id, "admin"))) return fail(400, "Only admins can manage credentials");
      await deleteCredential(String(args._name ?? ""));
      return ok(null);
    }

    default:
      return fail(404, `Could not find the function public.${name} in the schema cache`, "PGRST202");
  }
}
