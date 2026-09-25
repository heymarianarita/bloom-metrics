import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/components/layout/AppShell";
import RequireRole from "@/components/auth/RequireRole";
import { DesignPageHeader } from "@/components/ds/DesignPageHeader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignDataTable, type DataTableColumn } from "@/components/ds/DesignDataTable";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignBadge } from "@/components/ds/DesignBadge";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignDialog } from "@/components/ds/DesignDialog";
import { DesignInputText } from "@/components/ds/DesignInput";
import { supabase } from "@/integrations/supabase/client";
import { addPerson, createSignInLink, getPeopleStatus, type SignInLink } from "@/integrations/auth/api";
import { useToast } from "@/hooks/use-toast";
import { useSession, type AppRole } from "@/hooks/useAuth";

type Member = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  role: AppRole | null;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin — edit data and manage people" },
  { value: "editor", label: "Editor — edit all data" },
  { value: "viewer", label: "Viewer — view only" },
  { value: "none", label: "No access" },
];

const rank: Record<AppRole, number> = { admin: 3, editor: 2, viewer: 1 };

const useMembers = () =>
  useQuery({
    queryKey: ["members"],
    queryFn: async (): Promise<Member[]> => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw new Error(profiles.error.message);
      if (roles.error) throw new Error(roles.error.message);

      const highest = new Map<string, AppRole>();
      for (const row of roles.data ?? []) {
        const next = row.role as AppRole;
        const current = highest.get(row.user_id);
        if (!current || rank[next] > rank[current]) highest.set(row.user_id, next);
      }
      return (profiles.data ?? []).map((p) => ({ ...p, role: highest.get(p.id) ?? null }));
    },
  });

/** Shows a one-time sign-in link for the admin to send on Slack. */
const LinkDialog = ({ link, email, onClose }: { link: SignInLink | null; email: string; onClose: () => void }) => {
  const { toast } = useToast();
  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.link);
    toast({ title: "Link copied" });
  };
  return (
    <DesignDialog open={Boolean(link)} onOpenChange={(open) => !open && onClose()} title="Sign-in link ready">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Send this to <span className="text-foreground">{email}</span> on Slack. It lets them choose a password, works
          once, and expires on {link ? new Date(link.expires_at).toLocaleString() : ""}.
        </p>
        <DesignInputText value={link?.link ?? ""} readOnly onFocus={(e) => e.currentTarget.select()} />
        <div className="flex flex-col gap-2">
          <DesignButton fullWidth variant="filled" theme="primary" onClick={copy}>
            Copy link
          </DesignButton>
          <DesignButton fullWidth variant="flat" theme="muted" onClick={onClose}>
            Done
          </DesignButton>
        </div>
      </div>
    </DesignDialog>
  );
};

const AddPersonDialog = ({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (email: string, link: SignInLink | null) => void;
}) => {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<AppRole>("editor");
  const [error, setError] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: () => addPerson({ email, display_name: name, role }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["people-status"] });
      onAdded(email.trim().toLowerCase(), res.link && res.expires_at ? { link: res.link, expires_at: res.expires_at } : null);
      setEmail("");
      setName("");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : String(err)),
  });

  return (
    <DesignDialog open={open} onOpenChange={onOpenChange} title="Add a person">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <DesignInputText label="Work email" type="email" placeholder="name@vinted.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <DesignInputText label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <DesignInputSelect
          label="Access"
          value={role}
          options={ROLE_OPTIONS.filter((o) => o.value !== "none")}
          onChange={(value) => setRole(value as AppRole)}
        />
        {error && <p className="text-[12px] text-destructive">{error}</p>}
        <DesignButton type="submit" fullWidth variant="filled" theme="primary" isLoading={add.isPending}>
          Add and create sign-in link
        </DesignButton>
      </form>
    </DesignDialog>
  );
};

const UsersSettingsInner = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const members = useMembers();
  const status = useQuery({ queryKey: ["people-status"], queryFn: getPeopleStatus });
  const statusById = new Map((status.data?.people ?? []).map((p) => [p.user_id, p]));
  const passwordsOn = status.data?.password ?? true;
  const [adding, setAdding] = React.useState(false);
  const [shownLink, setShownLink] = React.useState<{ email: string; link: SignInLink } | null>(null);

  const newLink = useMutation({
    mutationFn: (row: Member) => createSignInLink(row.id).then((link) => ({ email: row.email ?? "", link })),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["people-status"] });
      setShownLink(res);
    },
    onError: (err) => toast({ title: "Could not create link", description: String(err), variant: "destructive" }),
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw new Error(del.error.message);
      if (role !== "none") {
        const ins = await supabase.from("user_roles").insert({ user_id: userId, role: role as AppRole });
        if (ins.error) throw new Error(ins.error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["my-role"] });
      toast({ title: "Role updated" });
    },
    onError: (err) =>
      toast({ title: "Could not update role", description: String(err), variant: "destructive" }),
  });

  const columns: DataTableColumn<Member>[] = [
    {
      key: "person",
      header: "Person",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-[14px] text-foreground">{row.display_name || row.email || "—"}</span>
          <span className="text-[12px] text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: "current",
      header: "Current access",
      render: (row) =>
        row.role ? (
          <DesignBadge theme={row.role === "admin" ? "primary" : row.role === "editor" ? "highlight" : "muted"} styling="light">
            {row.role === "admin" ? "Admin" : row.role === "editor" ? "Editor" : "Viewer"}
          </DesignBadge>
        ) : (
          <DesignBadge theme="muted" styling="light">No access</DesignBadge>
        ),
    },
    {
      key: "change",
      header: "Change access",
      render: (row) => (
        <div className="w-[260px]">
          <DesignInputSelect
            size="small"
            value={row.role ?? "none"}
            options={ROLE_OPTIONS}
            disabled={row.id === user?.id}
            onChange={(role) => setRole.mutate({ userId: row.id, role })}
          />
        </div>
      ),
    },
    ...(passwordsOn
      ? [
          {
            key: "signin",
            header: "Sign-in",
            render: (row: Member) => {
              const s = statusById.get(row.id);
              return (
                <div className="flex flex-col items-start gap-1">
                  {s?.has_password ? (
                    <DesignBadge theme="success" styling="light">Password set</DesignBadge>
                  ) : s?.link_expires_at ? (
                    <DesignBadge theme="highlight" styling="light">Link sent</DesignBadge>
                  ) : (
                    <DesignBadge theme="muted" styling="light">Not set up</DesignBadge>
                  )}
                  <DesignButton
                    size="small"
                    variant="flat"
                    theme="primary"
                    isLoading={newLink.isPending && newLink.variables?.id === row.id}
                    onClick={() => newLink.mutate(row)}
                  >
                    {s?.has_password ? "Reset link" : "New link"}
                  </DesignButton>
                </div>
              );
            },
          } satisfies DataTableColumn<Member>,
        ]
      : []),
    {
      key: "joined",
      header: "Added",
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <AppShell>
      <DesignPageHeader
        title="Users"
        subtitle="Only @vinted.com accounts can sign in. Add someone, then send them their one-time sign-in link to set a password."
        primaryAction={
          passwordsOn ? (
            <DesignButton size="medium" variant="filled" theme="primary" onClick={() => setAdding(true)}>
              Add person
            </DesignButton>
          ) : undefined
        }
      />
      <AddPersonDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={(email, link) => {
          setAdding(false);
          if (link) setShownLink({ email, link });
          else toast({ title: "Access updated", description: `${email} already has a password.` });
        }}
      />
      <LinkDialog link={shownLink?.link ?? null} email={shownLink?.email ?? ""} onClose={() => setShownLink(null)} />
      <DesignSpacer size="medium" />
      {members.isLoading ? (
        <DesignLoader />
      ) : (members.data ?? []).length === 0 ? (
        <DesignCard className="p-4">
          <DesignEmptyState title="Nobody here yet" body="Use Add person to invite the first people." />
        </DesignCard>
      ) : (
        <DesignCard className="p-4">
          <DesignDataTable
            columns={columns}
            data={members.data ?? []}
            rowKey={(row) => row.id}
            searchPlaceholder="Search people"
          />
        </DesignCard>
      )}
    </AppShell>
  );
};

const UsersSettings = () => (
  <RequireRole role="admin">
    <UsersSettingsInner />
  </RequireRole>
);

export default UsersSettings;
