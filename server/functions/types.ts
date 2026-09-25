import type { SessionUser } from "../auth.ts";

/** What a ported edge function receives. Replaces Deno's `Request`. */
export interface FnRequest {
  method: string;
  /** Query string of the invoked path, e.g. `getdx-teams?historic=1`. */
  query: URLSearchParams;
  /** Parsed JSON body ({} when none). */
  body: any;
  headers: Record<string, string | undefined>;
  /** Signed-in user, or null for anonymous visitors. */
  user: SessionUser | null;
}

export interface FnResponse {
  status?: number;
  body: unknown;
}

export type FnHandler = (req: FnRequest) => Promise<FnResponse>;
