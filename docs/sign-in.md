# Sign-in and people

## How it works on playground

- Reporting pages are readable without signing in. Only editors and admins need an account.
- People sign in with their **@vinted.com email and a password**. There is no self sign-up.
- An admin adds someone in **Settings → Users → Add person** (email, name, access level) and gets a
  one-time link to send them on Slack. The link lets them choose a password (valid 7 days, works once).
- Forgot a password: an admin clicks **Reset link** next to the person and sends the new link (valid 24h).
- Removing access: set the person to **No access**. They can still view, like anyone.
- 5 wrong passwords for an email (or 20 from one IP) lock sign-in for 15 minutes.

### First admin

Admins imported from Lovable have no password yet. On every start the server writes a one-time setup
link for each of them to the app log:

```
[admin setup] name@vinted.com has no password yet. One-time link (24h): https://…/auth/set-password#token=…
```

Open the app's logs in playground, copy the link, and set a password. Nothing is logged once every
admin has one.

## Storage

| Table | What |
|---|---|
| `profiles` | One row per person, keyed by id, **identified by email**. Also used by Google sign-in. |
| `user_roles` | admin / editor / viewer per person. |
| `user_passwords` | scrypt password hashes. Password sign-in only. |
| `password_links` | SHA-256 hashes of one-time links. Password sign-in only. |

## Moving to Google sign-in later (own domain)

Google sign-in is already built (`server/auth.ts`). It matches people **by email** to the existing
`profiles` row, so ids, roles and the change-log history all carry over.

1. Create a Google OAuth client (Web application, consent screen Internal) with the redirect URI
   `https://<new-domain>/auth/google/callback`.
2. Set `PUBLIC_URL=https://<new-domain>`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   The sign-in page then shows "Continue with Google" next to the password form.
3. Once everyone has signed in with Google, set `AUTH_PASSWORD=off`. The password form, the
   Add person links and the setup-link log disappear. New people then join by signing in with
   Google (they start as viewers) and admins change their access in Settings → Users.
4. Optionally drop the password tables:
   ```sql
   DROP TABLE password_links;
   DROP TABLE user_passwords;
   ```
