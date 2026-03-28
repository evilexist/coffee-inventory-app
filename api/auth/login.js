"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = '7d';
// 从环境变量获取用户配置
function getUsersFromEnv() {
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
    }
    catch (error) {
        console.error('解析用户配置失败:', error);
        return [];
    }
}
// 初始化用户表
async function initializeUsers() {
    try {
        // 检查用户表是否存在
        const tableExists = await (0, db_1.default) `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `;
        if (!tableExists[0].exists) {
            console.log('创建用户表...');
            await (0, db_1.default) `
        CREATE TABLE users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          display_name VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        )
      `;
        }
        // 从环境变量初始化用户
        const envUsers = getUsersFromEnv();
        for (const envUser of envUsers) {
            // 检查用户是否已存在
            const existingUser = await (0, db_1.default) `
        SELECT id FROM users WHERE username = ${envUser.username}
      `;
            if (existingUser.length === 0) {
                // 创建新用户
                const passwordHash = await bcryptjs_1.default.hash(envUser.password, 10);
                const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await (0, db_1.default) `
          INSERT INTO users (id, username, password_hash, display_name)
          VALUES (${userId}, ${envUser.username}, ${passwordHash}, ${envUser.display_name})
        `;
                console.log(`✅ 初始化用户: ${envUser.username}`);
            }
        }
    }
    catch (error) {
        console.error('初始化用户表失败:', error);
    }
}
// 登录处理
async function handler(req, res) {
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
        const users = await (0, db_1.default) `
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
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        // 更新最后登录时间
        await (0, db_1.default) `
      UPDATE users SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;
        // 生成JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    catch (error) {
        console.error('登录失败:', error);
        return res.status(500).json({ error: '登录服务错误' });
    }
}
//# sourceMappingURL=login.js.map