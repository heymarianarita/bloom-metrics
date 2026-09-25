import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Drop-in stand-in for the supabase-js client, talking to our own Node server
 * (server/) instead of Lovable Cloud. It implements the subset of the
 * query-builder, rpc, functions and auth APIs this app uses, so hooks and pages
 * keep calling `supabase.from(...)` unchanged. Types still come from supabase-js.
 *
 * Import the client like this:
 * import { supabase } from "@/integrations/supabase/client";
 */

type Json = Record<string, unknown>;
type Filter = { column: string; op: string; value: unknown; negate?: boolean };

interface PgError {
  message: string;
  code: string;
  details: string | null;
  hint: string | null;
}

const networkError = (e: unknown): PgError => ({
  message: e instanceof Error ? e.message : 'Network error',
  code: 'NETWORK',
  details: null,
  hint: null,
});

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await res.json().catch(() => null);
  return { res, payload };
}

class QueryBuilder implements PromiseLike<unknown> {
  private req: Json & { filters: Filter[]; order: Json[] };
  private shouldThrow = false;

  constructor(table: string) {
    this.req = { table, action: 'select', filters: [], order: [] };
  }

  select(columns = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this.req.action === 'select') {
      this.req.columns = columns;
      if (opts?.count) this.req.count = 'exact';
      if (opts?.head) this.req.head = true;
    } else {
      this.req.returning = true;
    }
    return this;
  }
  insert(values: unknown) {
    Object.assign(this.req, { action: 'insert', values });
    return this;
  }
  upsert(values: unknown, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    Object.assign(this.req, { action: 'upsert', values, onConflict: opts?.onConflict, ignoreDuplicates: opts?.ignoreDuplicates });
    return this;
  }
  update(values: unknown) {
    Object.assign(this.req, { action: 'update', values });
    return this;
  }
  delete() {
    this.req.action = 'delete';
    return this;
  }

  private filter(column: string, op: string, value: unknown, negate = false) {
    this.req.filters.push({ column, op, value, negate });
    return this;
  }
  eq(column: string, value: unknown) { return this.filter(column, 'eq', value); }
  neq(column: string, value: unknown) { return this.filter(column, 'neq', value); }
  gt(column: string, value: unknown) { return this.filter(column, 'gt', value); }
  gte(column: string, value: unknown) { return this.filter(column, 'gte', value); }
  lt(column: string, value: unknown) { return this.filter(column, 'lt', value); }
  lte(column: string, value: unknown) { return this.filter(column, 'lte', value); }
  like(column: string, value: unknown) { return this.filter(column, 'like', value); }
  ilike(column: string, value: unknown) { return this.filter(column, 'ilike', value); }
  is(column: string, value: unknown) { return this.filter(column, 'is', value); }
  in(column: string, values: unknown[]) { return this.filter(column, 'in', values); }
  not(column: string, op: string, value: unknown) { return this.filter(column, op, value, true); }
  match(query: Record<string, unknown>) {
    Object.entries(query).forEach(([k, v]) => this.eq(k, v));
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.req.order.push({ column, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst });
    return this;
  }
  limit(count: number) {
    this.req.limit = count;
    return this;
  }
  range(from: number, to: number) {
    this.req.offset = from;
    this.req.limit = to - from + 1;
    return this;
  }
  single() {
    this.req.single = 'one';
    return this;
  }
  maybeSingle() {
    this.req.single = 'maybe';
    return this;
  }
  throwOnError() {
    this.shouldThrow = true;
    return this;
  }
  returns() {
    return this;
  }
  abortSignal() {
    return this;
  }

  private async run() {
    try {
      const { res, payload } = await postJson('/api/db', this.req);
      const error: PgError | null = payload?.error ?? (res.ok ? null : { message: res.statusText, code: String(res.status), details: null, hint: null });
      if (error && this.shouldThrow) throw error;
      return { data: error ? null : (payload?.data ?? null), error, count: payload?.count ?? null, status: res.status, statusText: res.statusText };
    } catch (e) {
      if (this.shouldThrow) throw e;
      return { data: null, error: networkError(e), count: null, status: 0, statusText: '' };
    }
  }

  then<R1 = unknown, R2 = never>(
    onfulfilled?: ((value: unknown) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

/** Matches supabase-js' FunctionsHttpError: `context` is the raw Response. */
class FunctionsHttpError extends Error {
  constructor(public context: Response) {
    super('Edge Function returned a non-2xx status code');
    this.name = 'FunctionsHttpError';
  }
}

// ---- auth -------------------------------------------------------------------

type AuthListener = (event: string, session: Session | null) => void;
const listeners = new Set<AuthListener>();
let sessionPromise: Promise<Session | null> | null = null;

const toSession = (user: User | null): Session | null =>
  user
    ? ({
        access_token: '',
        refresh_token: '',
        token_type: 'bearer',
        expires_in: 0,
        user,
      } as Session)
    : null;

const loadSession = (force = false) => {
  if (!sessionPromise || force) {
    sessionPromise = fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((body: { user: User | null }) => toSession(body.user))
      .catch(() => null);
  }
  return sessionPromise;
};

const auth = {
  getSession: async () => ({ data: { session: await loadSession() }, error: null }),
  getUser: async () => ({ data: { user: (await loadSession())?.user ?? null }, error: null }),
  onAuthStateChange: (callback: AuthListener) => {
    listeners.add(callback);
    loadSession().then((s) => callback('INITIAL_SESSION', s));
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  signOut: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    sessionPromise = Promise.resolve(null);
    listeners.forEach((l) => l('SIGNED_OUT', null));
    return { error: null };
  },
  /** Sessions are cookie-based now; kept so old call sites don't break. */
  setSession: async () => {
    const session = await loadSession(true);
    listeners.forEach((l) => l('SIGNED_IN', session));
    return { data: { session, user: session?.user ?? null }, error: null };
  },
};

// ---- client -----------------------------------------------------------------

const client = {
  from: (table: string) => new QueryBuilder(table),
  rpc: async (fn: string, args?: Record<string, unknown>) => {
    try {
      const { res, payload } = await postJson(`/api/rpc/${encodeURIComponent(fn)}`, args ?? {});
      return { data: payload?.data ?? null, error: payload?.error ?? (res.ok ? null : { message: res.statusText }), status: res.status };
    } catch (e) {
      return { data: null, error: networkError(e), status: 0 };
    }
  },
  functions: {
    invoke: async (name: string, opts?: { body?: unknown; method?: string; headers?: Record<string, string> }) => {
      const method = (opts?.method ?? 'POST').toUpperCase();
      const [fn, qs] = name.split('?');
      const url = `/api/functions/${encodeURIComponent(fn)}${qs ? `?${qs}` : ''}`;
      try {
        const res = await fetch(url, {
          method,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
          body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(opts?.body ?? {}),
        });
        if (!res.ok) return { data: null, error: new FunctionsHttpError(res) };
        const text = await res.text();
        let data: unknown = text;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          /* plain text response */
        }
        return { data, error: null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
  },
  auth,
};

export const supabase = client as unknown as SupabaseClient<Database>;
