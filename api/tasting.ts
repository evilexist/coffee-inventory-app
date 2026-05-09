import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './db';
import { authenticate } from './auth/middleware';
import { ApiError } from '../src/utils/error';
import { ensureBusinessSchemaReady } from './db/init';

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

function parsePositiveDose(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'dose必须是大于0的数字');
  }
  return value;
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
    await ensureBusinessSchemaReady();

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
      SELECT
        tr.*,
        CASE
          WHEN cb.deleted_at IS NOT NULL THEN cb.name || '（已删除）'
          ELSE cb.name
        END AS bean_name
      FROM tasting_records tr
      LEFT JOIN coffee_beans cb
        ON tr.bean_id = cb.id AND tr.user_id = cb.user_id
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
      SELECT
        tr.*,
        CASE
          WHEN cb.deleted_at IS NOT NULL THEN cb.name || '（已删除）'
          ELSE cb.name
        END AS bean_name
      FROM tasting_records tr
      LEFT JOIN coffee_beans cb
        ON tr.bean_id = cb.id AND tr.user_id = cb.user_id
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
    const hasDose = fields.dose !== null && fields.dose !== undefined && fields.dose !== '';

    if (hasDose) {
      fields.dose = parsePositiveDose(fields.dose);
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 单条 SQL 同时完成扣库存、写出库日志、写品饮记录，避免部分成功。
      const result = await sql`
        WITH bean_lookup AS (
          SELECT id, stock, deleted_at
          FROM coffee_beans
          WHERE id = ${fields.bean_id} AND user_id = ${userId}
        ),
        updated AS (
          UPDATE coffee_beans
          SET stock = stock - ${fields.dose},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${fields.bean_id}
            AND user_id = ${userId}
            AND deleted_at IS NULL
            AND stock >= ${fields.dose}
          RETURNING id
        ),
        inserted_log AS (
          INSERT INTO inventory_logs (
            id, user_id, bean_id, type, amount, date, note
          )
          SELECT
            ${logId}, ${userId}, ${fields.bean_id}, 'OUT',
            ${fields.dose}, ${fields.date}, '品饮消耗'
          FROM updated
          RETURNING id
        ),
        inserted_record AS (
          INSERT INTO tasting_records (
            id, user_id, bean_id, date, dose, brew_method, dripper, filter_paper,
            grinder, grind_size, water_temp, water_quality, ratio, rating, notes, improvement
          )
          SELECT
            ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.date},
            ${fields.dose}, ${fields.brew_method}, ${fields.dripper}, ${fields.filter_paper},
            ${fields.grinder}, ${fields.grind_size}, ${fields.water_temp}, ${fields.water_quality},
            ${fields.ratio}, ${fields.rating}, ${fields.notes}, ${fields.improvement}
          FROM updated
          RETURNING *
        ),
        status AS (
          SELECT
            EXISTS(SELECT 1 FROM bean_lookup) AS bean_exists,
            EXISTS(SELECT 1 FROM bean_lookup WHERE deleted_at IS NOT NULL) AS bean_deleted,
            EXISTS(SELECT 1 FROM updated) AS stock_updated,
            (SELECT stock FROM bean_lookup LIMIT 1) AS current_stock
        )
        SELECT
          status.bean_exists,
          status.bean_deleted,
          status.stock_updated,
          status.current_stock,
          inserted_record.id,
          inserted_record.user_id,
          inserted_record.bean_id,
          inserted_record.date,
          inserted_record.dose,
          inserted_record.brew_method,
          inserted_record.dripper,
          inserted_record.filter_paper,
          inserted_record.grinder,
          inserted_record.grind_size,
          inserted_record.water_temp,
          inserted_record.water_quality,
          inserted_record.ratio,
          inserted_record.rating,
          inserted_record.notes,
          inserted_record.improvement,
          inserted_record.created_at
        FROM status
        LEFT JOIN inserted_record ON TRUE
      `;

      const row = result[0];
      if (!row.bean_exists) {
        throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
      }

      if (row.bean_deleted) {
        throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续品饮');
      }

      if (!row.stock_updated) {
        throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足', { stock: row.current_stock });
      }

      return res.status(201).json({
        success: true,
        record: {
          id: row.id,
          user_id: row.user_id,
          bean_id: row.bean_id,
          date: row.date,
          dose: row.dose,
          brew_method: row.brew_method,
          dripper: row.dripper,
          filter_paper: row.filter_paper,
          grinder: row.grinder,
          grind_size: row.grind_size,
          water_temp: row.water_temp,
          water_quality: row.water_quality,
          ratio: row.ratio,
          rating: row.rating,
          notes: row.notes,
          improvement: row.improvement,
          created_at: row.created_at
        }
      });
    }

    const result = await sql`
      INSERT INTO tasting_records (
        id, user_id, bean_id, date, dose, brew_method, dripper, filter_paper,
        grinder, grind_size, water_temp, water_quality, ratio, rating, notes, improvement
      )
      SELECT
        ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.date},
        ${fields.dose}, ${fields.brew_method}, ${fields.dripper}, ${fields.filter_paper},
        ${fields.grinder}, ${fields.grind_size}, ${fields.water_temp}, ${fields.water_quality},
        ${fields.ratio}, ${fields.rating}, ${fields.notes}, ${fields.improvement}
      FROM coffee_beans
      WHERE id = ${fields.bean_id}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      RETURNING *
    `;

    if (result.length === 0) {
      const bean = await sql`
        SELECT deleted_at
        FROM coffee_beans
        WHERE id = ${fields.bean_id} AND user_id = ${userId}
      `;
      if (bean.length === 0) {
        throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
      }
      throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续品饮');
    }

    return res.status(201).json({ success: true, record: result[0] });

  } catch (error: any) {
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
