import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GoogleLogo } from "@phosphor-icons/react";
import { lovable } from "@/integrations/lovable/index";
import { getProviders, signInWithPassword } from "@/integrations/auth/api";
import { DesignCard } from "@/components/ds/DesignCard";
import { DesignButton } from "@/components/ds/DesignButton";
import { DesignInputText } from "@/components/ds/DesignInput";
import { DesignSpacer } from "@/components/ds/DesignSpacer";
import { useToast } from "@/hooks/use-toast";
import { ALLOWED_EMAIL_DOMAIN, useSession } from "@/hooks/useAuth";
import vintedIconRounded from "@/assets/vinted-icon-rounded.svg";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useSession();
  const providers = useQuery({ queryKey: ["auth-providers"], queryFn: getProviders, staleTime: Infinity });
  const [busy, setBusy] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) navigate("/settings/data-sources", { replace: true });
  }, [session, navigate]);

  React.useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;
    toast({ title: "Google sign-in failed", description: error, variant: "destructive" });
    window.history.replaceState(null, "", window.location.pathname);
  }, [toast]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" },
    });

    if (result.error) {
      setBusy(false);
      toast({
        title: "Google sign-in failed",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }

    if (result.redirected) return;
    setBusy(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const usePassword = providers.data?.password ?? true;
  const useGoogle = providers.data?.google ?? false;

  return (
    <main className="min-h-screen bg-spacing-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <img src={vintedIconRounded} alt="Bloom Metrics logo" className="h-8 w-8 rounded-[6px]" />
          <span className="text-[18px] font-[580] text-foreground">Bloom Metrics</span>
        </div>
        <DesignCard className="p-6">
          <h1 className="text-[22px] font-[580] text-foreground">Sign in</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Sign in to manage data sources and enter data. Reporting pages stay readable without an
            account.
          </p>
          <DesignSpacer size="medium" />

          {usePassword && (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <DesignInputText
                label="Work email"
                type="email"
                autoComplete="username"
                placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <DesignInputText
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={Boolean(error)}
                validation={error ?? undefined}
                required
              />
              <DesignButton type="submit" fullWidth variant="filled" theme="primary" isLoading={busy}>
                Sign in
              </DesignButton>
              <p className="text-[12px] text-muted-foreground">
                No account yet, or forgot your password? Ask an admin for a sign-in link.
              </p>
            </form>
          )}

          {usePassword && useGoogle && <DesignSpacer size="medium" />}

          {useGoogle && (
            <DesignButton
              fullWidth
              variant={usePassword ? "outlined" : "filled"}
              theme="primary"
              isLoading={busy && !usePassword}
              icon={<GoogleLogo size={16} weight="bold" />}
              onClick={google}
            >
              Continue with Google
            </DesignButton>
          )}
        </DesignCard>
      </div>
    </main>
  );
};

export default Auth;
