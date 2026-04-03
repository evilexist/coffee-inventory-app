import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './db';
import { authenticate } from './auth/middleware';
import { ApiError } from '../src/utils/error';

// 字段名映射：前端驼峰 -> 数据库下划线
function mapTastingFields(body: any) {
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
    water_quality: body.waterQuality,
    ratio: body.ratio,
    rating: body.rating,
    notes: body.notes,
    improvement: body.improvement
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await authenticate(req, res);
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
  } catch (error: any) {
    console.error('API Error:', error);

    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: error.message,
        error_code: error.code,
        details: error.details
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      error_code: 'INTERNAL_ERROR'
    });
  }
}

async function getRecords(req: VercelRequest, res: VercelResponse, userId: string) {
  const { beanId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let records;
  let countResult;
  
  if (beanId) {
    countResult = await sql`
      SELECT COUNT(*) as total FROM tasting_records tr
      WHERE tr.user_id = ${userId} AND tr.bean_id = ${beanId}
    `;
    
    records = await sql`
      SELECT tr.*, cb.name as bean_name
      FROM tasting_records tr
      JOIN coffee_beans cb ON tr.bean_id = cb.id
      WHERE tr.user_id = ${userId} AND tr.bean_id = ${beanId}
      ORDER BY tr.date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    countResult = await sql`
      SELECT COUNT(*) as total FROM tasting_records tr
      WHERE tr.user_id = ${userId}
    `;
    
    records = await sql`
      SELECT tr.*, cb.name as bean_name
      FROM tasting_records tr
      JOIN coffee_beans cb ON tr.bean_id = cb.id
      WHERE tr.user_id = ${userId}
      ORDER BY tr.date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  
  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    data: records,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  });
}

async function createRecord(req: VercelRequest, res: VercelResponse, userId: string) {
  const fields = mapTastingFields(req.body);
  fields.user_id = userId; // 设置用户ID

  // 验证必填字段
  if (!fields.bean_id || !fields.date) {
    throw new ApiError(400, 'VALIDATION_ERROR', '缺少必填字段：bean_id, date');
  }

  try {
    // 开始事务
    await sql`BEGIN`;

    // 如果有 dose（消耗量），原子扣减库存并创建出库记录
    if (fields.dose && fields.dose > 0) {
      const updateResult = await sql`
        UPDATE coffee_beans
        SET stock = stock - ${fields.dose},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${fields.bean_id}
          AND user_id = ${userId}
          AND stock >= ${fields.dose}
        RETURNING stock
      `;

      if (updateResult.length === 0) {
        await sql`ROLLBACK`;
        const bean = await sql`SELECT stock FROM coffee_beans WHERE id = ${fields.bean_id} AND user_id = ${userId}`;
        if (bean.length === 0) {
          throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
        }
        throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足', { stock: bean[0].stock });
      }

      // 创建出库记录
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await sql`
        INSERT INTO inventory_logs (
          id, user_id, bean_id, type, amount, date, note
        ) VALUES (
          ${logId}, ${userId}, ${fields.bean_id}, 'OUT',
          ${fields.dose}, ${fields.date}, '品饮消耗'
        )
      `;
    }

    // 插入品饮记录
    const result = await sql`
      INSERT INTO tasting_records (
        id, user_id, bean_id, date, dose, brew_method, dripper, filter_paper,
        grinder, grind_size, water_temp, water_quality, ratio, rating, notes, improvement
      ) VALUES (
        ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.date},
        ${fields.dose}, ${fields.brew_method}, ${fields.dripper}, ${fields.filter_paper},
        ${fields.grinder}, ${fields.grind_size}, ${fields.water_temp}, ${fields.water_quality},
        ${fields.ratio}, ${fields.rating}, ${fields.notes}, ${fields.improvement}
      ) RETURNING *
    `;

    // 提交事务
    await sql`COMMIT`;
    return res.status(201).json({ success: true, record: result[0] });

  } catch (error: any) {
    await sql`ROLLBACK`;
    console.error('创建品饮记录失败:', error);

    if (error instanceof ApiError) throw error;

    throw new ApiError(500, 'CREATE_TASTING_FAILED', '创建记录失败');
  }
}

async function updateRecord(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  const fields = mapTastingFields(req.body);

  try {
    const result = await sql`
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
        water_quality = ${fields.water_quality},
        ratio = ${fields.ratio},
        rating = ${fields.rating},
        notes = ${fields.notes},
        improvement = ${fields.improvement}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new ApiError(404, 'RECORD_NOT_FOUND', '未找到该记录或无权限修改');
    }

    return res.status(200).json(result[0]);
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('更新品饮记录失败:', error);
    throw new ApiError(500, 'UPDATE_TASTING_FAILED', '更新记录失败');
  }
}

async function deleteRecord(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  try {
    await sql`DELETE FROM tasting_records WHERE id = ${id} AND user_id = ${userId}`;
    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('删除品饮记录失败:', error);
    throw new ApiError(500, 'DELETE_TASTING_FAILED', '删除记录失败');
  }
}
