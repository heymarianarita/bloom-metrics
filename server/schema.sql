-- Bloom Metrics schema for MySQL 8.
-- Mirrors the Lovable (Postgres) schema: same tables and columns, with the defaults,
-- unique keys and indexes the plain data export leaves out. Row-level security,
-- updated_at triggers and the change log are handled by the Node server instead.

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(320),
  `display_name` TEXT,
  `avatar_url` TEXT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `profiles_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('admin','editor','viewer') NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_key` (`user_id`, `role`),
  CONSTRAINT `user_roles_user_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_credentials` (
  `name` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL DEFAULT (''),
  `updated_by` CHAR(36),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_source_configs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `source_key` VARCHAR(191) NOT NULL,
  `label` TEXT NOT NULL DEFAULT (''),
  `config` JSON NOT NULL DEFAULT (JSON_OBJECT()),
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` CHAR(36),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `data_source_configs_source_key_key` (`source_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_runs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `source_key` VARCHAR(191) NOT NULL,
  `status` VARCHAR(64) NOT NULL,
  `message` TEXT NOT NULL DEFAULT (''),
  `row_count` INT,
  `triggered_by` VARCHAR(191) NOT NULL DEFAULT 'manual',
  `ran_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `sync_runs_source_time_idx` (`source_key`, `ran_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `metric_groups` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` VARCHAR(191) NOT NULL,
  `name` TEXT NOT NULL DEFAULT (''),
  `description` TEXT NOT NULL DEFAULT (''),
  `sort_order` INT NOT NULL DEFAULT 0,
  `periodicity` VARCHAR(32) NOT NULL DEFAULT 'quarterly',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `metric_groups_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_datasets` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` VARCHAR(191) NOT NULL,
  `name` TEXT NOT NULL DEFAULT (''),
  `description` TEXT NOT NULL DEFAULT (''),
  `sort_order` INT NOT NULL DEFAULT 0,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `manual_datasets_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_dataset_columns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `dataset_id` CHAR(36) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `label` TEXT NOT NULL DEFAULT (''),
  `kind` VARCHAR(32) NOT NULL DEFAULT 'text',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `manual_dataset_columns_dataset_id_key_key` (`dataset_id`, `key`),
  CONSTRAINT `manual_dataset_columns_dataset_fk` FOREIGN KEY (`dataset_id`) REFERENCES `manual_datasets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `manual_dataset_columns_kind_check` CHECK (`kind` IN ('text','number','period','email','date'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_dataset_rows` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `dataset_id` CHAR(36) NOT NULL,
  `data` JSON NOT NULL DEFAULT (JSON_OBJECT()),
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `manual_dataset_rows_dataset_idx` (`dataset_id`),
  CONSTRAINT `manual_dataset_rows_dataset_fk` FOREIGN KEY (`dataset_id`) REFERENCES `manual_datasets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_metrics` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` VARCHAR(191) NOT NULL,
  `name` TEXT NOT NULL DEFAULT (''),
  `unit` VARCHAR(64) NOT NULL DEFAULT '',
  `surface` VARCHAR(191) NOT NULL DEFAULT '',
  `description` TEXT NOT NULL DEFAULT (''),
  `sort_order` INT NOT NULL DEFAULT 0,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `dataset_id` CHAR(36),
  `value_column` VARCHAR(191) NOT NULL DEFAULT '',
  `period_column` VARCHAR(191) NOT NULL DEFAULT '',
  `aggregation` VARCHAR(32) NOT NULL DEFAULT 'sum',
  `source_type` VARCHAR(32) NOT NULL DEFAULT 'dataset',
  `source_key` VARCHAR(191) NOT NULL DEFAULT '',
  `source_field` VARCHAR(191) NOT NULL DEFAULT '',
  `filter_columns` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `breakdown_views` JSON NOT NULL DEFAULT (JSON_OBJECT()),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `manual_metrics_slug_key` (`slug`),
  CONSTRAINT `manual_metrics_dataset_fk` FOREIGN KEY (`dataset_id`) REFERENCES `manual_datasets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `manual_metrics_aggregation_check` CHECK (`aggregation` IN ('sum','avg','latest','count')),
  CONSTRAINT `manual_metrics_source_type_check` CHECK (`source_type` IN ('dataset','dynamic'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `manual_metric_values` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `metric_id` CHAR(36) NOT NULL,
  `period` VARCHAR(64) NOT NULL,
  `value` DECIMAL(20,6) NOT NULL,
  `note` TEXT NOT NULL DEFAULT (''),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `manual_metric_values_metric_id_period_key` (`metric_id`, `period`),
  CONSTRAINT `manual_metric_values_metric_fk` FOREIGN KEY (`metric_id`) REFERENCES `manual_metrics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_template_definitions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `slug` VARCHAR(191) NOT NULL,
  `name` TEXT NOT NULL DEFAULT (''),
  `sort_order` INT NOT NULL DEFAULT 0,
  `archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_template_definitions_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_template_metrics` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `template_id` CHAR(36) NOT NULL,
  `quarter` VARCHAR(32) NOT NULL,
  `prototypes_created` INT NOT NULL DEFAULT 0,
  `active_users` INT NOT NULL DEFAULT 0,
  `active_teams` INT NOT NULL DEFAULT 0,
  `prototypes_off_bloom` INT NOT NULL DEFAULT 0,
  `note` TEXT NOT NULL DEFAULT (''),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_template_metrics_template_id_quarter_key` (`template_id`, `quarter`),
  CONSTRAINT `ai_template_metrics_template_fk` FOREIGN KEY (`template_id`) REFERENCES `ai_template_definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `performance_entries` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `quarter` VARCHAR(32) NOT NULL,
  `team` TEXT NOT NULL DEFAULT (''),
  `intended_outcomes` TEXT NOT NULL DEFAULT (''),
  `main_deliverables` TEXT NOT NULL DEFAULT (''),
  `headcount` TEXT NOT NULL DEFAULT (''),
  `discovery_rag` VARCHAR(32) NOT NULL DEFAULT '',
  `delivery_rag` VARCHAR(32) NOT NULL DEFAULT '',
  `impact_rag` VARCHAR(32) NOT NULL DEFAULT '',
  `comment` TEXT NOT NULL DEFAULT (''),
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `performance_entries_quarter_idx` (`quarter`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_change_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `table_name` VARCHAR(64) NOT NULL,
  `row_id` CHAR(36),
  `action` VARCHAR(16) NOT NULL,
  `changed_by` CHAR(36),
  `old_data` JSON,
  `new_data` JSON,
  `changed_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `data_change_log_table_time_idx` (`table_name`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ga4_report_snapshots` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `source` VARCHAR(64) NOT NULL DEFAULT 'apps_script',
  `range_start` DATE,
  `range_end` DATE,
  `properties` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `raw_payload` JSON NOT NULL DEFAULT (JSON_OBJECT()),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ga4_report_snapshots_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `figma_adoption_snapshots` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `file_key` VARCHAR(191) NOT NULL,
  `file_name` TEXT,
  `quarter` VARCHAR(16) NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `inserts` INT,
  `detaches` INT,
  `usages` INT,
  `component_count` INT,
  `components_used` INT,
  `documented_count` INT,
  `documentation_coverage` INT,
  `detach_rate` DECIMAL(5,2),
  `components` JSON NOT NULL DEFAULT (JSON_ARRAY()),
  `captured_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `figma_adoption_snapshots_file_quarter_key` (`file_key`, `quarter`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email + password sign-in while the app runs on playground (no Google OAuth client there).
-- People are identified by their @vinted.com email in `profiles`, which is what Google
-- sign-in matches on too, so moving to Google later only means dropping these two tables.
CREATE TABLE IF NOT EXISTS `user_passwords` (
  `user_id` CHAR(36) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_passwords_user_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time links an admin shares to let someone set (or reset) their password.
CREATE TABLE IF NOT EXISTS `password_links` (
  `token_hash` CHAR(64) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `purpose` ENUM('invite','reset','setup') NOT NULL,
  `created_by` CHAR(36),
  `expires_at` DATETIME(6) NOT NULL,
  `used_at` DATETIME(6),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`token_hash`),
  KEY `password_links_user_idx` (`user_id`),
  CONSTRAINT `password_links_user_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Server-side copies of slow third-party data (e.g. the GetDX team tree), refreshed on a schedule.
CREATE TABLE IF NOT EXISTS `integration_cache` (
  `cache_key` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `fetched_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`cache_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracks one-off data steps (the Lovable import) so they never run twice.
CREATE TABLE IF NOT EXISTS `app_migrations` (
  `name` VARCHAR(191) NOT NULL,
  `applied_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
