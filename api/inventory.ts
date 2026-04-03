import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './db';
import { authenticate } from './auth/middleware';
import { ApiError } from '../src/utils/error';

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
      SELECT * FROM inventory_logs
      WHERE user_id = ${userId} AND bean_id = ${beanId}
      ORDER BY date DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    countResult = await sql`
      SELECT COUNT(*) as total FROM inventory_logs
      WHERE user_id = ${userId}
    `;
    
    logs = await sql`
      SELECT * FROM inventory_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC, created_at DESC
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

  try {
    // 开始事务
    await sql`BEGIN`;

    // 如果是出库，原子扣减库存
    if (fields.type === 'OUT') {
      const updateResult = await sql`
        UPDATE coffee_beans
        SET stock = stock - ${fields.amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${fields.bean_id}
          AND user_id = ${userId}
          AND stock >= ${fields.amount}
        RETURNING stock
      `;

      if (updateResult.length === 0) {
        await sql`ROLLBACK`;
        // 检查库存是否不足或记录不存在
        const bean = await sql`SELECT stock FROM coffee_beans WHERE id = ${fields.bean_id} AND user_id = ${userId}`;
        if (bean.length === 0) {
          throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
        }
        throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足', { stock: bean[0].stock });
      }
    }

    // 插入出入库记录
    const result = await sql`
      INSERT INTO inventory_logs (
        id, user_id, bean_id, type, amount, date, roast_date, note
      ) VALUES (
        ${fields.id}, ${fields.user_id}, ${fields.bean_id}, ${fields.type},
        ${fields.amount}, ${fields.date}, ${fields.roast_date}, ${fields.note}
      ) RETURNING *
    `;

    // 提交事务
    await sql`COMMIT`;
    return res.status(201).json(result[0]);

  } catch (error: any) {
    await sql`ROLLBACK`;
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
