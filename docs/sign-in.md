# Sign-in and people

## How it works

- Reporting pages are readable without signing in. Only editors and admins need an account.
- People sign in with their **@vinted.com email and a password**. There is no self sign-up.
- An admin adds someone in **Settings → Users → Add person** (email, name, access level) and gets a
  one-time link to send them on Slack. The link lets them choose a password (valid 7 days, works once).
- Forgot a password: an admin clicks **Reset link** next to the person and sends the new link (valid 24h).
- With Slack connected, the app sends these links itself as a Slack DM (the buttons read **Send link** and
  **Send reset link**). If Slack can't deliver one, the dialog shows the link to copy instead.

### Slack

1. At [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App → Paste a manifest**,
   pick the Vinted workspace and paste:

   ```yaml
   display_information:
     name: Bloom Metrics
     description: Bloom Metrics, the design system adoption dashboard. Sends sign-in links and reports.
   features:
     bot_user:
       display_name: Bloom Metrics
       always_online: false
     app_home:
       home_tab_enabled: false
       messages_tab_enabled: true
       messages_tab_read_only_enabled: true
   oauth_config:
     scopes:
       bot:
         - chat:write
         - users:read
         - users:read.email
   settings:
     org_deploy_enabled: false
     socket_mode_enabled: false
     token_rotation_enabled: false
   ```
2. **Install App → Install to Vinted** (a Slack admin may need to approve it).
3. Copy the bot token (`xoxb-…`) into **Settings → Data sources → Slack**. Locally, `SLACK_BOT_TOKEN`
   in `.env` works too.

People are found by their @vinted.com email, so it must match their Slack account's email.
- Removing access: set the person to **No access**. They can still view, like anyone.
- 5 wrong passwords for an email (or 20 from one IP) lock sign-in for 15 minutes.

### First admin

Admins imported from Lovable have no password yet. On every start the server writes a one-time setup
link for each of them to the app log:

```
[admin setup] name@vinted.com has no password yet. One-time link (24h): https://…/auth/set-password#token=…
```

Open the live app's logs, copy the link, and set a password. Nothing is logged once every
admin has one.

### Local development

The local database (`npm run db:dev`) starts empty on every run, so passwords from the live
site don't exist there. Set `DEV_ADMIN_PASSWORD` in `.env` (see `.env.example`) and every
admin in the local database gets that password when the API starts (the `.env.example` value is
`dev`; no length rule applies to it). It is ignored when
`NODE_ENV=production` or `PUBLIC_URL` isn't `localhost`, so it never applies to the live app.

To test editor or viewer screens, add a person in **Settings → Users** and open the
one-time link the dialog shows.

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
