import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate } from './auth/middleware';
import sql from './db';
import { ApiError } from '../src/utils/error';
import { ensureBusinessSchemaReady } from './db/init';

// 字段名映射：前端驼峰 -> 数据库下划线
function mapBeanFields(body: any) {
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
    agtron: body.agtron,
    process: body.process,
    roast_date: body.roastDate,
    reference_price: body.referencePrice,
    stock: body.stock || 0,
    description: body.description
  };
}

function parseNonNegativeStock(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', '库存必须是不小于0的数字');
  }
  return value;
}

async function ensureActiveBeanExists(beanId: unknown, userId: string): Promise<void> {
  const bean = await sql`
    SELECT deleted_at
    FROM coffee_beans
    WHERE id = ${beanId} AND user_id = ${userId}
  `;

  if (bean.length === 0) {
    throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
  }

  if (bean[0].deleted_at) {
    throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续操作');
  }
}

async function updateBeanStock(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  const { amount } = req.body;

  // 验证参数
  if (typeof amount !== 'number' || !isFinite(amount)) {
    throw new ApiError(400, 'INVALID_AMOUNT', '库存变更数量必须为数字');
  }

  await ensureActiveBeanExists(id, userId);

  // 原子更新库存
  // 如果是扣减（amount < 0），需要确保库存充足
  // 如果是增加（amount > 0），直接更新
  const result = amount < 0
    ? await sql`
        UPDATE coffee_beans
        SET stock = stock + ${amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          AND user_id = ${userId}
          AND deleted_at IS NULL
          AND stock >= ${-amount}
        RETURNING stock
      `
    : await sql`
        UPDATE coffee_beans
        SET stock = stock + ${amount},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
          AND user_id = ${userId}
          AND deleted_at IS NULL
        RETURNING stock
      `;

  if (result.length === 0) {
    if (amount < 0) {
      const bean = await sql`
        SELECT stock
        FROM coffee_beans
        WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
      `;
      throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足', { currentStock: bean[0].stock });
    }
    throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续操作');
  }

  return res.status(200).json({ success: true, stock: result[0].stock });
}

async function getBeanById(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  const includeDeleted = req.query.includeDeleted === 'true';
  const bean = await sql`
    SELECT * FROM coffee_beans
    WHERE id = ${id}
      AND user_id = ${userId}
      AND (${includeDeleted} OR deleted_at IS NULL)
  `;

  if (bean.length === 0) {
    throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
  }

  return res.status(200).json(bean[0]);
}

async function getBeans(req: VercelRequest, res: VercelResponse, userId: string) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const countResult = await sql`
    SELECT COUNT(*) as total FROM coffee_beans 
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
  `;
  const total = parseInt(countResult[0].total);
  const totalPages = Math.ceil(total / limit);

  const beans = await sql`
    SELECT * FROM coffee_beans 
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  return res.status(200).json({
    data: beans,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  });
}

async function createBean(req: VercelRequest, res: VercelResponse, userId: string) {
  const fields = mapBeanFields(req.body);
  fields.user_id = userId; // 设置用户ID

  // 验证必填字段
  if (!fields.name || !fields.name.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', '咖啡豆名称不能为空');
  }

  fields.stock = parseNonNegativeStock(fields.stock);

  try {
    if (fields.stock > 0) {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await sql`
        WITH inserted_bean AS (
          INSERT INTO coffee_beans (
            id, user_id, name, origin_country, origin_region, origin, brand_roaster,
            producer, altitude, variety, flavor_notes, roast_level, agtron, process,
            roast_date, reference_price, stock, description
          ) VALUES (
            ${fields.id}, ${fields.user_id}, ${fields.name}, ${fields.origin_country},
            ${fields.origin_region}, ${fields.origin}, ${fields.brand_roaster},
            ${fields.producer}, ${fields.altitude}, ${fields.variety},
            ${fields.flavor_notes}, ${fields.roast_level}, ${fields.agtron}, ${fields.process},
            ${fields.roast_date}, ${fields.reference_price}, ${fields.stock},
            ${fields.description}
          )
          RETURNING *
        ),
        inserted_log AS (
          INSERT INTO inventory_logs (
            id, user_id, bean_id, type, amount, date, roast_date, note
          )
          SELECT
            ${logId}, ${fields.user_id}, ${fields.id}, 'IN', ${fields.stock},
            ${new Date().toISOString()}, ${fields.roast_date}, '由系统初始化入库'
          FROM inserted_bean
          RETURNING id
        )
        SELECT * FROM inserted_bean
      `;

      return res.status(201).json(result[0]);
    }

    const result = await sql`
      INSERT INTO coffee_beans (
        id, user_id, name, origin_country, origin_region, origin, brand_roaster,
        producer, altitude, variety, flavor_notes, roast_level, agtron, process,
        roast_date, reference_price, stock, description
      ) VALUES (
        ${fields.id}, ${fields.user_id}, ${fields.name}, ${fields.origin_country}, 
        ${fields.origin_region}, ${fields.origin}, ${fields.brand_roaster},
        ${fields.producer}, ${fields.altitude}, ${fields.variety}, 
        ${fields.flavor_notes}, ${fields.roast_level}, ${fields.agtron}, ${fields.process},
        ${fields.roast_date}, ${fields.reference_price}, ${fields.stock}, 
        ${fields.description}
      ) RETURNING *
    `;
    return res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('创建咖啡豆失败:', error);
    throw new ApiError(500, 'CREATE_FAILED', '创建咖啡豆失败');
  }
}

async function updateBean(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  const fields = mapBeanFields(req.body);

  // 验证必填字段
  if (!fields.name || !fields.name.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', '咖啡豆名称不能为空');
  }

  await ensureActiveBeanExists(id, userId);

  try {
    const result = await sql`
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
        agtron = ${fields.agtron},
        process = ${fields.process},
        roast_date = ${fields.roast_date},
        reference_price = ${fields.reference_price},
        stock = ${fields.stock},
        description = ${fields.description},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING *
    `;

    if (result.length === 0) {
      throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除，无法继续操作');
    }

    return res.status(200).json(result[0]);
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('更新咖啡豆失败:', error);
    throw new ApiError(500, 'UPDATE_FAILED', '更新咖啡豆失败');
  }
}

async function deleteBean(req: VercelRequest, res: VercelResponse, userId: string) {
  const { id } = req.query;
  try {
    const result = await sql`
      UPDATE coffee_beans
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
        AND user_id = ${userId}
        AND deleted_at IS NULL
      RETURNING id
    `;

    if (result.length === 0) {
      const bean = await sql`
        SELECT id
        FROM coffee_beans
        WHERE id = ${id} AND user_id = ${userId}
      `;
      if (bean.length === 0) {
        throw new ApiError(404, 'BEAN_NOT_FOUND', '咖啡豆不存在或无权限');
      }
      throw new ApiError(409, 'BEAN_DELETED', '该咖啡豆已删除');
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    console.error('删除咖啡豆失败:', error);
    throw new ApiError(500, 'DELETE_FAILED', '删除咖啡豆失败');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req, res);
    if (!userId) return; // authenticate已设置响应

    await ensureBusinessSchemaReady();

    switch (req.method) {
      case 'GET':
        if (req.query.id) {
          return await getBeanById(req, res, userId);
        }
        return await getBeans(req, res, userId);
      case 'POST':
        return await createBean(req, res, userId);
      case 'PUT':
        return await updateBean(req, res, userId);
      case 'PATCH':
        if (req.query.id && (req.body.amount !== undefined)) {
          return await updateBeanStock(req, res, userId);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      case 'DELETE':
        return await deleteBean(req, res, userId);
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
