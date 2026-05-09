# 今日工作汇报

- 报告生成时间：`2026-05-03 20:56:45 CST`
- 报告署名模型：`GPT-5.4`

## 今日目标

- 围绕当前仓库做持续性后端治理，重点收敛高风险缺陷，提升数据一致性、删除语义、schema 治理、认证链路隔离和前后端一致性。
- 输出不止停留在分析层，而是完成代码修复、文档补充和有效性验证。

## 一、代码审查与问题盘点

- 完成一次深度全量 Code Review，并产出正式文档 [CODE_REVIEW_20260503.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/documents/CODE_REVIEW_20260503.md)
- 识别出多项高优先级问题：
  - 伪事务导致库存、出入库日志、品饮记录可能部分成功
  - 删除豆子语义欺骗，存在“看似删除，实则数据关系断裂”风险
  - 数据库 schema 漂移，多套真相源互相打架
  - `storage.ts` 存在“API 失败但本地仍写成功”的伪成功问题
  - 运行时建表和用户初始化策略脆弱，认证链路被无关业务表状态牵连

## 二、库存与品饮原子性修复

- 修复 [inventory.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/inventory.ts) 的出库链路，将“扣库存 + 写日志”改为单条 SQL CTE 原子执行
- 继续收敛入库链路，将 `IN` 操作也统一为后端单接口原子写入，避免前端双写库存和日志
- 修复 [tasting.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/tasting.ts) 的品饮链路，将“扣库存 + 写出库日志 + 写品饮记录”改为单条 SQL 原子执行
- 为关键数量字段补充正数校验：
  - `parsePositiveAmount()`
  - `parsePositiveDose()`
- 对软删除 bean 的入库、出库、品饮统一返回 `409 BEAN_DELETED`

## 三、删除语义治理与软删除落地

- 将 [beans.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/beans.ts) 的删除逻辑从物理删除改为软删除：`deleted_at = CURRENT_TIMESTAMP`
- 落实业务规则：
  - 库存首页不展示已删除豆子
  - 豆子详情默认不允许直接访问已删除 bean
  - 已删除 bean 禁止继续入库、出库、品饮
  - 历史记录与品饮记录保留可查
  - 历史页、品饮页默认不把已删除 bean 当活跃对象，但支持按 `beanId` 定向查看
- 前后端联动完善：
  - [index.vue](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/pages/index/index.vue) 修正删除提示与行为
  - [record.vue](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/pages/tasting/record.vue) 支持查看软删除 bean 的历史
  - [log.vue](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/pages/inventory/log.vue) 支持显示 `beanName`
  - [api.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/utils/api.ts) 支持 `includeDeleted`
  - [types/index.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/types/index.ts) 扩展 `deletedAt`、`beanName` 等字段

## 四、Schema Drift 收敛与数据库治理

- 梳理 schema 漂移问题并产出文档：
  - [SCHEMA_AUDIT_20260503.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/documents/SCHEMA_AUDIT_20260503.md)
  - [DB_SCHEMA_GOVERNANCE_20260503.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/documents/DB_SCHEMA_GOVERNANCE_20260503.md)
- 补齐数据库结构快照 [schema.sql](file:///Users/liuzhao/Downloads/coffee-inventory-app/db/schema.sql)
- 新增/完善迁移：
  - [006_add_deleted_at_to_coffee_beans.sql](file:///Users/liuzhao/Downloads/coffee-inventory-app/db/migrations/006_add_deleted_at_to_coffee_beans.sql)
  - [007_reconcile_current_schema.sql](file:///Users/liuzhao/Downloads/coffee-inventory-app/db/migrations/007_reconcile_current_schema.sql)
- 收敛 schema 真相源策略：
  - `db/migrations/` 作为唯一结构演进真相源
  - `db/schema.sql` 作为当前结构快照
  - 运行时代码不再负责偷偷建表

## 五、运行时建表清理与初始化职责收缩

- 改造 [init.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/db/init.ts)
  - 删除业务表 `CREATE TABLE` / `CREATE INDEX` 逻辑
  - 改为 schema 校验函数
- 改造 [server.js](file:///Users/liuzhao/Downloads/coffee-inventory-app/server.js)
  - 本地服务启动时只校验 schema，不再建表
  - 启动日志提示默认用户初始化改由独立脚本处理
- 改造 [login.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/auth/login.ts)
  - 从“登录时顺手初始化用户”改为“登录前只校验 schema”
- 改造 [middleware.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/auth/middleware.ts)
  - 认证前先做 schema ready 检查，避免随机 500

## 六、默认用户 Seed 从运行时彻底剥离

- 新增独立脚本 [seed-users.js](file:///Users/liuzhao/Downloads/coffee-inventory-app/scripts/seed-users.js)
  - 从 `USERS_CONFIG` 读取默认账号
  - 校验 `users` 表结构
  - 已存在用户名自动跳过
- 更新 [package.json](file:///Users/liuzhao/Downloads/coffee-inventory-app/package.json)，新增命令：
  - `npm run seed:users`
- 更新文档：
  - [README.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/README.md)
  - [Local_Setup_Guide_20260329.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/documents/Local_Setup_Guide_20260329.md)
  - [DB_SCHEMA_GOVERNANCE_20260503.md](file:///Users/liuzhao/Downloads/coffee-inventory-app/documents/DB_SCHEMA_GOVERNANCE_20260503.md)
- 清理 `api/db/init.ts` 内残留 seed 死代码，避免后续误用把旧逻辑复活

## 七、前端存储层伪成功问题修复

- 改造 [storage.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/src/utils/storage.ts)
  - 写操作严格以后端为准
  - 移除“API 失败仍修改本地缓存”的路径
  - `saveBeans()` 显式禁用，阻止继续绕过服务端
- 保留只读缓存兜底，但不再允许本地缓存伪造成功结果

## 八、认证链路与业务链路解耦

- 识别问题：认证链路被库存/品饮表状态牵连，局部 schema 问题会放大成登录入口故障
- 进一步重构 [init.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/db/init.ts)，拆分为三层 guard：
  - `ensureAuthSchemaReady()`：只校验 `users`
  - `ensureBusinessSchemaReady()`：只校验业务表
  - `ensureApplicationSchemaReady()`：整库校验入口
- 调整使用位置：
  - [login.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/auth/login.ts) 只依赖 `ensureAuthSchemaReady()`
  - [middleware.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/auth/middleware.ts) 只依赖 `ensureAuthSchemaReady()`
  - [verify-token.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/auth/verify-token.ts) 只依赖 `ensureAuthSchemaReady()`
  - [beans.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/beans.ts)、[inventory.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/inventory.ts)、[tasting.ts](file:///Users/liuzhao/Downloads/coffee-inventory-app/api/tasting.ts) 在鉴权成功后再执行 `ensureBusinessSchemaReady()`
  - [server.js](file:///Users/liuzhao/Downloads/coffee-inventory-app/server.js) 同步对齐本地行为
- 结果：
  - `users` 正常时，登录不再因为库存/品饮表漂移而一起 500
  - 故障影响面从“全站入口”收缩回“对应业务模块”

## 九、验证与质量检查

- 已完成验证：
  - `npm run build` 通过
  - `npx tsc --noEmit -p tsconfig.json` 通过
  - `node --check server.js` 通过
  - `DATABASE_URL=postgres://example USERS_CONFIG='' node scripts/seed-users.js` 验证空配置安全退出
- 已完成行为级 mock 验证：
  - 登录链路不再触发 seed
  - 登录链路只执行用户查询与 `last_login` 更新
  - 登录阶段只走 `auth guard`
  - 业务接口在鉴权成功后才走 `business guard`
- 对若干中间编译产物、路径、类型检查误报进行了修正和收尾处理

## 十、今日结论

- 今天完成的不是零碎修 bug，而是把几条最危险的后端主链路连续收敛了一遍：
  - 库存/品饮原子性
  - 删除语义一致性
  - schema 真相源治理
  - 前端写操作以后端为准
  - 用户 seed 与运行时解耦
  - 认证入口不再替业务表背锅
- 当前系统相比今天开始前，整体一致性、可恢复性和故障隔离能力都明显提升。

## 十一、仍需后续关注的尾巴

- `server.js` 与 `api/db/init.ts` 仍各维护一份 schema guard 定义，存在再次漂移风险
- 当前 guard 只校验“表/列存在”，尚未覆盖索引、外键、关键约束
- `seed-users.js` 当前是“只新增、不更新已有用户”，文档表述后续建议再对齐
- `Math.round()` 导致库存/克重精度被抹掉的问题已讨论，但按你的要求暂时搁置

## 十二、建议下次优先项

- 收敛 `server.js` 与 `api/db/init.ts` 的 schema 定义到单一模块
- 视需要增强 schema guard，对索引、约束、外键做最小关键校验
- 再决定是否回头处理精度问题
