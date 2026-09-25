# Bloom Metrics

A dashboard for the health of the Bloom design system: impact (survey scores), adoption
(component usage in design and code) and documentation, plus OKRs and team performance.

## Stack

- **Frontend:** React + Vite + Tailwind, in `src/`.
- **Server:** Node (Express, run with `tsx`) in `server/`. It serves the built app, a small data API
  with role-based access, sign-in, and the integrations (Figma, GA4, Google Sheets, Atlassian Goals, GetDX).
- **Database:** MySQL 8. The schema lives in `server/schema.sql` and is applied on every start.

The frontend still talks to the server through a `supabase-js`-shaped client
(`src/integrations/supabase/client.ts`), a leftover from the app's Lovable origins, so pages call
`supabase.from(...)` as before.

## Run locally

```bash
npm install
cp .env.example .env
npm run db:dev    # throwaway MySQL on :33306
npm run server    # API on :8080 (creates tables on start)
npm run dev       # app on :5173, proxies /api to the server
```

Integrations (Figma, Atlassian Goals, GetDX) need tokens. Locally, put them in `.env`
(`FIGMA_ACCESS_TOKEN`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, `ATLASSIAN_WORKSPACE`,
`GETDX_API_TOKEN`): the server falls back to these when nothing is saved in Settings, and they
survive the local database being reset. Restart the API after editing `.env`.

No Figma token? Set `FIGMA_FAKE_DATA=1` in `.env` for made-up, deterministic Figma data (library
analytics, file names and quarterly snapshots for all libraries). It only works locally: it's
ignored in production and off `localhost`, and its code (`server/dev/`) isn't in the production image.

Local sign-in: set `DEV_ADMIN_PASSWORD` in `.env` (see [docs/sign-in.md](docs/sign-in.md)).

## Deploy

The `Dockerfile` builds the app and runs `npm start` (apply schema, then serve). Configuration is
entirely environment variables:

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `SESSION_SECRET` | Signs session cookies (32+ characters) |
| `CREDENTIALS_KEY` | Encrypts integration tokens saved in Settings |
| `PUBLIC_URL` | Public address of the app (sign-in links, OAuth redirect) |
| `PERFORMANCE_SHEET_ID` | Google Sheet with the quarterly performance tabs |
| `FIGMA_FILE_KEYS` | Figma libraries captured by the snapshot job |
| `GA4_APPS_SCRIPT_URL` | The Apps Script web app (`docs/ga4-apps-script.gs`); editors sync GA4 data with **Sync Google Analytics** on the Documentation page |
| `GA4_PROPERTIES` | GA4 property labels |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |

Integration tokens (Figma, Atlassian, GetDX) are entered by an admin in Settings, not as variables.

## Sign-in

Email and password for people an admin adds, with one-time links; Google sign-in when configured.
See [docs/sign-in.md](docs/sign-in.md).
