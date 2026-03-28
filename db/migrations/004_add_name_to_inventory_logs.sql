-- 为 inventory_logs 表添加 name 字段
-- 迁移版本: 004
-- 创建时间: 2025-03-24
-- 说明: 添加咖啡豆名称字段，用于保存历史快照，避免查询时依赖咖啡豆表

-- 1. 添加 name 字段
ALTER TABLE "inventory_logs"
ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);

-- 2. 为现有记录填充 name（通过关联 coffee_beans 表）
-- 注意：只填充有对应咖啡豆的记录
UPDATE "inventory_logs" l
SET "name" = b.name
FROM "coffee_beans" b
WHERE l.bean_id = b.id
  AND l.name IS NULL;

-- 3. 创建索引以优化按名称查询（可选）
-- 如果经常需要按咖啡豆名称筛选日志，可以取消下面的注释
-- CREATE INDEX IF NOT EXISTS "idx_inventory_logs_name" ON "inventory_logs" ("name");

-- 完成！
-- 验证: SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_logs' AND column_name = 'name';
