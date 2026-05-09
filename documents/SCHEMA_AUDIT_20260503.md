# Schema Drift 盘点

- 日期: 2026-05-03
- 范围: `db/migrations/`, `db/schema.sql`, `api/db/init.ts`, `server.js`, `api/*.ts`

## 已发现的核心漂移

### 1. 多套真相源并存

- `db/migrations/*.sql` 代表历史演进
- `db/schema.sql` 代表结构快照
- `api/db/init.ts` 曾在运行时偷偷创建业务表
- `server.js` 曾维护另一套本地 schema

结果是：不同环境可能拥有不同字段集。

### 2. `coffee_beans` 漂移

- 业务代码依赖 `agtron`
- 软删除逻辑依赖 `deleted_at`
- 部分旧定义未包含这些字段

### 3. `inventory_logs` 漂移

- 迁移中出现过 `name` 字段
- 但并非所有 schema 定义都保留了该字段

### 4. `tasting_records` 漂移

- 业务代码依赖 `user_id`
- 业务代码依赖 `water_quality`
- 旧定义并不总是同时包含这两个字段

### 5. 索引漂移

- `idx_coffee_beans_user_deleted`
- `idx_inventory_logs_user_id`
- `idx_tasting_records_user_id`
- `idx_tasting_records_user_date`

上述索引在不同定义中存在不一致或缺失。

## 本次修复动作

- 新增 `db/migrations/007_reconcile_current_schema.sql`
- 补齐 `db/schema.sql` 作为最新快照
- 移除 `api/db/init.ts` 中的业务表创建逻辑
- 移除 `server.js` 中的业务表创建逻辑
- 增加运行时 schema 校验
- 补充治理文档 `documents/DB_SCHEMA_GOVERNANCE_20260503.md`

## 结论

从这次修复开始：

- migration 是唯一结构真相源
- schema 快照只是结果，不是演进入口
- 运行时代码只允许校验，不允许建表
