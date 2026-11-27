import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { inAuditFrame, type AuditFrameWindow } from "./lib/auditFrame";

createRoot(document.getElementById("root")!).render(<App />);

if (import.meta.env.DEV) void import("./lib/bloomAudit").then((m) => m.install());
if (inAuditFrame()) void import("./lib/bloomAudit").then((m) => ((window as AuditFrameWindow).runBloomAudit = m.bloomAudit));
