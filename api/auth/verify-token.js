"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
// 验证token
async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '未提供认证令牌' });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // 检查用户是否存在
            const user = await (0, db_1.default) `
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
        }
        catch (jwtError) {
            return res.status(401).json({ error: '无效的认证令牌' });
        }
    }
    catch (error) {
        console.error('验证token失败:', error);
        return res.status(500).json({ error: '验证服务错误' });
    }
}
//# sourceMappingURL=verify-token.js.map