# CODE REVIEW

- Date: 2026-05-03
- Model: GPT-5.4
- Reviewer Role: CTO / Software Architect

### 📊 整体评估 (Summary)
当前代码能跑，但“一致性靠运气、事务靠想象、删除靠误导”，综合评级 **D+**。

### 🌟 亮点 (The Good)
* `src/utils/error.ts` 把 `ApiError` 和响应解析抽出来，至少错误模型开始有统一入口，这比满地 `throw new Error()` 强得多。
* `api/beans.ts`、`api/inventory.ts`、`api/tasting.ts` 基本都带了 `user_id` 过滤，多租户隔离意识是在线的。
* `src/utils/storage.ts` 做了字段归一化和旧字段兼容，说明至少意识到了前后端字段并不稳定。
* `src/pages/index/index.vue` 和 `src/pages/tasting/record.vue` 已经尝试把库存扣减收敛到后端，不再前后端双扣，这是正确方向。

### ⚠️ 风险与缺陷 (The Bad / Risks)
* **P0 | 假事务，真脏数据**
* **模块/文件**: `api/inventory.ts`、`api/tasting.ts`
* **问题描述**: 使用 `@neondatabase/serverless` 的 `neon()` 查询函数时，手写 `BEGIN/ROLLBACK/COMMIT` 并不能提供可靠的会话级事务保证；库存扣减、日志写入、品饮记录写入并不是一个真正的原子单元。
* **潜在后果**: 生产环境会出现“库存扣了但没日志”或“日志写了但库存没变”，账实永久不一致。

* **P0 | Schema 漂移，部署靠玄学**
* **模块/文件**: `api/db/init.ts`、`db/schema.sql`、`api/beans.ts`、`api/tasting.ts`
* **问题描述**: 运行时初始化表结构和 `db/schema.sql` 已经互相打架。`init.ts` 里缺少 `agtron`、`water_quality` 等字段，但业务代码已经在写这些列；`schema.sql` 与运行时查询字段也不完全一致。
* **潜在后果**: 新环境初始化后直接报列不存在，部署成败取决于“之前手工跑过哪些 SQL”。

* **P0 | 删除语义欺骗用户**
* **模块/文件**: `src/pages/index/index.vue`、`api/beans.ts`、`api/db/init.ts`、`db/schema.sql`
* **问题描述**: 前端文案明确写“相关记录将保留”，但后端删除咖啡豆时直接硬删，而相关表外键是 `ON DELETE CASCADE`。
* **潜在后果**: 用户以为只是删库存，实际把出入库历史和品饮记录一起删除，属于真实数据丢失。

* **P1 | 本地缓存把失败伪装成成功**
* **模块/文件**: `src/utils/storage.ts`
* **问题描述**: API 删除失败、本地仍删除；API 新增失败、本地仍追加；失败路径和成功路径都在改缓存，这不是离线优先，这是双账本制造器。
* **潜在后果**: 客户端看到的数据与数据库长期分叉，刷新、换设备、导出时全部对不上。

* **P1 | 本地开发和线上后端不是同一个系统**
* **模块/文件**: `server.js`、`api/*.ts`
* **问题描述**: `server.js` 复制维护了一整套旧版 API，和 `api/*.ts` 已明显分叉，字段、分页、事务处理、返回结构都不一致。
* **潜在后果**: 本地测试通过不代表线上可用，问题复现与修复成本被无意义放大。

* **P1 | 认证只校验 token 是否存在，不校验 token 是否有效**
* **模块/文件**: `src/utils/auth.ts`、`src/utils/api.ts`
* **问题描述**: `checkAuth()` 只是看本地有没有 token；`verifyToken()` 明明存在，却没有接入页面生命周期或应用启动流程。
* **潜在后果**: token 过期后，用户仍能进页面，但所有请求 401，页面表现成“看起来登录了，实际上死了”。

* **P1 | 运行时建表和用户初始化策略脆弱**
* **模块/文件**: `api/auth/login.ts`、`api/auth/middleware.ts`
* **问题描述**: 用户表初始化只在登录时触发，但业务接口和鉴权中间件会直接访问 `users` 表；运行时 DDL 本身也是高风险设计。
* **潜在后果**: 新环境、半初始化环境或表结构漂移时，鉴权和业务接口随机 500。

* **P1 | 精度被前端手工抹掉**
* **模块/文件**: `src/utils/storage.ts`、`src/pages/beans/add.vue`
* **问题描述**: `stock`、`amount`、`waterTemp` 被大量 `Math.round()`；数据库是 `DECIMAL(10,2)`，前端却按整数处理。
* **潜在后果**: 15.5g 录入后变 16g，库存累计误差越来越大，最终账本不可信。

* **P2 | 页面性能模型粗暴**
* **模块/文件**: `src/pages/index/index.vue`、`src/pages/tasting/record.vue`、`src/pages/inventory/log.vue`
* **问题描述**: 动不动 `getBeans(1, 1000)` 全量拉取，再在前端本地查找；列表排序放在计算属性里反复执行。
* **潜在后果**: 数据量一上来，滚动、筛选、录入都会变卡，且额外放大网络与序列化成本。

* **P2 | 存储协议自相矛盾**
* **模块/文件**: `src/pages/login/index.vue`、`src/utils/auth.ts`
* **问题描述**: 登录页直接把对象写入 `user_info`，但读取函数按 JSON 字符串去 `JSON.parse()`。
* **潜在后果**: 一旦启用对应读取逻辑，直接抛错；同时暴露出存储边界没有统一约定。

### 💡 改进建议 (Actionable Suggestions)
* **先修事务模型**: 不要再拆成 `BEGIN -> UPDATE -> INSERT -> COMMIT` 多次调用；要么用真正支持事务的连接模式，要么把“扣库存 + 写日志”收敛成单条 SQL / CTE 原子操作。

```ts
const result = await sql`
  WITH updated AS (
    UPDATE coffee_beans
    SET stock = stock - ${amount}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${beanId}
      AND user_id = ${userId}
      AND stock >= ${amount}
    RETURNING id, stock
  ),
  inserted_log AS (
    INSERT INTO inventory_logs (id, user_id, bean_id, type, amount, date, note)
    SELECT ${logId}, ${userId}, id, 'OUT', ${amount}, ${date}, ${note}
    FROM updated
    RETURNING *
  )
  SELECT stock FROM updated
`;
if (result.length === 0) throw new ApiError(400, 'INSUFFICIENT_STOCK', '库存不足');
```

* **统一 Schema 真相源**: 只保留 `db/migrations/` 作为唯一 schema 入口，删除运行时建表逻辑；启动时最多做健康检查，不做 DDL。
* **删除改为软删除**: 给 `coffee_beans` 增加 `deleted_at`，查询时过滤；历史流水和品饮记录保留，必要时增加 `bean_name_snapshot`。
* **缓存层别再擅自成功**: 服务端失败就不要改本地状态；如果真要做离线优先，请正式引入待同步操作队列、重试机制和冲突解决。
* **删掉双后端**: `server.js` 和 `api/*.ts` 必须统一，不能再维护两套已分叉实现。
* **认证改成真实校验**: 应用启动即调用 `verifyToken()`，对 `401` 做统一登出和跳转；`checkAuth()` 只看本地 token 是否存在，这种写法太原始。
* **恢复小数精度**: 存储层保留两位小数，展示层再格式化，不要在业务数据写入前 `Math.round()`。
* **避免全量拉取**: 页面需要单豆详情时就调用 `getBeanById()`，别每次都 `getBeans(1, 1000)` 再在前端找。

### 🎯 优先级排期 (Priority)
* **P0 (必须修复)**: 假事务导致库存/记录失真；schema 漂移导致新环境直接炸；删除豆子级联删历史但 UI 明示“会保留”。
* **P1 (建议重构)**: 本地缓存伪成功；`server.js` 与 `api/*.ts` 双后端分叉；认证只验 token 存在不验有效性；运行时建表/初始化策略脆弱。
* **P2 (完美主义)**: 小数被强制整数化；页面层频繁全量拉取和重复排序；`user_info` 存储协议不一致与死代码清理。

### 结论
这份代码当前最大问题不是“写得不优雅”，而是**数据一致性没有被当成第一等公民**。库存系统一旦账不准，UI 再精致也只是高级幻觉。
