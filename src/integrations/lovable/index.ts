// Sign-in now goes through our own server (server/auth.ts) instead of Lovable Cloud auth.
// The shape of `lovable.auth.signInWithOAuth` is kept so the Auth page is unchanged.

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type SignInResult = { redirected?: boolean; error?: Error };

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google", _opts?: SignInOptions): Promise<SignInResult> => {
      if (provider !== "google") return { error: new Error(`${provider} sign-in is not available`) };
      window.location.assign("/auth/google");
      return { redirected: true };
    },
  },
};
