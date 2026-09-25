import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { authRouter, readSession } from "./auth.ts";
import { applyDevAdminPassword, logAdminSetupLinks, passwordRouter } from "./passwords.ts";
import { handleDbRequest } from "./dbapi.ts";
import { handleRpc } from "./rpc.ts";
import { FUNCTIONS } from "./functions/index.ts";
import { captureFigmaSnapshots } from "./functions/figma-snapshot.ts";
import { getdxTeamsAgeDays, refreshGetdxTeams } from "./functions/getdx-teams.ts";
import { pool } from "./db.ts";
import { localDevFlag } from "./devmode.ts";
import type { FnHandler } from "./functions/types.ts";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

app.get("/healthz", wrap(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

app.use(authRouter());
app.use(passwordRouter());

app.post("/api/db", wrap(async (req, res) => {
  const out = await handleDbRequest(req.body, await readSession(req));
  res.status(out.status).json(out);
}));

app.post("/api/rpc/:name", wrap(async (req, res) => {
  const out = await handleRpc(req.params.name, req.body ?? {}, await readSession(req));
  res.status(out.status).json(out);
}));

/** Local development only: made-up Figma data (server/dev is not in the production image). */
const fakeFigma = async (name: string): Promise<FnHandler | undefined> => {
  if (!name.startsWith("figma-") || !localDevFlag("FIGMA_FAKE_DATA")) return undefined;
  const { FAKE_FIGMA_FUNCTIONS } = await import("./dev/fake-figma.ts");
  return FAKE_FIGMA_FUNCTIONS[name];
};

app.all("/api/functions/:name", wrap(async (req, res) => {
  const handler = (await fakeFigma(req.params.name)) ?? FUNCTIONS[req.params.name];
  if (!handler) {
    res.status(404).json({ error: `Function ${req.params.name} not found` });
    return;
  }
  const query = new URLSearchParams(req.url.split("?")[1] ?? "");
  const out = await handler({
    method: req.method,
    query,
    body: req.body ?? {},
    headers: req.headers as Record<string, string | undefined>,
    user: await readSession(req),
  });
  res.status(out.status ?? 200).json(out.body);
}));

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// The built React app, with index.html as the fallback for client-side routes.
app.use(express.static(distDir, { index: false, maxAge: "1h" }));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"), { headers: { "Cache-Control": "no-cache" } });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Replaces the pg_cron job: 1st and 15th of each month, 05:15 UTC.
cron.schedule(
  "15 5 1,15 * *",
  () => {
    captureFigmaSnapshots()
      .then((r) => console.log("figma snapshot captured", JSON.stringify(r).slice(0, 500)))
      .catch((e) => console.error("figma snapshot failed", e));
  },
  { timezone: "UTC" },
);

// GetDX teams change rarely: refresh the stored copy on the 1st of each month.
const refreshGetdx = () =>
  refreshGetdxTeams()
    .then((c) => console.log(`getdx teams refreshed: ${c.teams.length} teams, ${c.historic.length} historic`))
    .catch((e) => console.error("getdx teams refresh failed", e instanceof Error ? e.message : e));
cron.schedule("0 4 1 * *", refreshGetdx, { timezone: "UTC" });

app.listen(port, () => {
  console.log(`bloom-metrics listening on :${port}`);
  applyDevAdminPassword()
    .then(logAdminSetupLinks)
    .catch((e) => console.error("could not prepare admin sign-in", e));
  getdxTeamsAgeDays()
    .then((age) => {
      if (age > 31) return refreshGetdx();
    })
    .catch((e) => console.error("could not check GetDX copy", e));
});
