-- 咖啡豆库存管理数据库表结构

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- 咖啡豆表
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
  agtron INTEGER CHECK (agtron >= 0 AND agtron <= 100),
  process VARCHAR(100),
  roast_date VARCHAR(50),
  reference_price DECIMAL(10,2),
  stock DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 出入库记录表
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

-- 品饮记录表
CREATE TABLE IF NOT EXISTS tasting_records (
  id VARCHAR(36) PRIMARY KEY,
  bean_id VARCHAR(36) NOT NULL,
  date VARCHAR(50) NOT NULL,
  dose DECIMAL(10,2),
  brew_method VARCHAR(100),
  dripper VARCHAR(100),
  filter_paper VARCHAR(100),
  grinder VARCHAR(100),
  grind_size VARCHAR(50),
  water_temp DECIMAL(5,2),
  water_quality VARCHAR(100),
  ratio VARCHAR(20),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  improvement TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_inventory_logs_bean_id ON inventory_logs(bean_id);
CREATE INDEX IF NOT EXISTS idx_tasting_records_bean_id ON tasting_records(bean_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date);
CREATE INDEX IF NOT EXISTS idx_tasting_records_date ON tasting_records(date);