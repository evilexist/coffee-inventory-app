-- 为多用户支持添加 user_id 字段
-- 执行时间: 约1-2秒

-- 1. 为 coffee_beans 表添加 user_id 字段
ALTER TABLE "coffee_beans" 
ADD COLUMN IF NOT EXISTS "user_id" varchar(36) NOT NULL DEFAULT '';

-- 2. 为 inventory_logs 表添加 user_id 字段
ALTER TABLE "inventory_logs" 
ADD COLUMN IF NOT EXISTS "user_id" varchar(36) NOT NULL DEFAULT '';

-- 3. 为 tasting_records 表添加 user_id 字段
ALTER TABLE "tasting_records" 
ADD COLUMN IF NOT EXISTS "user_id" varchar(36) NOT NULL DEFAULT '';

-- 4. 添加外键约束（如果不存在）
-- inventory_logs -> coffee_beans
ALTER TABLE "inventory_logs" 
ADD CONSTRAINT IF NOT EXISTS "inventory_logs_bean_id_fkey" 
FOREIGN KEY ("bean_id") REFERENCES "coffee_beans"("id") ON DELETE CASCADE;

-- inventory_logs -> users
ALTER TABLE "inventory_logs" 
ADD CONSTRAINT IF NOT EXISTS "inventory_logs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- tasting_records -> coffee_beans
ALTER TABLE "tasting_records" 
ADD CONSTRAINT IF NOT EXISTS "tasting_records_bean_id_fkey" 
FOREIGN KEY ("bean_id") REFERENCES "coffee_beans"("id") ON DELETE CASCADE;

-- tasting_records -> users
ALTER TABLE "tasting_records" 
ADD CONSTRAINT IF NOT EXISTS "tasting_records_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- coffee_beans -> users
ALTER TABLE "coffee_beans" 
ADD CONSTRAINT IF NOT EXISTS "coffee_beans_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_coffee_beans_user_id" ON "coffee_beans" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_logs_user_id" ON "inventory_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_tasting_records_user_id" ON "tasting_records" ("user_id");

-- 6. 更新现有数据的 user_id（重要！）
-- 警告：这会为所有现有记录设置一个默认用户ID
-- 请根据实际情况修改为正确的用户ID，或者先备份数据
UPDATE "coffee_beans" SET "user_id" = 'user-default-001' WHERE "user_id" = '';
UPDATE "inventory_logs" SET "user_id" = 'user-default-001' WHERE "user_id" = '';
UPDATE "tasting_records" SET "user_id" = 'user-default-001' WHERE "user_id" = '';

-- 如果已有用户，请将上面的 'user-default-001' 替换为实际的用户ID
-- 例如：UPDATE "coffee_beans" SET "user_id" = 'riku-user-id' WHERE "user_id" = '';

COMMIT;

-- 完成！
-- 请验证：SELECT column_name FROM information_schema.columns WHERE table_name = 'coffee_beans' AND column_name = 'user_id';
