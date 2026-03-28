import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sql from '../db';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET_SAFE = JWT_SECRET; // 类型收缩：确保非空

// 初始化数据库表结构
async function initializeDatabase() {
  try {
    // 创建用户表
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `;

    // 创建咖啡豆表
    await sql`
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
      )
    `;

    // 创建出入库记录表
    await sql`
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
      )
    `;

    // 创建品饮记录表
    await sql`
      CREATE TABLE IF NOT EXISTS tasting_records (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        bean_id VARCHAR(36) NOT NULL,
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bean_id) REFERENCES coffee_beans(id) ON DELETE CASCADE
      )
    `;

    // 创建索引
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_logs_bean_id ON inventory_logs(bean_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasting_records_bean_id ON tasting_records(bean_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasting_records_date ON tasting_records(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_id ON coffee_beans(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON inventory_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tasting_records_user_id ON tasting_records(user_id)`;

    console.log('✅ 数据库表结构初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 从环境变量获取用户配置
function getUsersFromEnv(): Array<{ username: string; password: string; display_name: string }> {
  const usersEnv = process.env.USERS_CONFIG || '';
  if (!usersEnv) {
    return [];
  }

  try {
    // 格式: "user1:pass1:Display1;user2:pass2:Display2"
    return usersEnv.split(';').map(userStr => {
      const [username, password, display_name] = userStr.split(':');
      return {
        username: username || '',
        password: password || '',
        display_name: display_name || username || ''
      };
    }).filter(user => user.username && user.password);
  } catch (error) {
    console.error('解析用户配置失败:', error);
    return [];
  };
}

// 初始化用户表
async function initializeUsers() {
  try {
    // 初始化数据库表结构
    await initializeDatabase();

    // 从环境变量初始化用户
    const envUsers = getUsersFromEnv();
    for (const envUser of envUsers) {
      // 检查用户是否已存在
      const existingUser = await sql`
        SELECT id FROM users WHERE username = ${envUser.username}
      `;

      if (existingUser.length === 0) {
        // 创建新用户
        const passwordHash = await bcrypt.hash(envUser.password, 10);
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await sql`
          INSERT INTO users (id, username, password_hash, display_name)
          VALUES (${userId}, ${envUser.username}, ${passwordHash}, ${envUser.display_name})
        `;

        console.log(`✅ 初始化用户: ${envUser.username}`);
      }
    }

  } catch (error) {
    console.error('初始化用户表失败:', error);
  }
}

// 认证中间件
export async function authenticate(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未提供认证令牌' });
      return null;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET_SAFE) as { userId: string; username: string };

      // 检查用户是否存在且激活
      const user = await sql`
        SELECT id, username, is_active FROM users
        WHERE id = ${decoded.userId} AND username = ${decoded.username}
      `;

      if (user.length === 0 || !user[0].is_active) {
        res.status(401).json({ error: '用户不存在或已禁用' });
        return null;
      }

      return user[0].id;
    } catch (jwtError) {
      res.status(401).json({ error: '无效的认证令牌' });
      return null;
    }
  } catch (error) {
    console.error('认证失败:', error);
    res.status(500).json({ error: '认证服务错误' });
    return null;
  }
}

