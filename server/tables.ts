/**
 * Table metadata for the generic data API (/api/db).
 *
 * `read` / `write` replace the Postgres row-level-security policies:
 *   public  — anyone, signed in or not
 *   editor  — admin or editor role (can_edit)
 *   admin   — admin role
 *   none    — only the server itself (integration functions)
 *   custom  — checked in access.ts (profiles, user_roles)
 */
export type Access = "public" | "editor" | "admin" | "none" | "custom";

export interface TableDef {
  columns: string[];
  json?: string[];
  bool?: string[];
  read: Access;
  write: Access;
  /** Writes are recorded in data_change_log (the old log_data_change trigger). */
  audited?: boolean;
  /** Has an updated_at column the server bumps on UPDATE. */
  updatedAt?: boolean;
  /** Extra columns sync_runs-style inserts are allowed for signed-in viewers. */
  insertByAnyUser?: boolean;
}

const ts = ["created_at", "updated_at"];

export const TABLES: Record<string, TableDef> = {
  profiles: {
    columns: ["id", "email", "display_name", "avatar_url", ...ts],
    read: "custom",
    write: "custom",
    updatedAt: true,
  },
  user_roles: {
    columns: ["id", "user_id", "role", "created_at"],
    read: "custom",
    write: "custom",
  },
  data_source_configs: {
    columns: ["id", "source_key", "label", "config", "enabled", "updated_by", ...ts],
    json: ["config"],
    bool: ["enabled"],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  sync_runs: {
    columns: ["id", "source_key", "status", "message", "row_count", "triggered_by", "ran_at"],
    read: "public",
    write: "none",
    insertByAnyUser: true,
  },
  metric_groups: {
    columns: ["id", "slug", "name", "description", "sort_order", "periodicity", ...ts],
    read: "public",
    write: "editor",
    updatedAt: true,
  },
  manual_datasets: {
    columns: ["id", "slug", "name", "description", "sort_order", "archived", ...ts],
    bool: ["archived"],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  manual_dataset_columns: {
    columns: ["id", "dataset_id", "key", "label", "kind", "sort_order", ...ts],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  manual_dataset_rows: {
    columns: ["id", "dataset_id", "data", "sort_order", ...ts],
    json: ["data"],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  manual_metrics: {
    columns: [
      "id", "slug", "name", "unit", "surface", "description", "sort_order", "archived",
      "dataset_id", "value_column", "period_column", "aggregation", "source_type",
      "source_key", "source_field", "filter_columns", "breakdown_views", ...ts,
    ],
    json: ["filter_columns", "breakdown_views"],
    bool: ["archived"],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  manual_metric_values: {
    columns: ["id", "metric_id", "period", "value", "note", ...ts],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  ai_template_definitions: {
    columns: ["id", "slug", "name", "sort_order", "archived", ...ts],
    bool: ["archived"],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  ai_template_metrics: {
    columns: [
      "id", "template_id", "quarter", "prototypes_created", "active_users", "active_teams",
      "prototypes_off_bloom", "note", ...ts,
    ],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  performance_entries: {
    columns: [
      "id", "quarter", "team", "intended_outcomes", "main_deliverables", "headcount",
      "discovery_rag", "delivery_rag", "impact_rag", "comment", "sort_order", ...ts,
    ],
    read: "public",
    write: "editor",
    audited: true,
    updatedAt: true,
  },
  data_change_log: {
    columns: ["id", "table_name", "row_id", "action", "changed_by", "old_data", "new_data", "changed_at"],
    json: ["old_data", "new_data"],
    read: "public",
    write: "none",
  },
  ga4_report_snapshots: {
    columns: ["id", "source", "range_start", "range_end", "properties", "raw_payload", "created_at"],
    json: ["properties", "raw_payload"],
    read: "none",
    write: "none",
  },
  figma_adoption_snapshots: {
    columns: [
      "id", "file_key", "file_name", "quarter", "period_start", "period_end", "inserts", "detaches",
      "usages", "component_count", "components_used", "documented_count", "documentation_coverage",
      "detach_rate", "components", "captured_at", "created_at",
    ],
    json: ["components"],
    read: "none",
    write: "none",
  },
};

export const DATETIME_COLUMNS = new Set(["created_at", "updated_at", "ran_at", "changed_at", "captured_at"]);
