import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 简单的测试响应，不依赖任何环境变量
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
}