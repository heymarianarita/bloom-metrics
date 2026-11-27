import { createHash, timingSafeEqual } from "node:crypto";
import type { FnRequest, FnResponse } from "./types.ts";

export function authenticateCronRequest(req: Pick<FnRequest, "headers">): FnResponse | null {
  const currentSecret = process.env.CRON_SECRET;
  const previousSecret = process.env.CRON_SECRET_PREVIOUS;

  if (!currentSecret) {
    return { status: 500, body: "Server configuration error" };
  }

  const match = /^Bearer ([^\s,]+)$/.exec(req.headers.authorization ?? "");
  const token = match?.[1];
  if (!token) {
    return { status: 401, body: "Unauthorized" };
  }

  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  const providedDigest = digest(token);
  const currentMatches = timingSafeEqual(providedDigest, digest(currentSecret));
  const previousMatches = timingSafeEqual(providedDigest, digest(previousSecret ?? currentSecret));

  if (!currentMatches && !previousMatches) {
    return { status: 401, body: "Unauthorized" };
  }

  return null;
}
