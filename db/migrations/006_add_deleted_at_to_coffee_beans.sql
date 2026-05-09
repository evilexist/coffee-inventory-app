ALTER TABLE coffee_beans
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_deleted
ON coffee_beans(user_id, deleted_at);
