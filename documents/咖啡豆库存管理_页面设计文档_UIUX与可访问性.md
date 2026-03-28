# 页面设计文档（Desktop-first，兼容移动端）

## 全局设计（适用于所有页面）
### Layout
- Desktop-first：内容区居中，max-width 960px；两侧留白用于提升可读性。
- Mobile：满宽布局；列表/表单纵向堆叠。
- 间距体系：8/12/16/20/24；卡片间距 12–15。

### Meta Information
- Title：咖啡豆库存管理
- Description：记录咖啡豆库存、出入库与品饮。
- Open Graph：标题同上；描述同上。

### Global Styles（Design Tokens）
- 背景：#F8F8F8；卡片背景：#FFFFFF
- 主色（Primary）：#8B4513（按钮/强调数字）
- 成功（IN）：#4CD964；危险（OUT/删除）：#DD524D
- 文本：主文本 #333；次级 #666；弱化 #999
- 圆角：卡片 8；弹窗 12；主按钮 24–25
- 字体层级：24/20/18/16/14/12（标题/分组标题/正文/辅助）

### 可访问性（A11y）基线
- 触达面积：按钮/可点击行 ≥ 44px 高；列表项整行可点击。
- 对比度：主文字与背景保持清晰；仅用颜色区分状态时需附带符号/文案（如 +/−）。
- 焦点与状态：为按钮提供按下/禁用/加载态；弹窗打开时焦点顺序从标题开始，底部按钮可通过键盘访问（H5）。
- 表单：label 不依赖 placeholder；错误信息就近展示且可读。

---

## 页面 1：库存（咖啡豆库）/pages/index/index
### Page Structure
- 顶部区（标题 + 主行动）
- 概览区（轻量指标）
- 列表区（卡片列表，可滚动）

### Sections & Components
1. Header（Flex 横向）
   - 左：标题“我的咖啡豆库”（H1/20–24）
   - 右：Primary Button“新增豆子”（14–16，圆角胶囊）
2. 概览区（新）
   - 两个小卡片/一行文本：豆子数量、总库存 g（增强信息层级：先总览后明细）
3. Bean Card（卡片信息层级）
   - 第一行：豆名（18，semibold）
   - 第二行：产地 · 烘焙度（14，#666）
   - 右侧：库存数字（20，Primary）+ 单位（12，#999）
4. 快捷操作面板（替代纯 ActionSheet 的可发现性方案）
   - 打开方式：点卡片 → 底部弹出
   - 按钮：入库、出库、品饮记录、删除（删除为危险样式 + 二次确认）

### Responsive
- Desktop：卡片列表可两列 Grid（gap 16）；Header 与概览区固定宽度居中。
- Mobile：单列；滚动区高度跟随视口。

---

## 页面 2：添加咖啡豆 /pages/beans/add
### Page Structure
- 表单纵向堆叠（单列），分组清晰
- 底部固定主按钮（可选，若不固定则在末尾明显位置）

### Sections & Components
1. Form Group（统一样式）
   - Label（14–16，#333，点击可聚焦输入框）
   - Input（高度 44，圆角 8，边框浅灰）
2. Picker（烘焙程度/处理方式）
   - 视觉一致：与 input 同高度与边框
   - “其他”时出现补充输入框（与上一项距离 10–12）
3. 校验与错误提示
   - 名称必填：在字段下方展示错误文本（而非仅 Toast）
   - 数字输入：限制为非负；显示单位提示（g）
4. 保存按钮
   - Primary；提供 loading/disabled 防止重复提交

### Accessibility
- placeholder 仅作示例，不替代 label。
- 错误信息明确可读：如“咖啡豆名称不能为空”。

---

## 页面 3：出入库记录 /pages/inventory/log
### Page Structure
- 列表页（时间倒序），信息密度中等

### Sections & Components
1. Log Card
   - 左：豆名（16）+ 时间（12，#999）
   - 右：数量（18，bold）
   - 状态：IN 用绿色 + “+”；OUT 用红色 + “−”
2. 空状态
   - 文案简短；可加引导：回库存页进行入/出库

### Accessibility
- 不只靠颜色表达 IN/OUT（符号与文案同时存在）。

---

## 页面 4：品饮记录 /pages/tasting/record
### Page Structure
- 顶部区（当前豆/全部记录状态）
- 列表区（卡片）
- 新增记录弹窗（覆盖层 + 内容区可滚动 + 底部操作区）

### Sections & Components
1. Header
   - 有选豆：显示“品饮: 豆名” + Primary“添加记录”
   - 无选豆：显示“所有品饮记录” +（建议新增）“选择豆子”入口（避免隐式筛选来源不明）
2. Record Card
   - 顶部：日期（12，#999）与评分（星级文本）
   - 中部：冲煮关键字段（dose/ratio/method/temp）以“·”分隔，缺失显示“−”
   - 底部：心得（可选，弱化色 + 分隔线）
3. Add Modal
   - 标题居中；内容区 scroll-view；底部固定取消/保存
   - 表单顺序：dose→method→ratio→temp→grind→rating→notes

### Accessibility
- 弹窗打开后：提供明确“取消”关闭路径；标题清晰。
- slider 显示当前值（已开启 show-value），保存失败/缺少豆时提示应可读。
