"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const middleware_1 = require("./auth/middleware");
const db_1 = __importDefault(require("./db"));
// 字段名映射：前端驼峰 -> 数据库下划线
function mapBeanFields(body) {
    return {
        id: body.id || `bean-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: '', // 由authenticate提供
        name: body.name,
        origin_country: body.originCountry,
        origin_region: body.originRegion,
        origin: body.origin,
        brand_roaster: body.brandRoaster,
        producer: body.producer,
        altitude: body.altitude,
        variety: body.variety,
        flavor_notes: body.flavorNotes,
        roast_level: body.roastLevel,
        process: body.process,
        roast_date: body.roastDate,
        reference_price: body.referencePrice,
        stock: body.stock || 0,
        description: body.description
    };
}
async function getBeans(req, res, userId) {
    const beans = await (0, db_1.default) `
    SELECT * FROM coffee_beans 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
    return res.status(200).json(beans);
}
async function createBean(req, res, userId) {
    const fields = mapBeanFields(req.body);
    fields.user_id = userId; // 设置用户ID
    // 验证必填字段
    if (!fields.name || !fields.name.trim()) {
        return res.status(400).json({ error: '咖啡豆名称不能为空' });
    }
    const result = await (0, db_1.default) `
    INSERT INTO coffee_beans (
      id, user_id, name, origin_country, origin_region, origin, brand_roaster,
      producer, altitude, variety, flavor_notes, roast_level, process,
      roast_date, reference_price, stock, description
    ) VALUES (
      ${fields.id}, ${fields.user_id}, ${fields.name}, ${fields.origin_country}, 
      ${fields.origin_region}, ${fields.origin}, ${fields.brand_roaster},
      ${fields.producer}, ${fields.altitude}, ${fields.variety}, 
      ${fields.flavor_notes}, ${fields.roast_level}, ${fields.process},
      ${fields.roast_date}, ${fields.reference_price}, ${fields.stock}, 
      ${fields.description}
    ) RETURNING *
  `;
    return res.status(201).json(result[0]);
}
async function updateBean(req, res, userId) {
    const { id } = req.query;
    const fields = mapBeanFields(req.body);
    // 验证必填字段
    if (!fields.name || !fields.name.trim()) {
        return res.status(400).json({ error: '咖啡豆名称不能为空' });
    }
    const result = await (0, db_1.default) `
    UPDATE coffee_beans SET
      name = ${fields.name},
      origin_country = ${fields.origin_country},
      origin_region = ${fields.origin_region},
      origin = ${fields.origin},
      brand_roaster = ${fields.brand_roaster},
      producer = ${fields.producer},
      altitude = ${fields.altitude},
      variety = ${fields.variety},
      flavor_notes = ${fields.flavor_notes},
      roast_level = ${fields.roast_level},
      process = ${fields.process},
      roast_date = ${fields.roast_date},
      reference_price = ${fields.reference_price},
      stock = ${fields.stock},
      description = ${fields.description},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
    if (result.length === 0) {
        return res.status(404).json({ error: '咖啡豆不存在或无权限' });
    }
    return res.status(200).json(result[0]);
}
async function deleteBean(req, res, userId) {
    const { id } = req.query;
    await (0, db_1.default) `DELETE FROM coffee_beans WHERE id = ${id} AND user_id = ${userId}`;
    return res.status(200).json({ success: true });
}
async function handler(req, res) {
    try {
        const userId = await (0, middleware_1.authenticate)(req, res);
        if (!userId)
            return; // authenticate已设置响应
        switch (req.method) {
            case 'GET':
                return await getBeans(req, res, userId);
            case 'POST':
                return await createBean(req, res, userId);
            case 'PUT':
                return await updateBean(req, res, userId);
            case 'DELETE':
                return await deleteBean(req, res, userId);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=beans.js.map