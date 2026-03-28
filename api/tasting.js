"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const db_1 = __importDefault(require("./db"));
const middleware_1 = require("./auth/middleware");
// 字段名映射：前端驼峰 -> 数据库下划线
function mapTastingFields(body) {
    return {
        id: body.id || `tasting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: '', // 由authenticate提供
        bean_id: body.beanId,
        date: body.date,
        dose: body.dose,
        brew_method: body.brewMethod,
        dripper: body.dripper,
        filter_paper: body.filterPaper,
        grinder: body.grinder,
        grind_size: body.grindSize,
        water_temp: body.waterTemp,
        ratio: body.ratio,
        rating: body.rating,
        notes: body.notes,
        improvement: body.improvement
    };
}
async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
                return await getRecords(req, res, userId);
            case 'POST':
                return await createRecord(req, res, userId);
            case 'PUT':
                return await updateRecord(req, res, userId);
            case 'DELETE':
                return await deleteRecord(req, res, userId);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function getRecords(req, res, userId) {
    const { beanId } = req.query;
    let records;
    if (beanId) {
        records = await (0, db_1.default) `
      SELECT tr.*, cb.name as bean_name
      FROM tasting_records tr
      JOIN coffee_beans cb ON tr.bean_id = cb.id
      WHERE tr.user_id = ${userId} AND tr.bean_id = ${beanId}
      ORDER BY tr.date DESC
    `;
    }
    else {
        records = await (0, db_1.default) `
      SELECT tr.*, cb.name as bean_name
      FROM tasting_records tr
      JOIN coffee_beans cb ON tr.bean_id = cb.id
      WHERE tr.user_id = ${userId}
      ORDER BY tr.date DESC
    `;
    }
    return res.status(200).json(records);
}
async function createRecord(req, res, userId) {
    const fields = mapTastingFields(req.body);
    fields.user_id = userId; // 设置用户ID
    // 验证必填字段
    if (!fields.bean_id || !fields.date) {
        return res.status(400).json({ error: '缺少必填字段：bean_id, date' });
    }
    const result = await (0, db_1.default) `
    INSERT INTO tasting_records (
      id, user_id, bean_id, date, dose, brew_method, dripper, filter_paper,
      grinder, grind_size, water_temp, ratio, rating, notes, improvement
    ) VALUES (
      ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.date},
      ${fields.dose}, ${fields.brew_method}, ${fields.dripper}, ${fields.filter_paper},
      ${fields.grinder}, ${fields.grind_size}, ${fields.water_temp}, ${fields.ratio},
      ${fields.rating}, ${fields.notes}, ${fields.improvement}
    ) RETURNING *
  `;
    return res.status(201).json(result[0]);
}
async function updateRecord(req, res, userId) {
    const { id } = req.query;
    const fields = mapTastingFields(req.body);
    const result = await (0, db_1.default) `
    UPDATE tasting_records SET
      bean_id = ${fields.bean_id},
      date = ${fields.date},
      dose = ${fields.dose},
      brew_method = ${fields.brew_method},
      dripper = ${fields.dripper},
      filter_paper = ${fields.filter_paper},
      grinder = ${fields.grinder},
      grind_size = ${fields.grind_size},
      water_temp = ${fields.water_temp},
      ratio = ${fields.ratio},
      rating = ${fields.rating},
      notes = ${fields.notes},
      improvement = ${fields.improvement}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
    if (result.length === 0) {
        return res.status(404).json({ error: '未找到该记录或无权限修改' });
    }
    return res.status(200).json(result[0]);
}
async function deleteRecord(req, res, userId) {
    const { id } = req.query;
    await (0, db_1.default) `DELETE FROM tasting_records WHERE id = ${id} AND user_id = ${userId}`;
    return res.status(200).json({ success: true });
}
//# sourceMappingURL=tasting.js.map