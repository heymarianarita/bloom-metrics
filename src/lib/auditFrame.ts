import type { BloomAuditOptions, BloomAuditReport } from "./bloomAudit";

/** Query parameter that marks a page loaded by the Bloom compliance page's live check. */
export const AUDIT_FRAME_PARAM = "bloom-audit";

/** This window is the compliance page's hidden frame: no analytics, and the audit is exposed to the parent. */
export const inAuditFrame = () => window.self !== window.top && new URLSearchParams(window.location.search).has(AUDIT_FRAME_PARAM);

export interface AuditFrameWindow extends Window {
  runBloomAudit?: (options?: BloomAuditOptions) => Promise<BloomAuditReport>;
}
