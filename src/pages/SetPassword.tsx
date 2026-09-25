import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLinkInfo, setPasswordFromLink } from "@/integrations/auth/api";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignLoader } from "@/components/ds/DesignLoader";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";

/** Opened from a one-time link an admin shared: /auth/set-password#token=… */
const SetPassword = () => {
  const navigate = useNavigate();
  const token = React.useMemo(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "", []);
  const info = useQuery({
    queryKey: ["password-link", token],
    queryFn: () => getLinkInfo(token),
    enabled: Boolean(token),
    retry: false,
  });
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (info.data?.display_name) setName(info.data.display_name);
  }, [info.data?.display_name]);

  const minLength = info.data?.min_length ?? 12;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < minLength) return setError(`Use at least ${minLength} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setError(null);
    setBusy(true);
    try {
      await setPasswordFromLink(token, password, name);
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/settings/data-sources", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const invalid = !token || info.isError;

  return (
    <main className="min-h-screen bg-spacing-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <img src={vintedIconRounded} alt="Bloom Metrics logo" className="h-8 w-8 rounded-[6px]" />
          <span className="text-[18px] font-[580] text-foreground">Bloom Metrics</span>
        </div>
        <DesignCard className="p-6">
          {info.isLoading ? (
            <div className="flex justify-center py-6">
              <DesignLoader />
            </div>
          ) : invalid ? (
            <>
              <h1 className="text-[22px] font-[580] text-foreground">Link not valid</h1>
              <p className="text-[14px] text-muted-foreground mt-1">
                {info.error instanceof Error ? info.error.message : "This link is incomplete."}
              </p>
              <DesignSpacer size="medium" />
              <DesignButton fullWidth variant="outlined" theme="primary" onClick={() => navigate("/auth")}>
                Go to sign in
              </DesignButton>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-[580] text-foreground">
                {info.data?.purpose === "reset" ? "Choose a new password" : "Set up your account"}
              </h1>
              <p className="text-[14px] text-muted-foreground mt-1">
                For <span className="text-foreground">{info.data?.email}</span>. This link works once.
              </p>
              <DesignSpacer size="medium" />
              <form onSubmit={submit} className="flex flex-col gap-3">
                <input type="email" autoComplete="username" value={info.data?.email ?? ""} readOnly hidden />
                {info.data?.purpose !== "reset" && (
                  <DesignInputText label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                )}
                <DesignInputText
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  helperText={`At least ${minLength} characters.`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <DesignInputText
                  label="Repeat password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={Boolean(error)}
                  validation={error ?? undefined}
                  required
                />
                <DesignButton type="submit" fullWidth variant="filled" theme="primary" isLoading={busy}>
                  Save password and sign in
                </DesignButton>
              </form>
            </>
          )}
        </DesignCard>
      </div>
    </main>
  );
};

export default SetPassword;
