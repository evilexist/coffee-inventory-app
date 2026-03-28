-- 创建缺失的核心数据表
-- 迁移版本: 003
-- 创建时间: 2025-03-23
-- 说明: 为dev数据库创建初始的表结构（除了users表之外）

-- 1. 创建 coffee_beans 表
CREATE TABLE IF NOT EXISTS coffee_beans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  origin_country VARCHAR(100),
  origin_region VARCHAR(100),
  origin VARCHAR(255),
  brand_roaster VARCHAR(255),
  producer VARCHAR(255),
  altitude VARCHAR(100),
  variety VARCHAR(100),
  flavor_notes TEXT,
  roast_level VARCHAR(50),
  process VARCHAR(100),
  roast_date VARCHAR(50),
  reference_price DECIMAL(10,2),
  stock DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 创建 inventory_logs 表
CREATE TABLE IF NOT EXISTS inventory_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  bean_id VARCHAR(36) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
  amount DECIMAL(10,2) NOT NULL,
  date VARCHAR(50) NOT NULL,
  roast_date VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE
);

-- 3. 创建 tasting_records 表
CREATE TABLE IF NOT EXISTS tasting_records (
  id VARCHAR(36) PRIMARY KEY,
  bean_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  date VARCHAR(50) NOT NULL,
  dose DECIMAL(10,2),
  brew_method VARCHAR(100),
  dripper VARCHAR(100),
  filter_paper VARCHAR(100),
  grinder VARCHAR(100),
  grind_size VARCHAR(50),
  water_temp DECIMAL(5,2),
  ratio VARCHAR(20),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  improvement TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 创建索引以优化查询性能（在表创建之后）
CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_id ON coffee_beans(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_bean_id ON inventory_logs(bean_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date);
CREATE INDEX IF NOT EXISTS idx_tasting_records_bean_id ON tasting_records(bean_id);
CREATE INDEX IF NOT EXISTS idx_tasting_records_user_id ON tasting_records(user_id);
CREATE INDEX IF NOT EXISTS idx_tasting_records_date ON tasting_records(date);

-- 完成！
-- 验证: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
