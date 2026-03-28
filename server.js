const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_DEV || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = '7d';

// ==================== 数据库初始化 ====================

async function initializeDatabase() {
  try {
    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // 创建咖啡豆表
    await pool.query(`
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
    `);

    // 创建出入库记录表
    await pool.query(`
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
    `);

    // 创建品饮记录表
    await pool.query(`
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
    `);

    // 创建索引
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_logs_bean_id ON inventory_logs(bean_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasting_records_bean_id ON tasting_records(bean_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON inventory_logs(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasting_records_date ON tasting_records(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coffee_beans_user_id ON coffee_beans(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON inventory_logs(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasting_records_user_id ON tasting_records(user_id)`);

    console.log('✅ 数据库表结构初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// ==================== 用户管理 ====================

function getUsersFromEnv() {
  const usersEnv = process.env.USERS_CONFIG || '';
  if (!usersEnv) return [];

  try {
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
  }
}

async function initializeUsers() {
  try {
    await initializeDatabase();

    const envUsers = getUsersFromEnv();
    for (const envUser of envUsers) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [envUser.username]
      );

      if (existingUser.rows.length === 0) {
        const passwordHash = await bcrypt.hash(envUser.password, 10);
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await pool.query(
          'INSERT INTO users (id, username, password_hash, display_name) VALUES ($1, $2, $3, $4)',
          [userId, envUser.username, passwordHash, envUser.display_name]
        );

        console.log(`✅ 初始化用户: ${envUser.username}`);
      }
    }
  } catch (error) {
    console.error('初始化用户表失败:', error);
  }
}

// ==================== 认证中间件 ====================

async function authenticate(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '未提供认证令牌' });
      return null;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // 检查用户是否存在且激活
      const user = await pool.query(
        'SELECT id, username, is_active FROM users WHERE id = $1 AND username = $2',
        [decoded.userId, decoded.username]
      );

      if (user.rows.length === 0 || !user.rows[0].is_active) {
        res.status(401).json({ error: '用户不存在或已禁用' });
        return null;
      }

      return user.rows[0].id;
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

// ==================== 认证 API ====================

// 登录API (Vercel Serverless Functions 使用 /api/auth/login)
app.post('/api/login', async (req, res) => {
  try {
    return await performLogin(req, res);
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ error: '登录服务错误' });
  }
});

// 登录API (带 /auth 前缀，用于本地开发)
app.post('/api/auth/login', async (req, res) => {
  try {
    return await performLogin(req, res);
  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ error: '登录服务错误' });
  }
});

async function performLogin(req, res) {
  // 初始化用户表
  await initializeUsers();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  // 查找用户
  const users = await pool.query(
    'SELECT id, username, password_hash, display_name, is_active FROM users WHERE username = $1',
    [username]
  );

  if (users.rows.length === 0) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const user = users.rows[0];

  if (!user.is_active) {
    return res.status(401).json({ error: '用户账户已禁用' });
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // 更新最后登录时间
  await pool.query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // 生成JWT token
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name
    }
  });
}

// 验证token API
app.get('/api/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // 检查用户是否存在
      const users = await pool.query(
        'SELECT id, username, display_name, is_active FROM users WHERE id = $1 AND username = $2',
        [decoded.userId, decoded.username]
      );

      if (users.rows.length === 0 || !users.rows[0].is_active) {
        return res.status(401).json({ error: '用户不存在或已禁用' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: users.rows[0].id,
          username: users.rows[0].username,
          display_name: users.rows[0].display_name
        }
      });
    } catch (jwtError) {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
  } catch (error) {
    console.error('验证token失败:', error);
    return res.status(500).json({ error: '验证服务错误' });
  }
});

// ==================== 咖啡豆 API ====================

// 字段名映射：前端驼峰 -> 数据库下划线
function mapBeanFields(body) {
  return {
    id: body.id || `bean-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: '', // 由authenticate提供
    name: body.name,
    origin_country: body.originCountry,
    origin_region: body.originRegion,
    origin: body.origin,
    brand_roaster: body.brandRoaster,
    producer: body.producer,
    altitude: body.altitude,
    variety: body.variety,
    flavor_notes: body.flavorNotes,
    roast_level: body.roastLevel,
    process: body.process,
    roast_date: body.roastDate,
    reference_price: body.referencePrice,
    stock: body.stock || 0,
    description: body.description
  };
}

app.get('/api/beans', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const beans = await pool.query(
      'SELECT * FROM coffee_beans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.status(200).json(beans.rows);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/beans', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const fields = mapBeanFields(req.body);
    fields.user_id = userId;

    // 验证必填字段
    if (!fields.name || !fields.name.trim()) {
      return res.status(400).json({ error: '咖啡豆名称不能为空' });
    }

    const result = await pool.query(`
      INSERT INTO coffee_beans (
        id, user_id, name, origin_country, origin_region, origin, brand_roaster,
        producer, altitude, variety, flavor_notes, roast_level, process,
        roast_date, reference_price, stock, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      fields.id, fields.user_id, fields.name, fields.origin_country,
      fields.origin_region, fields.origin, fields.brand_roaster,
      fields.producer, fields.altitude, fields.variety,
      fields.flavor_notes, fields.roast_level, fields.process,
      fields.roast_date, fields.reference_price, fields.stock,
      fields.description
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/beans', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { id } = req.query;
    const fields = mapBeanFields(req.body);

    // 验证必填字段
    if (!fields.name || !fields.name.trim()) {
      return res.status(400).json({ error: '咖啡豆名称不能为空' });
    }

    const result = await pool.query(`
      UPDATE coffee_beans SET
        name = $1,
        origin_country = $2,
        origin_region = $3,
        origin = $4,
        brand_roaster = $5,
        producer = $6,
        altitude = $7,
        variety = $8,
        flavor_notes = $9,
        roast_level = $10,
        process = $11,
        roast_date = $12,
        reference_price = $13,
        stock = $14,
        description = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND user_id = $17
      RETURNING *
    `, [
      fields.name, fields.origin_country, fields.origin_region, fields.origin,
      fields.brand_roaster, fields.producer, fields.altitude, fields.variety,
      fields.flavor_notes, fields.roast_level, fields.process, fields.roast_date,
      fields.reference_price, fields.stock, fields.description, id, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '咖啡豆不存在或无权限' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/beans', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { id } = req.query;
    await pool.query(
      'DELETE FROM coffee_beans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 出入库记录 API ====================

// 字段名映射：前端驼峰 -> 数据库下划线
function mapInventoryFields(body) {
  return {
    id: body.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: '', // 由authenticate提供
    bean_id: body.beanId,
    type: body.type,
    amount: body.amount,
    date: body.date,
    roast_date: body.roastDate,
    note: body.note
  };
}

app.get('/api/inventory', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { beanId } = req.query;

    let logs;
    if (beanId) {
      logs = await pool.query(
        `SELECT * FROM inventory_logs 
         WHERE user_id = $1 AND bean_id = $2
         ORDER BY date DESC, created_at DESC`,
        [userId, beanId]
      );
    } else {
      logs = await pool.query(
        `SELECT * FROM inventory_logs 
         WHERE user_id = $1
         ORDER BY date DESC, created_at DESC`,
        [userId]
      );
    }

    return res.status(200).json(logs.rows);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const fields = mapInventoryFields(req.body);
    fields.user_id = userId;

    // 验证必填字段
    if (!fields.bean_id || !fields.type || !fields.amount || !fields.date) {
      return res.status(400).json({ error: '缺少必填字段：bean_id, type, amount, date' });
    }

    const result = await pool.query(`
      INSERT INTO inventory_logs (
        id, user_id, bean_id, type, amount, date, roast_date, note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      fields.id, fields.user_id, fields.bean_id, fields.type,
      fields.amount, fields.date, fields.roast_date, fields.note
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/inventory', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { id } = req.query;
    await pool.query(
      'DELETE FROM inventory_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 品饮记录 API ====================

// 字段名映射：前端驼峰 -> 数据库下划线
function mapTastingFields(body) {
  return {
    id: body.id || `tasting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: '', // 由authenticate提供
    bean_id: body.beanId,
    date: body.date,
    dose: body.dose,
    brew_method: body.brewMethod,
    dripper: body.dripper,
    filter_paper: body.filterPaper,
    grinder: body.grinder,
    grind_size: body.grindSize,
    water_temp: body.waterTemp,
    ratio: body.ratio,
    rating: body.rating,
    notes: body.notes,
    improvement: body.improvement
  };
}

app.get('/api/tasting', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { beanId } = req.query;

    let records;
    if (beanId) {
      records = await pool.query(`
        SELECT tr.*, cb.name as bean_name
        FROM tasting_records tr
        JOIN coffee_beans cb ON tr.bean_id = cb.id
        WHERE tr.user_id = $1 AND tr.bean_id = $2
        ORDER BY tr.date DESC
      `, [userId, beanId]);
    } else {
      records = await pool.query(`
        SELECT tr.*, cb.name as bean_name
        FROM tasting_records tr
        JOIN coffee_beans cb ON tr.bean_id = cb.id
        WHERE tr.user_id = $1
        ORDER BY tr.date DESC
      `, [userId]);
    }

    return res.status(200).json(records.rows);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasting', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const fields = mapTastingFields(req.body);
    fields.user_id = userId;

    // 验证必填字段
    if (!fields.bean_id || !fields.date) {
      return res.status(400).json({ error: '缺少必填字段：bean_id, date' });
    }

    const result = await pool.query(`
      INSERT INTO tasting_records (
        id, user_id, bean_id, date, dose, brew_method, dripper, filter_paper,
        grinder, grind_size, water_temp, ratio, rating, notes, improvement
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      fields.id, fields.user_id, fields.bean_id, fields.date,
      fields.dose, fields.brew_method, fields.dripper, fields.filter_paper,
      fields.grinder, fields.grind_size, fields.water_temp, fields.ratio,
      fields.rating, fields.notes, fields.improvement
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tasting', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { id } = req.query;
    const fields = mapTastingFields(req.body);

    const result = await pool.query(`
      UPDATE tasting_records SET
        bean_id = $1,
        date = $2,
        dose = $3,
        brew_method = $4,
        dripper = $5,
        filter_paper = $6,
        grinder = $7,
        grind_size = $8,
        water_temp = $9,
        ratio = $10,
        rating = $11,
        notes = $12,
        improvement = $13
      WHERE id = $14 AND user_id = $15
      RETURNING *
    `, [
      fields.bean_id, fields.date, fields.dose, fields.brew_method,
      fields.dripper, fields.filter_paper, fields.grinder, fields.grind_size,
      fields.water_temp, fields.ratio, fields.rating, fields.notes,
      fields.improvement, id, userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '未找到该记录或无权限修改' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tasting', async (req, res) => {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return;

    const { id } = req.query;
    await pool.query(
      'DELETE FROM tasting_records WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 测试端点 ====================

app.get('/api/ping', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/simple-test', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    message: 'API测试成功 - 简化版本',
    method: req.method,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    hasDatabase: !!process.env.DATABASE_URL,
    hasUsersConfig: !!process.env.USERS_CONFIG,
    hasJwtSecret: !!process.env.JWT_SECRET,
    url: req.url,
    query: req.query
  });
});

app.get('/api/test', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    message: 'API测试成功',
    method: req.method,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== 启动服务器 ====================

app.listen(PORT, async () => {
  console.log(`🚀 API服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 登录API: http://localhost:${PORT}/api/login`);
  console.log(`🔍 验证API: http://localhost:${PORT}/api/verify`);
  console.log(`📦 咖啡豆API: http://localhost:${PORT}/api/beans`);
  console.log(`📊 出入库API: http://localhost:${PORT}/api/inventory`);
  console.log(`☕ 品饮记录API: http://localhost:${PORT}/api/tasting`);

  // 初始化用户表
  await initializeUsers();
});
