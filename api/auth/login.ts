import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../db';
import { initializeUsers } from '../db/init';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 环境变量未设置，请在 Vercel 控制台中配置');
}

const JWT_EXPIRES_IN = '7d';

// 用户接口
interface User {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  is_active: boolean;
}

// 登录处理
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 初始化用户表
    await initializeUsers();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const users = await sql`
      SELECT id, username, password_hash, display_name, is_active
      FROM users WHERE username = ${username}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ error: '用户账户已禁用' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await sql`
      UPDATE users SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    // 生成JWT token
    if (!JWT_SECRET) {
      return res.status(500).json({ error: '服务器配置错误：JWT密钥未设置' });
    }

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

  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({ error: '登录服务错误' });
  }
}
