const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function getCurrentEnvironment() {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.VERCEL_ENV === 'production') return 'production';
  return 'development';
}

function getDatabaseUrl() {
  const env = getCurrentEnvironment();
  if (env === 'production') {
    return process.env.DATABASE_URL_PROD || process.env.DATABASE_URL || '';
  }
  return process.env.DATABASE_URL_DEV || process.env.DATABASE_URL || '';
}

function getUsersFromEnv() {
  const usersEnv = process.env.USERS_CONFIG || '';
  if (!usersEnv) return [];

  return usersEnv
    .split(';')
    .map((userStr) => {
      const [username, password, display_name] = userStr.split(':');
      return {
        username: username || '',
        password: password || '',
        display_name: display_name || username || ''
      };
    })
    .filter((user) => user.username && user.password);
}

async function ensureUsersTableReady(pool) {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users'`
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  const requiredColumns = ['id', 'username', 'password_hash', 'display_name', 'is_active', 'created_at', 'last_login'];
  const missingColumns = requiredColumns.filter((column) => !columns.has(column));

  if (missingColumns.length > 0) {
    throw new Error(
      `users 表结构不完整，请先执行 db/migrations/007_reconcile_current_schema.sql。缺失项: ${missingColumns.join(', ')}`
    );
  }
}

async function seedUsers() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('数据库连接未配置，请检查 DATABASE_URL_DEV / DATABASE_URL_PROD / DATABASE_URL');
  }

  const envUsers = getUsersFromEnv();
  if (envUsers.length === 0) {
    console.log('ℹ️ USERS_CONFIG 为空，未执行任何用户初始化');
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await ensureUsersTableReady(pool);

    let createdCount = 0;
    let skippedCount = 0;

    for (const envUser of envUsers) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [envUser.username]
      );

      if (existingUser.rows.length > 0) {
        skippedCount += 1;
        console.log(`↷ 已存在，跳过用户: ${envUser.username}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(envUser.password, 10);
      const userId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO users (id, username, password_hash, display_name)
         VALUES ($1, $2, $3, $4)`,
        [userId, envUser.username, passwordHash, envUser.display_name]
      );

      createdCount += 1;
      console.log(`✅ 已创建用户: ${envUser.username}`);
    }

    console.log(`🎯 用户初始化完成，新增 ${createdCount} 个，跳过 ${skippedCount} 个`);
  } finally {
    await pool.end();
  }
}

seedUsers().catch((error) => {
  console.error('❌ 用户初始化失败:', error);
  process.exit(1);
});
