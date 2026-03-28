import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 获取当前环境
function getCurrentEnvironment(): 'development' | 'production' {
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'production';
  }
  return 'development';
}

// 获取数据库连接URL
function getDatabaseUrl(): string {
  const env = getCurrentEnvironment();
  
  if (env === 'production') {
    return process.env.DATABASE_URL_PROD || process.env.DATABASE_URL || '';
  } else {
    return process.env.DATABASE_URL_DEV || process.env.DATABASE_URL || '';
  }
}

// 创建数据库连接
const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  console.error('❌ 数据库连接URL未配置');
  console.error('请检查环境变量:');
  console.error('- 开发环境: DATABASE_URL_DEV');
  console.error('- 生产环境: DATABASE_URL_PROD');
  console.error('- 通用: DATABASE_URL');
}

// 使用neon创建SQL函数
const sql = neon(databaseUrl);

// 开发环境日志
if (getCurrentEnvironment() === 'development') {
  console.log('🔧 数据库环境配置:');
  console.log('  环境:', getCurrentEnvironment());
  console.log('  数据库URL:', databaseUrl.replace(/:[^@]+@/, ':***@'));
}

export default sql;