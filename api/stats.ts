import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './db';
import { authenticate } from './auth/middleware';
import { ApiError } from '../src/utils/error';
import { ensureBusinessSchemaReady } from './db/init';

// ---------- 数据查询（纯函数，不接触 res，便于组合） ----------

// 每月出入库统计：按豆种数与克数
async function queryMonthly(userId: string) {
  const rows = await sql`
    SELECT
      LEFT(il.date, 7) AS ym,
      COUNT(*) FILTER (WHERE il.type = 'IN') AS in_cnt,
      COUNT(*) FILTER (WHERE il.type = 'OUT') AS out_cnt,
      COUNT(DISTINCT il.bean_id) FILTER (WHERE il.type = 'IN') AS in_beans,
      COUNT(DISTINCT il.bean_id) FILTER (WHERE il.type = 'OUT') AS out_beans,
      COALESCE(SUM(il.amount) FILTER (WHERE il.type = 'IN'), 0) AS in_g,
      COALESCE(SUM(il.amount) FILTER (WHERE il.type = 'OUT'), 0) AS out_g
    FROM inventory_logs il
    WHERE il.user_id = ${userId}
    GROUP BY ym
    ORDER BY ym
  `;

  return rows.map((r: any) => ({
    ym: r.ym,
    inCnt: parseInt(r.in_cnt),
    outCnt: parseInt(r.out_cnt),
    inBeans: parseInt(r.in_beans),
    outBeans: parseInt(r.out_beans),
    inGrams: Number(r.in_g),
    outGrams: Number(r.out_g)
  }));
}

// 各国咖啡豆数量与当前库存
async function queryCountries(userId: string) {
  const rows = await sql`
    SELECT
      COALESCE(NULLIF(cb.origin_country, ''), '未知') AS country,
      COUNT(*) AS beans,
      COALESCE(SUM(cb.stock), 0) AS stock_g
    FROM coffee_beans cb
    WHERE cb.user_id = ${userId} AND cb.deleted_at IS NULL
    GROUP BY country
    ORDER BY beans DESC, country
  `;

  return rows.map((r: any) => ({
    country: r.country,
    beans: parseInt(r.beans),
    stockGrams: Number(r.stock_g)
  }));
}

// 已无库存（stock=0）咖啡豆的消耗周期
async function queryDepleted(userId: string) {
  const rows = await sql`
    SELECT
      cb.id,
      cb.name,
      COALESCE(cb.origin_country, '') AS country,
      MIN(CASE WHEN il.type = 'OUT' THEN il.date END) AS first_out,
      MAX(CASE WHEN il.type = 'OUT' THEN il.date END) AS last_out,
      COALESCE(SUM(il.amount) FILTER (WHERE il.type = 'OUT'), 0) AS out_g,
      COALESCE(SUM(il.amount) FILTER (WHERE il.type = 'IN'), 0) AS in_g
    FROM coffee_beans cb
    LEFT JOIN inventory_logs il ON il.bean_id = cb.id AND il.user_id = cb.user_id
    WHERE cb.user_id = ${userId}
      AND cb.deleted_at IS NULL
      AND (cb.stock = 0 OR cb.stock IS NULL)
    GROUP BY cb.id, cb.name, cb.origin_country
    ORDER BY first_out
  `;

  return rows.map((r: any) => {
    const first = r.first_out ? new Date(r.first_out) : null;
    const last = r.last_out ? new Date(r.last_out) : null;
    const spanDays = first && last
      ? Math.max(0, Math.round((last.getTime() - first.getTime()) / 86400000))
      : null;
    return {
      id: r.id,
      name: r.name,
      country: r.country || '',
      firstOut: r.first_out || null,
      lastOut: r.last_out || null,
      spanDays,
      outGrams: Number(r.out_g),
      inGrams: Number(r.in_g)
    };
  });
}

// ---------- HTTP 处理 ----------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await authenticate(req, res);
    if (!userId) return; // authenticate已设置响应

    await ensureBusinessSchemaReady();

    const type = (req.query.type as string) || 'all';

    switch (type) {
      case 'monthly':
        return res.status(200).json({ success: true, data: await queryMonthly(userId) });
      case 'countries':
        return res.status(200).json({ success: true, data: await queryCountries(userId) });
      case 'depleted':
        return res.status(200).json({ success: true, data: await queryDepleted(userId) });
      case 'all': {
        const [monthly, countries, depleted] = await Promise.all([
          queryMonthly(userId),
          queryCountries(userId),
          queryDepleted(userId)
        ]);
        return res.status(200).json({ success: true, monthly, countries, depleted });
      }
      default:
        throw new ApiError(400, 'INVALID_TYPE', 'type 仅支持 all | monthly | countries | depleted');
    }
  } catch (error: any) {
    console.error('Stats API Error:', error);
    if (error instanceof ApiError) {
      return res.status(error.status).json({
        error: error.message,
        error_code: error.code,
        details: error.details
      });
    }
    return res.status(500).json({ error: 'Internal server error', error_code: 'INTERNAL_ERROR' });
  }
}