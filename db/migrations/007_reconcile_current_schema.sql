-- 统一当前项目依赖的数据库结构，作为旧环境补齐迁移
-- 执行建议：在部署新代码前运行本文件，确保结构与当前业务代码一致

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

ALTER TABLE coffee_beans
ADD COLUMN IF NOT EXISTS agtron INTEGER;

ALTER TABLE coffee_beans
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coffee_beans_agtron_check'
  ) THEN
    ALTER TABLE coffee_beans
    ADD CONSTRAINT coffee_beans_agtron_check CHECK (agtron >= 0 AND agtron <= 100);
  END IF;
END $$;

ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE tasting_records
ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);

ALTER TABLE tasting_records
ADD COLUMN IF NOT EXISTS water_quality VARCHAR(100);

UPDATE tasting_records tr
SET user_id = cb.user_id
FROM coffee_beans cb
WHERE tr.bean_id = cb.id
  AND (tr.user_id IS NULL OR tr.user_id = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM tasting_records
    WHERE user_id IS NULL OR user_id = ''
  ) THEN
    RAISE EXCEPTION 'tasting_records.user_id 仍存在空值，请先修复历史数据后再执行 NOT NULL 约束';
  END IF;

  ALTER TABLE tasting_records
  ALTER COLUMN user_id SET NOT NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coffee_beans_user_id_fkey'
  ) THEN
    ALTER TABLE coffee_beans
    ADD CONSTRAINT coffee_beans_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_logs_user_id_fkey'
  ) THEN
    ALTER TABLE inventory_logs
    ADD CONSTRAINT inventory_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_logs_bean_id_fkey'
  ) THEN
    ALTER TABLE inventory_logs
    ADD CONSTRAINT inventory_logs_bean_id_fkey
    FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasting_records_user_id_fkey'
  ) THEN
    ALTER TABLE tasting_records
    ADD CONSTRAINT tasting_records_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasting_records_bean_id_fkey'
  ) THEN
    ALTER TABLE tasting_records
    ADD CONSTRAINT tasting_records_bean_id_fkey
    FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_id ON coffee_beans(user_id);
CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_deleted ON coffee_beans(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_bean_id ON inventory_logs(bean_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date);
CREATE INDEX IF NOT EXISTS idx_tasting_records_bean_id ON tasting_records(bean_id);
CREATE INDEX IF NOT EXISTS idx_tasting_records_user_id ON tasting_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_records_date ON tasting_records(date);
CREATE INDEX IF NOT EXISTS idx_tasting_records_user_date ON tasting_records(user_id, date DESC);
