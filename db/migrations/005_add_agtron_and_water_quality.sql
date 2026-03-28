-- 添加 Agtron 和 Water Quality 字段
-- 迁移版本: 005
-- 创建时间: 2025-03-28
-- 说明: 为 coffee_beans 表添加 agtron 字段，为 tasting_records 表添加 water_quality 字段

-- 1. 为 coffee_beans 表添加 agtron 字段
ALTER TABLE coffee_beans
ADD COLUMN IF NOT EXISTS agtron INTEGER CHECK (agtron >= 0 AND agtron <= 100);

-- 2. 为 tasting_records 表添加 water_quality 字段
ALTER TABLE tasting_records
ADD COLUMN IF NOT EXISTS water_quality VARCHAR(100);

-- 完成！
-- 验证:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'coffee_beans' AND column_name = 'agtron';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tasting_records' AND column_name = 'water_quality';
