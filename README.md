# 咖啡 Bean 库存管理应用

一个基于 Uni-app 开发的咖啡豆库存管理应用，支持 H5 和小程序平台。

## 功能特性

- ☕ **咖啡豆库存管理**：添加、查看、编辑咖啡豆信息
- 📊 **出入库记录**：完整的库存流水追踪
- 👅 **品饮记录**：记录品尝体验和评分
- 🔐 **用户认证**：基于 JWT 的身份验证
- 🗄️ **数据持久化**：本地存储 + PostgreSQL 数据库

## 技术栈

- **前端框架**：Vue 3 + Uni-app 3
- **开发语言**：TypeScript
- **构建工具**：Vite 4
- **后端**：Node.js + Express
- **数据库**：PostgreSQL (Neon)
- **部署平台**：Vercel

## 项目结构

```
coffee-inventory-app/
├── api/              # 后端 API 路由
│   ├── auth/         # 认证相关
│   ├── beans.js      # 咖啡豆管理
│   ├── inventory.js  # 出入库记录
│   └── tasting.js    # 品饮记录
├── src/              # 前端源码
│   ├── pages/        # 页面组件
│   ├── utils/        # 工具函数
│   └── types/        # TypeScript 类型定义
├── db/               # 数据库迁移和 schema
├── documents/        # 项目文档
└── dist/             # 构建输出（忽略）
```

## 快速开始

### 环境要求

- Node.js 16+
- npm 或 yarn
- PostgreSQL 数据库（推荐使用 [Neon](https://neon.tech)）

### 本地开发

1. 克隆项目
```bash
git clone <your-repo-url>
cd coffee-inventory-app
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local，填入实际的数据库连接信息和 JWT 密钥
```

4. 启动开发服务器
```bash
npm run dev
```

5. 访问应用
- H5 端：http://localhost:5173
- 微信小程序：使用微信开发者工具打开 `dist/dev/mp-weixin`

### 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/build/h5` 目录。

## 部署到 Vercel

1. Fork 或克隆此仓库到你的 GitHub 账户

2. 在 Vercel 中导入项目
   - 访问 [Vercel](https://vercel.com) 并登录
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 配置环境变量（参考 `.env.example`）

3. 配置数据库
   - 创建 Neon PostgreSQL 数据库
   - 运行 `db/schema.sql` 中的 SQL 创建表结构
   - 在 Vercel 环境变量中配置 `DATABASE_URL_PROD`

4. 部署
   - Vercel 会自动检测到 `vercel.json` 配置
   - 点击 "Deploy" 完成部署

## 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | 是 |
| `DATABASE_URL_PROD` | 生产数据库连接 URL | 是 |
| `JWT_SECRET` | JWT 签名密钥（建议使用强随机字符串） | 是 |
| `USERS_CONFIG` | 用户配置（格式：username:password:display_name;...） | 是 |

详细配置请参考 [.env.example](.env.example) 文件。

## API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录

### 咖啡豆管理
- `GET /api/beans` - 获取咖啡豆列表
- `POST /api/beans` - 添加咖啡豆
- `PUT /api/beans/:id` - 更新咖啡豆
- `DELETE /api/beans/:id` - 删除咖啡豆

### 出入库记录
- `GET /api/inventory` - 获取出入库记录
- `POST /api/inventory` - 创建出入库记录

### 品饮记录
- `GET /api/tasting` - 获取品饮记录
- `POST /api/tasting` - 创建品饮记录

## 数据库表结构

项目包含以下主要数据表：

- `coffee_beans` - 咖啡豆基本信息
- `inventory_logs` - 出入库流水
- `tasting_records` - 品饮记录

详见 [db/schema.sql](db/schema.sql)。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

如有问题或建议，请提交 [Issue](https://github.com/your-username/coffee-inventory-app/issues)。

---

**注意**：本项目为个人学习项目，生产环境使用前请确保做好安全配置和测试。
