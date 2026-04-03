import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import sql from '../db';
import { initializeUsers } from '../db/init';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 环境变量未设置，请在 Vercel 控制台中配置');
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

    if (!JWT_SECRET) {
      res.status(500).json({ error: '服务器配置错误：JWT密钥未设置' });
      return null;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

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

