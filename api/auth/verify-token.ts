import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import sql from '../db';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 环境变量未设置，请在 Vercel 控制台中配置');
}

// 验证token
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);

  if (!JWT_SECRET) {
    return res.status(500).json({ error: '服务器配置错误：JWT密钥未设置' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

      // 检查用户是否存在
      const user = await sql`
        SELECT id, username, display_name, is_active
        FROM users WHERE id = ${decoded.userId} AND username = ${decoded.username}
      `;

      if (user.length === 0 || !user[0].is_active) {
        return res.status(401).json({ error: '用户不存在或已禁用' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user[0].id,
          username: user[0].username,
          display_name: user[0].display_name
        }
      });
    } catch (jwtError) {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
  } catch (error) {
    console.error('验证token失败:', error);
    return res.status(500).json({ error: '验证服务错误' });
  }
}
