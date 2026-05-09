import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './db';
import { authenticate } from './auth/middleware';
import { ApiError } from '../src/utils/error';
import { ensureBusinessSchemaReady } from './db/init';

// 字段名映射：前端驼峰 -> 数据库下划线
function mapInventoryFields(body: any) {
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

function parsePositiveAmount(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${fieldName}必须是大于0的数字`);
  }
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        return await getLogs(req, res, userId);
      case 'POST':
        return await createLog(req, res, userId);
      case 'DELETE':
        return await deleteLog(req, res, userId);
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

async function getLogs(req: VercelRequest, res: VercelResponse, userId: string) {
  const { beanId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  let logs;
  let countResult;
  
  if (beanId) {
    countResult = await sql`
      SELECT COUNT(*) as total FROM inventory_logs
      WHERE user_id = ${userId} AND bean_id = ${beanId}
    `;
    
    logs = await sql`
      SELECT
        il.*,
        CASE
          WHEN cb.deleted_at IS NOT NULL THEN cb.name || '（已删除）'
          ELSE cb.name
        END AS bean_name
      FROM inventory_logs il
      LEFT JOIN coffee_beans cb
        ON il.bean_id = cb.id AND il.user_id = cb.user_id
      WHERE il.user_id = ${userId} AND il.bean_id = ${beanId}
      ORDER BY il.date DESC, il.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    countResult = await sql`
      SELECT COUNT(*) as total FROM inventory_logs
      WHERE user_id = ${userId}
    `;
    
    logs = await sql`
      SELECT
        il.*,
        CASE
          WHEN cb.deleted_at IS NOT NULL THEN cb.name || '（已删除）'
          ELSE cb.name
        END AS bean_name
      FROM inventory_logs il
      LEFT JOIN coffee_beans cb
        ON il.bean_id = cb.id AND il.user_id = cb.user_id
      WHERE il.user_id = ${userId}
      ORDER BY il.date DESC, il.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  
  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  });
}

async function createLog(req: VercelRequest, res: VercelResponse, userId: string) {
  const fields = mapInventoryFields(req.body);
  fields.user_id = userId; // 设置用户ID

  // 验证必填字段
  if (!fields.bean_id || !fields.type || !fields.amount || !fields.date) {
    throw new ApiError(400, 'VALIDATION_ERROR', '缺少必填字段：bean_id, type, amount, date');
  }

  if (fields.type !== 'IN' && fields.type !== 'OUT') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'type 仅支持 IN 或 OUT');
  }

  fields.amount = parsePositiveAmount(fields.amount, 'amount');

  try {
    if (fields.type === 'OUT') {
      // 单条 SQL 同时完成扣库存和写日志，避免伪事务导致部分成功。
      const result = await sql`
        WITH bean_lookup AS (
          SELECT id, stock, deleted_at
          FROM coffee_beans
          WHERE id = ${fields.bean_id} AND user_id = ${userId}
        ),
        updated AS (
          UPDATE coffee_beans
          SET stock = stock - ${fields.amount},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${fields.bean_id}
            AND user_id = ${userId}
            AND deleted_at IS NULL
            AND stock >= ${fields.amount}
          RETURNING id
        ),
        inserted_log AS (
          INSERT INTO inventory_logs (
            id, user_id, bean_id, type, amount, date, roast_date, note
          )
          SELECT
            ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.type},
            ${fields.amount}, ${fields.date}, ${fields.roast_date}, ${fields.note}
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
          inserted_log.id,
          inserted_log.user_id,
          inserted_log.bean_id,
          inserted_log.type,
          inserted_log.amount,
          inserted_log.date,
          inserted_log.roast_date,
          inserted_log.note,
          inserted_log.created_at
        FROM status
        LEFT JOIN inserted_log ON TRUE
      `;

      const row = result[0];
      if (!row.bean_exists) {
        throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
      }

      if (row.bean_deleted) {
        throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续出入库');
      }

      if (!row.stock_updated) {
        throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足', { stock: row.current_stock });
      }

      return res.status(201).json({
        id: row.id,
        user_id: row.user_id,
        bean_id: row.bean_id,
        type: row.type,
        amount: row.amount,
        date: row.date,
        roast_date: row.roast_date,
        note: row.note,
        created_at: row.created_at
      });
    }

    // 单条 SQL 同时完成加库存、更新批次烘焙日期和写日志。
    const result = await sql`
      WITH bean_lookup AS (
        SELECT id, deleted_at
        FROM coffee_beans
        WHERE id = ${fields.bean_id} AND user_id = ${userId}
      ),
      updated AS (
        UPDATE coffee_beans
        SET stock = stock + ${fields.amount},
            roast_date = COALESCE(${fields.roast_date}, roast_date),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${fields.bean_id}
          AND user_id = ${userId}
          AND deleted_at IS NULL
        RETURNING id
      ),
      inserted_log AS (
        INSERT INTO inventory_logs (
          id, user_id, bean_id, type, amount, date, roast_date, note
        )
        SELECT
          ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.type},
          ${fields.amount}, ${fields.date}, ${fields.roast_date}, ${fields.note}
        FROM updated
        RETURNING *
      ),
      status AS (
        SELECT
          EXISTS(SELECT 1 FROM bean_lookup) AS bean_exists,
          EXISTS(SELECT 1 FROM bean_lookup WHERE deleted_at IS NOT NULL) AS bean_deleted
      )
      SELECT
        status.bean_exists,
        status.bean_deleted,
        inserted_log.id,
        inserted_log.user_id,
        inserted_log.bean_id,
        inserted_log.type,
        inserted_log.amount,
        inserted_log.date,
        inserted_log.roast_date,
        inserted_log.note,
        inserted_log.created_at
      FROM status
      LEFT JOIN inserted_log ON TRUE
    `;

    const row = result[0];
    if (!row.bean_exists) {
      throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
    }

    if (row.bean_deleted) {
      throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续出入库');
    }

    return res.status(201).json({
      id: row.id,
      user_id: row.user_id,
      bean_id: row.bean_id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      roast_date: row.roast_date,
      note: row.note,
      created_at: row.created_at
    });

  } catch (error: any) {
    console.error('创建出入库记录失败:', error);

    if (error instanceof ApiError) throw error;

    throw new ApiError(500, 'CREATE_LOG_FAILED', '创建记录失败');
  }
}

async function deleteLog(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  await sql`DELETE FROM inventory_logs WHERE id = ${id} AND user_id = ${userId}`;
  return res.status(200).json({ success: true });
}
