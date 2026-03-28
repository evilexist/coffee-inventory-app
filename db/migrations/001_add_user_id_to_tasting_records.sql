-- 为 tasting_records 表添加 user_id 字段以实现多用户数据隔离
-- 迁移版本: 001
-- 创建时间: 2025-03-19

-- 1. 添加 user_id 字段（先允许NULL以便后续更新）
ALTER TABLE tasting_records ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);

-- 2. 更新现有记录：根据 bean_id 关联的 coffee_beans.user_id 设置正确的 user_id
UPDATE tasting_records tr
SET user_id = cb.user_id
FROM coffee_beans cb
WHERE tr.bean_id = cb.id AND tr.user_id IS NULL;

-- 3. 设置 NOT NULL 约束（如果所有记录都已更新）
-- 注意：如果仍有NULL值，需要先处理这些记录
-- 这里假设所有记录都已通过上一步更新
ALTER TABLE tasting_records ALTER COLUMN user_id SET NOT NULL;

-- 4. 添加外键约束
ALTER TABLE tasting_records 
ADD CONSTRAINT IF NOT EXISTS fk_tasting_records_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 5. 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_tasting_records_user_id ON tasting_records(user_id);

-- 6. 可选：创建复合索引，优化按用户和日期的查询
CREATE INDEX IF NOT EXISTS idx_tasting_records_user_date ON tasting_records(user_id, date DESC);