// 环境配置管理
export type Environment = 'development' | 'production';

export interface DatabaseConfig {
  url: string;
  urlUnpooled: string;
  host: string;
  hostUnpooled: string;
}

export interface EnvironmentConfig {
  database: DatabaseConfig;
  isDevelopment: boolean;
  isProduction: boolean;
  environment: Environment;
}

// 获取当前环境
export function getCurrentEnvironment(): Environment {
  // 优先检查环境变量
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // 在Vercel环境中，根据部署URL判断
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 如果是Vercel生产域名（不包含-preview）
    if (hostname.includes('vercel.app') && !hostname.includes('-preview')) {
      return 'production';
    }
  }
  
  // 默认开发环境
  return 'development';
}

// 获取数据库配置
export function getDatabaseConfig(): DatabaseConfig {
  const env = getCurrentEnvironment();
  
  if (env === 'production') {
    return {
      url: process.env.DATABASE_URL_PROD || process.env.DATABASE_URL || '',
      urlUnpooled: process.env.DATABASE_URL_UNPOOLED_PROD || process.env.DATABASE_URL_UNPOOLED || '',
      host: process.env.PGHOST_PROD || process.env.PGHOST || '',
      hostUnpooled: process.env.PGHOST_UNPOOLED_PROD || process.env.PGHOST_UNPOOLED || ''
    };
  } else {
    return {
      url: process.env.DATABASE_URL_DEV || process.env.DATABASE_URL || '',
      urlUnpooled: process.env.DATABASE_URL_UNPOOLED_DEV || process.env.DATABASE_URL_UNPOOLED || '',
      host: process.env.PGHOST_DEV || process.env.PGHOST || '',
      hostUnpooled: process.env.PGHOST_UNPOOLED_DEV || process.env.PGHOST_UNPOOLED || ''
    };
  }
}

// 获取完整环境配置
export function getEnvironmentConfig(): EnvironmentConfig {
  const environment = getCurrentEnvironment();
  const database = getDatabaseConfig();
  
  return {
    database,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    environment
  };
}

// 环境配置单例
let envConfig: EnvironmentConfig | null = null;

export function useEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    envConfig = getEnvironmentConfig();
  }
  return envConfig;
}

// 重置环境配置（用于测试）
export function resetEnvironmentConfig(): void {
  envConfig = null;
}