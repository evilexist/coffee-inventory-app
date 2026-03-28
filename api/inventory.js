"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const db_1 = __importDefault(require("./db"));
const middleware_1 = require("./auth/middleware");
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
async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    const userId = await (0, middleware_1.authenticate)(req, res);
    if (!userId) {
        return;
    }
    try {
        switch (req.method) {
            case 'GET':
                return await getLogs(req, res, userId);
            case 'POST':
                return await createLog(req, res, userId);
            case 'DELETE':
                return await deleteLog(req, res, userId);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getLogs(req, res, userId) {
    const { beanId } = req.query;
    let logs;
    if (beanId) {
        logs = await (0, db_1.default) `
      SELECT * FROM inventory_logs
      WHERE user_id = ${userId} AND bean_id = ${beanId}
      ORDER BY date DESC, created_at DESC
    `;
    }
    else {
        logs = await (0, db_1.default) `
      SELECT * FROM inventory_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC, created_at DESC
    `;
    }
    return res.status(200).json(logs);
}
async function createLog(req, res, userId) {
    const fields = mapInventoryFields(req.body);
    fields.user_id = userId; // 设置用户ID
    // 验证必填字段
    if (!fields.bean_id || !fields.type || !fields.amount || !fields.date) {
        return res.status(400).json({ error: '缺少必填字段：bean_id, type, amount, date' });
    }
    const result = await (0, db_1.default) `
    INSERT INTO inventory_logs (
      id, user_id, bean_id, type, amount, date, roast_date, note
    ) VALUES (
      ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.type},
      ${fields.amount}, ${fields.date}, ${fields.roast_date}, ${fields.note}
    ) RETURNING *
  `;
    return res.status(201).json(result[0]);
}
async function deleteLog(req, res, userId) {
    const { id } = req.query;
    await (0, db_1.default) `DELETE FROM inventory_logs WHERE id = ${id} AND user_id = ${userId}`;
    return res.status(200).json({ success: true });
}
//# sourceMappingURL=inventory.js.map