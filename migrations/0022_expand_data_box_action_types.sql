PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS data_box_actions_new (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  data_box_id TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('archive', 'email', 'reply', 'review', 'ai_boost')),
  status TEXT NOT NULL CHECK (status IN ('prepared', 'requires_confirmation', 'confirmed', 'sent', 'archived', 'blocked', 'failed', 'skipped')),
  recipient TEXT,
  subject TEXT,
  body_preview TEXT,
  dedupe_key TEXT NOT NULL,
  requested_by_user_id TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT,
  completed_at TEXT,
  provider TEXT,
  provider_message_id TEXT,
  result_json TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES data_box_messages(id),
  FOREIGN KEY (data_box_id) REFERENCES data_boxes(id)
);

INSERT OR IGNORE INTO data_box_actions_new (
  id,
  message_id,
  data_box_id,
  action_type,
  status,
  recipient,
  subject,
  body_preview,
  dedupe_key,
  requested_by_user_id,
  requested_at,
  confirmed_at,
  completed_at,
  provider,
  provider_message_id,
  result_json,
  error_code,
  error_message,
  created_at,
  updated_at
)
SELECT
  id,
  message_id,
  data_box_id,
  action_type,
  status,
  recipient,
  subject,
  body_preview,
  dedupe_key,
  requested_by_user_id,
  requested_at,
  confirmed_at,
  completed_at,
  provider,
  provider_message_id,
  result_json,
  error_code,
  error_message,
  created_at,
  updated_at
FROM data_box_actions;

DROP TABLE data_box_actions;
ALTER TABLE data_box_actions_new RENAME TO data_box_actions;

CREATE UNIQUE INDEX IF NOT EXISTS idx_data_box_actions_dedupe
  ON data_box_actions(dedupe_key);

CREATE INDEX IF NOT EXISTS idx_data_box_actions_message
  ON data_box_actions(message_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_box_actions_status
  ON data_box_actions(status, action_type, created_at DESC);

PRAGMA foreign_keys = ON;
