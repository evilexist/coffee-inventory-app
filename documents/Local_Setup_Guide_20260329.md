# 咖啡豆库存管理系统 - 本地运行指南

**文档版本**: 1.0.0
**生成日期**: 2026年3月29日
**撰写模型**: stepfunn/step-3.5-flash:free

---

## 一、准备工作（环境要求）

### 1.1 安装 Node.js

你的电脑需要安装 **Node.js**（一个JavaScript运行环境）。

**安装步骤**：

1. 打开浏览器，访问 https://nodejs.org
2. 点击绿色大按钮 **"Download Node.js (LTS)"**（建议下载LTS版本）
3. 下载完成后，双击安装包
4. 按照安装向导一步步点击"下一步"即可
5. 安装完成后，**重启电脑**

**验证安装是否成功**：

1. 按 `Win + R`（Windows）或打开"终端"（Mac）
2. 输入以下命令并按回车：
   ```bash
   node --version
   ```
3. 如果看到类似 `v18.x.x` 或 `v20.x.x` 的版本号，说明安装成功

---

### 1.2 安装代码编辑器（可选但推荐）

推荐使用 **Visual Studio Code**（免费）：

1. 访问 https://code.visualstudio.com
2. 下载并安装
3. 这个编辑器可以让你更方便地查看和修改代码

---

## 二、获取项目代码

### 2.1 下载项目文件

如果你已经有项目文件夹（`coffee-inventory-app`），可以跳过此步骤。

如果没有，你需要：

**方法A：使用Git（推荐）**
1. 安装 Git：https://git-scm.com/downloads
2. 打开终端（Mac）或命令提示符（Windows）
3. 输入：
   ```bash
   git clone <你的仓库地址>
   cd coffee-inventory-app
   ```

**方法B：直接下载ZIP**
1. 在GitHub上找到项目
2. 点击绿色的"Code"按钮
3. 选择"Download ZIP"
4. 解压到你的电脑，比如 `D:\projects\coffee-inventory-app`

---

## 三、安装项目依赖

### 3.1 打开终端

1. **Windows**：按 `Win + R`，输入 `cmd`，回车
2. **Mac**：打开"终端"应用（在"应用程序"→"实用工具"里）

### 3.2 进入项目目录

在终端中输入（根据你的实际路径调整）：
```bash
cd /Users/liuzhao/Documents/coffee-inventory-app
```
或者Windows用户：
```bash
cd D:\projects\coffee-inventory-app
```

### 3.3 安装依赖包

输入以下命令，等待安装完成（可能需要1-3分钟）：
```bash
npm install
```

**注意**：如果看到很多 `WARN` 警告，是正常的，只要没有 `ERROR` 就行。

---

## 四、配置数据库连接

### 4.1 了解数据库配置

项目已经配置好了云数据库（Neon PostgreSQL），你只需要确认配置文件正确。

### 4.2 检查环境配置文件

1. 在项目文件夹中，找到 `.env.local` 文件
2. 用记事本或VS Code打开它
3. 确认以下内容存在（应该已经配置好了）：
   ```
   DATABASE_URL_DEV=postgresql://...
   JWT_SECRET=...
   USERS_CONFIG=...
   ```

**重要**：如果 `.env.local` 文件不存在，你需要复制 `.env.example` 并重命名为 `.env.local`，然后填入实际的数据库信息。

---

## 五、启动后端API服务器

### 5.1 什么是后端API服务器？

这是一个运行在电脑上的"后台程序"，负责处理数据存储、用户登录等操作。前端（浏览器界面）通过它来存取数据。

### 5.2 启动步骤

1. **确保你在项目目录下**（终端中应该显示项目路径）
2. 输入以下命令启动服务器：
   ```bash
   node server.js
   ```

3. 看到以下输出说明启动成功：
   ```
   Server is running on port 3000
   Database connected successfully
   Database initialized
   Initialized users: riku, testtest, guest
   ```

4. **重要**：保持这个终端窗口**不要关闭**！服务器会一直运行。

---

## 六、启动前端开发服务器

### 6.1 打开第二个终端窗口

因为第一个终端已经在运行服务器，你需要再开一个新的终端窗口。

**方法**：
- **Mac**：打开一个新的"终端"应用
- **Windows**：再次按 `Win + R`，输入 `cmd`，回车

### 6.2 进入项目目录

同样输入：
```bash
cd /Users/liuzhao/Documents/coffee-inventory-app
```

### 6.3 启动前端开发服务器

输入命令：
```bash
npm run dev
```

**等待编译**：第一次启动可能需要30秒到1分钟，你会看到很多编译信息。

### 6.4 看到成功信息

当看到类似以下输出时，说明启动成功：
```
  VITE v4.2.1  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 七、使用浏览器测试

### 7.1 打开浏览器

1. 打开 **Chrome** 或 **Edge** 浏览器（推荐Chrome）
2. 在地址栏输入：`http://localhost:5173`
3. 按回车

### 7.2 你应该看到什么？

- 页面会显示**登录界面**
- 输入框和登录按钮
- 如果有任何错误，会在页面顶部显示红色错误信息

### 7.3 登录测试

使用以下测试账号登录：

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `riku` | `123456` | 普通用户 |
| `testtest` | `123456` | 测试用户 |
| `guest` | `123456` | 访客用户 |

**登录步骤**：
1. 在"用户名"框输入 `riku`
2. 在"密码"框输入 `123456`
3. 点击"登录"按钮
4. 如果成功，会跳转到"库存"页面

---

## 八、常见问题与解决

### 8.1 问题：`npm install` 报错

**可能原因**：网络问题或Node.js版本过低

**解决方法**：
1. 确认Node.js版本 ≥ 16：`node --version`
2. 如果版本过低，去 https://nodejs.org 下载LTS版本重新安装
3. 使用淘宝镜像加速：`npm config set registry https://registry.npmmirror.com`

---

### 8.2 问题：`node server.js` 报错 "Cannot find module"

**可能原因**：依赖包没有安装完整

**解决方法**：
```bash
npm install
```
重新安装所有依赖，然后再试一次。

---

### 8.3 问题：数据库连接失败

**错误信息**：`Database connection failed` 或 `password authentication failed`

**可能原因**：
1. `.env.local` 文件配置错误
2. 数据库URL已过期（Neon免费数据库有有效期）

**解决方法**：
1. 检查 `.env.local` 文件中的 `DATABASE_URL_DEV` 是否正确
2. 如果数据库过期，需要去Neon控制台重新复制连接URL
3. 更新 `.env.local` 文件后，重启服务器

---

### 8.4 问题：前端启动后，浏览器显示空白或报错

**可能原因**：端口被占用

**解决方法**：
1. 查看哪个进程占用了5173端口
2. 或者修改端口：`npm run dev -- --port 5174`
3. 然后访问 `http://localhost:5174`

---

### 8.5 问题：登录后跳转失败

**可能原因**：后端API服务器没有运行

**解决方法**：
1. 确认第一个终端窗口中 `node server.js` 仍在运行
2. 如果没有，回到**第五步**重新启动
3. 刷新浏览器页面，重新登录

---

## 九、如何停止服务

### 9.1 停止前端服务器

在运行 `npm run dev` 的终端窗口中：
- **Mac/Linux**：按 `Ctrl + C`
- **Windows**：按 `Ctrl + C` 或关闭终端窗口

### 9.2 停止后端服务器

在运行 `node server.js` 的终端窗口中：
- **Mac/Linux**：按 `Ctrl + C`
- **Windows**：按 `Ctrl + C` 或关闭终端窗口

---

## 十、开发工作流（推荐）

### 10.1 日常开发步骤

1. **启动后端**（第一个终端）：
   ```bash
   node server.js
   ```

2. **启动前端**（第二个终端）：
   ```bash
   npm run dev
   ```

3. **打开浏览器**：访问 `http://localhost:5173`

4. **修改代码**：用VS Code编辑文件，保存后前端会自动刷新

5. **测试功能**：在浏览器中测试你修改的功能

6. **停止服务**：完成测试后，分别按 `Ctrl + C` 停止两个服务

---

### 10.2 修改代码后如何看到效果？

- **前端代码**（`.vue` 文件）：保存后浏览器**自动刷新**
- **后端代码**（`server.js` 或 `api/` 文件）：需要**重启后端服务器**
  - 按 `Ctrl + C` 停止
  - 重新输入 `node server.js` 启动

---

## 十一、项目结构说明

```
coffee-inventory-app/
├── src/                    # 前端源码
│   ├── pages/             # 页面文件
│   │   ├── login/         # 登录页
│   │   ├── index/         # 库存页
│   │   ├── tasting/       # 品饮页
│   │   └── inventory/     # 出入库记录页
│   ├── utils/             # 工具函数
│   └── App.vue            # 根组件
├── api/                   # 后端API路由（Vercel Serverless函数）
├── server.js              # Express服务器（本地开发用）
├── .env.local             # 环境变量配置（重要！）
├── package.json           # 项目依赖配置
├── pages.json             # 页面路由和tabBar配置
└── documents/             # 项目文档
```

---

## 十二、测试账号清单

| 用户名 | 密码 | 角色 |
|--------|------|------|
| riku | 123456 | 管理员 |
| testtest | 123456 | 测试用户 |
| guest | 123456 | 访客 |

---

## 十三、技术支持

如果遇到问题：

1. **查看错误信息**：终端和浏览器会显示错误，仔细阅读
2. **检查端口**：确保3000（后端）和5173（前端）没有被其他程序占用
3. **确认服务状态**：两个终端都要在运行
4. **查看文档**：`documents/` 目录下有更多技术文档

---

## 附录：快速启动命令清单

```bash
# 1. 安装依赖（第一次或更新依赖后）
npm install

# 2. 启动后端服务器（终端1）
node server.js

# 3. 启动前端开发服务器（终端2）
npm run dev

# 4. 浏览器访问
http://localhost:5173

# 5. 停止服务（两个终端分别按）
Ctrl + C
```

---

**祝你使用愉快！** 🎉

如有问题，欢迎反馈。
