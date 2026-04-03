# 咖啡豆库存管理系统 - 技术审计报告

> 生成时间：2026-03-19\
> 审计角色：资深CTO\
> 使用模型：stepfun/step-3.5-flash:free

***

## 执行摘要

当前系统处于**半成品状态**：已实现完整的JWT认证系统但未使用，转而采用不安全的硬编码方案；数据库设计存在严重缺陷导致多用户数据无法隔离；存储层缺乏事务支持，存在数据不一致风险。**建议立即修复P0级问题，否则系统不适合上线生产环境。**

***

## 问题分类与优先级

### 🔴 P0 - 紧急修复（安全与数据完整性）

#### 1. 认证系统混乱与安全隐患

**问题描述：**

- 前端使用硬编码用户凭证（`/src/pages/login/index.vue`）
- 后端API使用字符串匹配解析token（`/api/beans.ts`, `/api/inventory.ts`）
- 完整的JWT认证系统已实现但完全未使用（`/api/auth.ts`）
- 用户密码明文存储在代码中

**影响：**

- 任何能访问代码的人都知道所有用户密码
- token验证逻辑极易被绕过（只需包含用户名子串）
- 两套认证系统造成维护混乱

**修复方案：**

1. **立即移除硬编码验证，启用JWT系统**

修改 `/src/pages/login/index.vue`：

```typescript
// 删除 HARDCODED_USERS 对象
// 改为调用真实登录API
const login = async () => {
  try {
    const result = await api.login({
      username: formData.username,
      password: formData.password
    });
    // 保存JWT token
    uni.setStorageSync('authToken', result.token);
    uni.setStorageSync('user', result.user);
    // 设置API客户端认证头
    api.setAuthToken(result.token);
    navigateToHome();
  } catch (error) {
    showError('登录失败：' + error.message);
  }
};
```

1. **修复后端API认证中间件**

创建 `/api/middleware/auth.ts`：

```typescript
import jwt from 'jsonwebtoken';
import { db } from './db';

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // 验证用户是否存在
    const user = await db.one(
      'SELECT id, username, display_name FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};
```

1. **在所有API路由中添加认证中间件**

修改 `/api/beans.ts`：

```typescript
import { authenticate } from './middleware/auth';

export default async (req: any, res: any) => {
  await authenticate(req, res, async () => {
    // 原有逻辑，使用 req.userId
    if (req.method === 'GET') {
      const beans = await db.any(
        'SELECT * FROM coffee_beans WHERE user_id = $1 ORDER BY created_at DESC',
        [req.userId]
      );
      return res.json(beans);
    }
    // ... 其他方法
  });
};
```

1. **更新环境变量配置**

`.env` 文件必须包含：

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
```

***

#### 2. 数据隔离不完整（tasting\_records表缺少user\_id）

**问题描述：**

- `tasting_records` 表缺少 `user_id` 字段（`/db/schema.sql`）
- 当前所有品饮记录都关联到bean，但无法按用户隔离
- 多用户环境下会看到彼此的数据

**影响：**

- **严重的数据泄露风险**：用户A可以看到用户B的品饮记录
- 违反数据隔离基本原则

**修复方案：**

1. **数据库迁移 - 添加user\_id字段**

创建迁移文件 `/db/migrations/001_add_user_id_to_tasting_records.sql`：

```sql
-- 添加 user_id 字段
ALTER TABLE tasting_records ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT 'user-riku-001';

-- 更新现有记录：根据bean_id关联的coffee_beans.user_id设置正确的user_id
UPDATE tasting_records tr
SET user_id = cb.user_id
FROM coffee_beans cb
WHERE tr.bean_id = cb.id;

-- 添加外键约束
ALTER TABLE tasting_records 
ADD CONSTRAINT fk_tasting_records_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 删除默认值
ALTER TABLE tasting_records ALTER COLUMN user_id DROP DEFAULT;

-- 创建复合索引以优化查询
CREATE INDEX idx_tasting_records_user_id ON tasting_records(user_id);
```

1. **更新API和存储层**

修改 `/api/tasting.ts`：

```typescript
export default async (req: any, res: any) => {
  await authenticate(req, res, async () => {
    const userId = req.userId;
    
    if (req.method === 'GET') {
      const records = await db.any(
        `SELECT tr.*, cb.name as bean_name 
         FROM tasting_records tr
         JOIN coffee_beans cb ON tr.bean_id = cb.id
         WHERE tr.user_id = $1
         ORDER BY tr.date DESC`,
        [userId]
      );
      return res.json(records);
    }
    
    if (req.method === 'POST') {
      const { bean_id, dose, ...rest } = req.body;
      
      // 验证bean属于当前用户
      const bean = await db.one(
        'SELECT id FROM coffee_beans WHERE id = $1 AND user_id = $2',
        [bean_id, userId]
      );
      
      const record = {
        id: uuidv4(),
        user_id: userId, // 关键：设置user_id
        bean_id,
        dose: parseFloat(dose),
        ...rest
      };
      
      await db.none(
        `INSERT INTO tasting_records (id, user_id, bean_id, dose, date, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [record.id, record.user_id, record.bean_id, record.dose, record.date, record.notes || '']
      );
      
      return res.json(record);
    }
  });
};
```

1. **更新前端存储层**

修改 `/src/utils/storage.ts`：

```typescript
async createTastingRecord(record: Omit<TastingRecord, 'id' | 'created_at'>): Promise<TastingRecord> {
  try {
    // 确保user_id从当前用户获取
    const user = this.getCurrentUser();
    const recordWithUser = {
      ...record,
      user_id: user.id
    };
    
    const result = await api.createTastingRecord(recordWithUser);
    const records = localCache.getTastingRecords();
    records.push(result);
    localCache.saveTastingRecords(records);
    return result;
  } catch (error) {
    console.warn('Failed to create tasting record via API, saving locally:', error);
    const user = this.getCurrentUser();
    const newRecord: TastingRecord = {
      ...record,
      id: generateId(),
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    const records = localCache.getTastingRecords();
    records.push(newRecord);
    localCache.saveTastingRecords(records);
    return newRecord;
  }
}
```

***

#### 3. 敏感信息硬编码（密码明文存储）

**问题描述：**

- 用户密码以明文形式硬编码在 `login/index.vue` 中
- 即使启用JWT，环境变量中的JWT\_SECRET也需要保护

**影响：**

- 代码仓库泄露导致所有账户被攻破
- 无法支持密码修改功能

**修复方案：**

1. **移除硬编码密码，使用环境变量或数据库存储**

在生产环境中，用户凭证应存储在数据库：

```sql
-- users表已有password字段，确保使用bcrypt加密
UPDATE users SET password = '$2a$10$...' WHERE username = 'riku';
```

1. **前端完全移除硬编码逻辑**（已在P0.1中修复）
2. **确保JWT\_SECRET通过环境变量注入，不提交到代码库**

更新 `.env.example`：

```
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
```

更新 `vercel.json`：

```json
{
  "env": {
    "JWT_SECRET": "@jwt_secret"
  }
}
```

***

### 🟡 P1 - 高优先级（数据一致性）

#### 4. 存储层数据同步风险

**问题描述：**

- `storage.ts` 中所有方法采用fire-and-forget策略
- API失败时回退到本地缓存，但无冲突检测和解决机制
- 离线创建的对象可能缺少服务器生成的字段（id、created\_at等）

**影响：**

- 本地缓存与服务器数据长期不一致
- 多设备同步时数据丢失或覆盖
- 用户在不同设备上看到不同数据

**修复方案：**

1. **实现同步队列和冲突解决机制**

修改 `/src/utils/storage.ts`：

```typescript
class SyncQueue {
  private queue: Array<{operation: string; data: any; timestamp: number}> = [];
  private isSyncing = false;
  
  enqueue(operation: string, data: any) {
    this.queue.push({ operation, data, timestamp: Date.now() });
    this.processQueue();
  }
  
  async processQueue() {
    if (this.isSyncing || this.queue.length === 0) return;
    
    this.isSyncing = true;
    try {
      const item = this.queue.shift()!;
      await this.syncOperation(item.operation, item.data);
    } catch (error) {
      console.error('Sync failed, will retry:', error);
      // 重新加入队列，延迟重试
      setTimeout(() => this.processQueue(), 5000);
    } finally {
      this.isSyncing = false;
      if (this.queue.length > 0) this.processQueue();
    }
  }
  
  private async syncOperation(operation: string, data: any) {
    // 实现具体的同步逻辑
    switch (operation) {
      case 'createBean':
        return api.createBean(data);
      case 'updateBean':
        return api.updateBean(data);
      // ... 其他操作
    }
  }
}

// 在Storage类中使用
export class Storage {
  private syncQueue = new SyncQueue();
  
  async createBean(bean: CoffeeBean): Promise<CoffeeBean> {
    // 立即保存到本地
    const beans = localCache.getBeans();
    const tempId = `temp-${Date.now()}`;
    const localBean = { ...bean, id: tempId, _synced: false };
    beans.push(localBean);
    localCache.saveBeans(beans);
    
    // 加入同步队列
    this.syncQueue.enqueue('createBean', bean);
    
    // 返回本地版本，稍后会被同步更新
    return localBean;
  }
  
  // 提供手动同步方法
  async syncAll(): Promise<{success: number; failed: number}> {
    // 强制处理队列中的所有操作
    let success = 0, failed = 0;
    while (this.syncQueue.getLength() > 0) {
      try {
        await this.syncQueue.processQueue();
        success++;
      } catch {
        failed++;
      }
    }
    return { success, failed };
  }
}
```

1. **实现服务器时间戳和版本控制**

在数据库表中添加 `updated_at` 和 `version` 字段：

```sql
ALTER TABLE coffee_beans 
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN version INTEGER DEFAULT 1;
```

更新API使用乐观锁：

```typescript
async updateBean(id: string, updates: Partial<CoffeeBean>, userId: string): Promise<CoffeeBean> {
  const current = await db.one(
    'SELECT * FROM coffee_beans WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  
  const result = await db.one(
    `UPDATE coffee_beans 
     SET name = $1, stock = $2, roast_date = $3, updated_at = NOW(), version = version + 1
     WHERE id = $4 AND user_id = $5 AND version = $6
     RETURNING *`,
    [updates.name, updates.stock, updates.roast_date, id, userId, current.version]
  );
  
  if (!result) {
    throw new Error('数据已被修改，请刷新后重试');
  }
  
  return result;
}
```

***

#### 5. 事务缺失导致数据不一致

**问题描述：**

- `/src/pages/tasting/record.vue` 中保存品饮记录涉及多个操作：
  1. 扣减库存
  2. 创建操作日志
  3. 创建品饮记录
- 这些操作是顺序执行的，任何一步失败都会导致数据不一致

**影响：**

- 库存扣减了但品饮记录丢失
- 日志和记录不匹配
- 数据修复困难

**修复方案：**

1. **后端实现事务性API**

创建 `/api/tasting-with-transaction.ts`：

```typescript
import { Pool } from 'pg';
import { authenticate } from './middleware/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async (req: any, res: any) => {
  await authenticate(req, res, async () => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { bean_id, dose, date, notes } = req.body;
      const userId = req.userId;
      
      // 1. 验证bean存在且属于当前用户
      const bean = await client.one(
        'SELECT id, stock FROM coffee_beans WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [bean_id, userId]
      );
      
      // 2. 检查库存是否充足
      if (bean.stock < parseFloat(dose)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '库存不足' });
      }
      
      // 3. 扣减库存
      await client.none(
        'UPDATE coffee_beans SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
        [parseFloat(dose), bean_id]
      );
      
      // 4. 创建品饮记录
      const tastingRecord = await client.one(
        `INSERT INTO tasting_records (id, user_id, bean_id, dose, date, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [uuidv4(), userId, bean_id, parseFloat(dose), date, notes || '']
      );
      
      // 5. 创建操作日志
      await client.none(
        `INSERT INTO operation_logs (id, user_id, bean_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          uuidv4(),
          userId,
          bean_id,
          'tasting',
          JSON.stringify({ dose, notes, tasting_record_id: tastingRecord.id })
        ]
      );
      
      await client.query('COMMIT');
      res.json(tastingRecord);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      res.status(500).json({ error: '操作失败，请重试' });
    } finally {
      client.release();
    }
  });
};
```

1. **前端调用事务性API**

修改 `/src/pages/tasting/record.vue`：

```typescript
const submitRecord = async () => {
  try {
    // 调用事务性API，后端保证原子性
    const record = await api.createTastingWithTransaction({
      bean_id: selectedBean.id,
      dose: doseNum,
      date: formData.date,
      notes: formData.notes
    });
    
    // 更新本地缓存
    const beans = storage.getBeans();
    const beanIndex = beans.findIndex(b => b.id === selectedBean.id);
    if (beanIndex !== -1) {
      beans[beanIndex].stock = Math.max(0, beans[beanIndex].stock - doseNum);
      storage.saveBeans(beans);
    }
    
    const records = storage.getTastingRecords();
    records.unshift(record);
    storage.saveTastingRecords(records);
    
    showSuccess('品饮记录已保存');
    navigateBack();
  } catch (error) {
    showError('保存失败：' + error.message);
  }
};
```

***

### 🟢 P2 - 中优先级（架构与代码质量）

#### 6. API安全缺陷（信任客户端传入的user\_id）

**问题描述：**

- `/api/inventory.ts` 从token解析userId，但忽略请求体中的user\_id
- 如果客户端传入不同user\_id，数据会被错误归属

**影响：**

- 恶意用户可以操纵请求体将操作归到其他用户
- 数据归属混乱

**修复方案：**

始终使用从认证中间件获取的 `req.userId`，忽略请求体中的user\_id：

```typescript
// 在 inventory.ts 的所有端点中
const userId = req.userId; // 来自认证中间件，可信

// 创建出入库记录时
await db.none(
  `INSERT INTO inventory_transactions (id, user_id, bean_id, type, quantity, notes, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
  [id, userId, bean_id, type, quantity, notes] // 使用req.userId，忽略req.body.user_id
);
```

***

#### 7. 表单验证边界情况处理不当

**问题描述：**

- `/src/pages/beans/add.vue` 中stock和roastDate的关联验证逻辑存在误导
- 允许两者都为空（stock=0, roastDate=''），但验证逻辑暗示必须同时存在

**影响：**

- 用户体验困惑
- 可能创建无效数据（有重量无烘焙日期）

**修复方案：**

明确业务规则并改进验证：

```typescript
// 业务规则：如果提供了重量（>0），必须提供烘焙日期
// 如果重量为0或未提供，烘焙日期可选

const stockNum = parseFloat(stockRaw);
const hasStock = !isNaN(stockNum) && stockNum > 0;
const hasRoastDate = roastDate !== '';

if (hasStock && !hasRoastDate) {
  errors.roastDate = '有重量的豆子必须填写烘焙日期';
}

if (!hasStock && hasRoastDate) {
  errors.stock = '有烘焙日期但没有重量，请填写重量或清除烘焙日期';
}

// 提交时再次验证
if (hasStock && hasRoastDate) {
  // 正常创建
} else if (!hasStock && !hasRoastDate) {
  // 创建无库存、无烘焙日期的豆子（允许）
  bean.stock = 0;
  bean.roastDate = null;
} else {
  // 不一致状态，阻止提交
  return;
}
```

***

### 🔵 P3 - 低优先级（优化建议）

#### 8. 技术债务与代码质量

**建议：**

1. **统一错误处理**：所有API应使用统一的错误响应格式
2. **添加请求日志**：记录所有API请求以便调试
3. **实现请求重试机制**：针对网络不稳定的场景
4. **添加单元测试**：至少覆盖核心业务逻辑
5. **代码文档化**：为复杂函数添加JSDoc注释
6. **性能监控**：添加简单的性能指标收集

***

## 重构建议

### 短期（1-2周）

1. 完成P0级修复（认证系统、数据隔离、密码安全）
2. 数据库迁移脚本测试
3. 全量回归测试

### 中期（1个月）

1. 实现同步队列和冲突解决
2. 将所有API改为事务性操作
3. 添加前端离线状态提示
4. 实现手动同步功能

### 长期（2-3个月）

1. 代码重构：提取共享逻辑，减少重复
2. 添加完整的测试套件
3. 性能优化：数据库索引、查询优化
4. 监控和告警系统

***

## 风险评估

| 风险项   | 当前状态  | 修复后       |
| ----- | ----- | --------- |
| 数据泄露  | 🔴 极高 | 🟢 低      |
| 数据不一致 | 🔴 极高 | 🟡 中      |
| 认证绕过  | 🔴 极高 | 🟢 低      |
| 生产就绪  | ❌ 否   | ⚠️ 需测试后确认 |

***

## 结论

**当前系统不适合上线生产环境**。必须至少完成P0级修复才能考虑发布。建议：

1. 立即停止使用硬编码认证
2. 完成数据库迁移，确保数据隔离
3. 全面测试事务性操作
4. 在staging环境充分验证后再部署到生产

***

*报告生成时间：2025-03-19*\
*审计工具：stepfun/step-3.5-flash:free*
