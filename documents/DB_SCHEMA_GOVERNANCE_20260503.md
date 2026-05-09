# 数据库 Schema 治理说明

- 日期: 2026-05-03
- 目标: 消除 schema drift，建立唯一真相源

## 1. 背景

项目曾同时存在以下几套数据库结构定义：

- `db/migrations/*.sql`
- `db/schema.sql`
- `api/db/init.ts`
- `server.js`
- 各业务 API 对字段的隐式依赖

这些定义在字段、索引、约束上长期不一致，导致新环境部署、旧环境升级和本地开发的结构状态不可预测。

## 2. 当前决策

- `db/migrations/` 是数据库结构的唯一真相源
- `db/schema.sql` 是当前完整结构快照
- `api/db/init.ts` 与 `server.js` 只负责 schema 校验，不再创建业务表
- 部署顺序必须是：先执行 migration，再发布代码

## 3. 本次已统一的关键结构

### 3.1 `coffee_beans`

- 增加并统一字段: `agtron`, `deleted_at`
- 统一索引: `idx_coffee_beans_user_id`, `idx_coffee_beans_user_deleted`

### 3.2 `inventory_logs`

- 统一字段: `user_id`, `bean_id`, `name`, `type`, `amount`, `date`, `roast_date`, `note`
- 统一索引: `idx_inventory_logs_bean_id`, `idx_inventory_logs_user_id`, `idx_inventory_logs_date`

### 3.3 `tasting_records`

- 统一字段: `user_id`, `water_quality`
- 统一索引: `idx_tasting_records_bean_id`, `idx_tasting_records_user_id`, `idx_tasting_records_date`, `idx_tasting_records_user_date`

### 3.4 `users`

- 统一用户表定义，确保认证链路依赖的字段完整

## 4. 历史环境升级要求

旧环境必须执行：

```sql
db/migrations/007_reconcile_current_schema.sql
```

该迁移用于：

- 补齐缺失列
- 补齐缺失索引
- 为历史 `tasting_records.user_id` 尝试回填数据
- 在发现无法安全回填时中止执行，防止带病进入 `NOT NULL`

## 5. 新增字段的规范流程

新增任何数据库字段时，只允许按以下顺序执行：

1. 编写新的 migration
2. 更新 `db/schema.sql` 快照
3. 修改业务代码
4. 补充验证与文档

禁止：

- 只改业务代码，不补 migration
- 只改 `schema.sql`，不补 migration
- 在 `api/db/init.ts` 或 `server.js` 里偷偷补字段

## 6. 启动时校验

以下组件会在启动/请求入口校验 schema 完整性：

- `api/db/init.ts`
- `api/auth/middleware.ts`
- `server.js`

若结构不完整，会直接报错并要求先执行 migration。

## 7. 用户种子数据

- 默认用户初始化不再挂在登录接口或服务启动链路上
- `USERS_CONFIG` 的落库方式改为显式执行 `npm run seed:users`
- `seed:users` 只负责补充不存在的用户名，不覆盖已有用户
- 结构迁移与种子数据初始化必须分开管理：
  - migration 管 schema
  - seed 脚本管默认用户
