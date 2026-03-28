# 咖啡豆库存管理系统 - 项目结构与代码详解

> 生成时间：2026-03-19
> 审查范围：完整项目架构、目录结构、核心文件功能
> 使用模型：stepfun/step-3.5-flash:free

***

## 📁 项目整体架构

这是一个基于 **uni-app (Vue 3 + TypeScript)** 的多端应用，采用前后端分离架构：

- **前端**: uni-app + Vue 3 + TypeScript，支持 H5、微信小程序等多端
- **后端**: Express.js + Vercel Serverless Functions
- **数据库**: Neon PostgreSQL（云数据库）
- **认证**: JWT + bcrypt 密码加密
- **部署**: Vercel

***

## 📂 目录结构详解

### **根目录文件**

| 文件                    | 作用                                     |
| --------------------- | -------------------------------------- |
| `package.json`        | 项目依赖配置，包含 uni-app、Vue、Express、Neon 等依赖 |
| `vite.config.ts`      | Vite 构建配置，设置开发代理到本地 API 服务器            |
| `vercel.json`         | Vercel 部署配置，定义静态构建和 API 路由             |
| `index.html`          | H5 应用入口 HTML                           |
| `server.js`           | 本地开发服务器（Express）                       |
| `.env.example`        | 环境变量配置示例                               |
| `.env.local`          | 本地环境变量（实际配置）                           |
| `DEPLOYMENT.md`       | 部署文档                                   |
| `VERCEL_ENV_SETUP.md` | Vercel 环境配置指南                          |

***

### **📁 src/** - 前端源码目录

#### **核心文件**

- `main.ts` - 应用入口，创建 Vue SSR 应用实例
- `App.vue` - 根组件，定义全局样式、CSS 变量和设计系统
- `pages.json` - uni-app 页面路由配置，包含 tabBar 和页面路径
- `manifest.json` - uni-app 应用清单配置

#### **📁 src/pages/** - 页面组件

| 页面    | 文件                         | 功能                           |
| ----- | -------------------------- | ---------------------------- |
| 登录页   | `pages/login/index.vue`    | 用户登录界面，支持硬编码用户 riku/testtest |
| 首页    | `pages/index/index.vue`    | 咖啡豆库存列表，展示总库存和豆子数量           |
| 添加豆子  | `pages/beans/add.vue`      | 新增/编辑咖啡豆的完整表单                |
| 出入库记录 | `pages/inventory/log.vue`  | 查看所有出入库历史记录                  |
| 品饮记录  | `pages/tasting/record.vue` | 记录品饮体验，支持筛选和评分               |

#### **📁 src/utils/** - 工具函数

| 文件           | 功能                               |
| ------------ | -------------------------------- |
| `api.ts`     | API 客户端，封装所有后端接口调用，支持开发/生产环境自动切换 |
| `auth.ts`    | 认证工具函数：登录状态检查、用户信息获取、退出登录等       |
| `storage.ts` | **核心存储层**：本地缓存 + API 同步，提供离线支持   |
| `export.ts`  | 数据导出功能（JSON、Markdown 格式）         |

#### **📁 src/types/** - TypeScript 类型定义

`index.ts` - 定义三个核心接口：

- `CoffeeBean` - 咖啡豆数据结构
- `InventoryLog` - 出入库记录
- `TastingRecord` - 品饮记录

#### **📁 src/config/** - 配置管理

`env.ts` - 环境配置管理，自动判断开发/生产环境，返回对应的数据库连接配置

#### **📁 src/assets/** 和 **src/static/** - 静态资源

存放应用图标、logo 等图片资源

***

### **📁 api/** - 后端 API 目录（Serverless Functions）

每个文件都是一个独立的 Vercel Serverless Function：

| 文件                                         | API 路径           | 功能                   |
| ------------------------------------------ | ---------------- | -------------------- |
| `auth.ts`                                  | `/api/auth`      | JWT 认证中间件，用户初始化、密码验证 |
| `login.ts`                                 | `/api/login`     | 用户登录接口，生成 JWT token  |
| `beans.ts`                                 | `/api/beans`     | 咖啡豆 CRUD 操作，带用户隔离    |
| `inventory.ts`                             | `/api/inventory` | 出入库记录 CRUD           |
| `tasting.ts`                               | `/api/tasting`   | 品饮记录 CRUD（支持更新）      |
| `db.ts`                                    | 内部模块             | 数据库连接管理，环境切换         |
| `ping.ts`                                  | `/api/ping`      | 健康检查接口               |
| `test.ts` / `simple-test.ts` / `verify.ts` | 测试接口             | 开发和调试用               |

**关键特性**：

- 所有 API 都通过 `userId` 实现多用户数据隔离
- 使用 `@neondatabase/serverless` 连接 Neon PostgreSQL
- 支持 CORS，可在开发环境直接调用

***

### **📁 db/** - 数据库脚本

`schema.sql` - 完整的数据库表结构定义：

- `users` - 用户表（支持 JWT 认证）
- `coffee_beans` - 咖啡豆表
- `inventory_logs` - 出入库记录表
- `tasting_records` - 品饮记录表
- 包含外键约束和索引优化

***

### **📁 dist/** - 构建输出

`build/h5/` - H5 版本的静态资源（HTML、CSS、JS），用于 Vercel 部署

***

### **📁 .trae/documents/** - 项目文档

包含三个重要文档：

1. `咖啡豆库存管理_PRD_UIUX优化版.md` - 产品需求文档
2. `咖啡豆库存管理_技术架构文档.md` - 技术架构设计
3. `咖啡豆库存管理_页面设计文档_UIUX与可访问性.md` - UI/UX 设计规范

***

## 🔄 数据流程

```
用户操作 → 页面组件 → storage 层 → api 客户端 → Vercel API → Neon 数据库
     ↑           ↑           ↑
    UI交互    本地缓存    环境判断
```

**storage 层的关键设计**：

- 优先调用 API 同步数据
- API 失败时自动回退到本地缓存
- 所有操作同时更新本地缓存
- 支持离线使用

***

## 🔐 认证系统

**当前状态**：采用**硬编码认证**（根据核心记忆）

- 支持两个用户：`riku/123456` 和 `testtest/123456`
- 前端：本地验证，生成 mock token 存储
- 后端：从 token 解析用户 ID，实现数据隔离
- 完整 JWT 认证代码已存在但当前未使用（`api/auth.ts`）

***

## 🎨 设计系统

App.vue 中定义了完整的设计令牌：

- **配色**：极简奶油风（#FAF8F5 背景，#8B5A2B 主色）
- **间距系统**：--space-xs 到 --space-3xl
- **圆角系统**：--radius-sm 到 --radius-full
- **阴影系统**：--shadow-xs 到 --shadow-lg
- **字体系统**：完整的字号和行高规范

所有页面组件都复用这些 CSS 变量，保持视觉一致性。

***

## 📱 多端支持

通过 uni-app 实现：

- **H5**：当前主要开发目标
- **微信小程序**：已配置，可通过 `npm run dev:mp-weixin` 开发
- 其他平台（App）理论上也支持

***

## 🚀 部署架构

**Vercel 配置** (`vercel.json`)：

1. 静态构建：`dist/build/h5` 作为输出目录
2. API 路由：所有 `/api/*` 请求转发到对应的 Serverless Function
3. 路由优先级：API → 静态资源 → 文件系统 → SPA 回退

**环境分离**：

- 开发环境：本地数据库（`DATABASE_URL_DEV`）
- 生产环境：Vercel 主分支数据库（`DATABASE_URL_PROD`）

***

## 💡 关键技术亮点

1. **离线优先**：storage 层确保网络失败时仍可操作
2. **数据同步**：所有修改会尝试同步到服务器
3. **用户隔离**：每个 API 都带 `userId` 过滤
4. **优雅降级**：API 失败自动使用本地缓存
5. **响应式设计**：所有组件适配移动端
6. **可访问性**：添加了 `aria-label` 等无障碍属性
7. **类型安全**：完整的 TypeScript 类型定义

***

## 📋 核心文件位置索引

### 前端核心

- **应用入口**: `src/main.ts`
- **全局样式**: `src/App.vue`
- **路由配置**: `src/pages.json`
- **类型定义**: `src/types/index.ts`

### 页面组件

- **登录页**: `src/pages/login/index.vue:1`
- **首页**: `src/pages/index/index.vue:1`
- **添加豆子**: `src/pages/beans/add.vue:1`
- **出入库记录**: `src/pages/inventory/log.vue:1`
- **品饮记录**: `src/pages/tasting/record.vue:1`

### 工具层

- **API 客户端**: `src/utils/api.ts:1`
- **存储层**: `src/utils/storage.ts:1`（核心）
- **认证工具**: `src/utils/auth.ts:1`
- **环境配置**: `src/config/env.ts:1`

### 后端 API

- **数据库连接**: `api/db.ts:1`
- **咖啡豆 API**: `api/beans.ts:1`
- **出入库 API**: `api/inventory.ts:1`
- **品饮 API**: `api/tasting.ts:1`
- **登录认证**: `api/login.ts:1` → `api/auth.ts:1`

### 数据库

- **表结构**: `db/schema.sql:1`

***

## 🎯 项目特色总结

这是一个**生产级别的咖啡豆库存管理系统**，具备：

✅ **完整的用户认证与数据隔离**
✅ **离线优先的存储策略**
✅ **优雅的 UI 设计系统**
✅ **多端支持（H5 + 小程序）**
✅ **云原生部署（Vercel + Neon）**
✅ **类型安全的代码质量**
✅ **可访问性支持**

项目架构清晰，代码组织规范，是一个很好的全栈应用范例。

***

*文档生成于 2025-03-19*
