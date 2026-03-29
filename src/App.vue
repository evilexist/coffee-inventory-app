<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
:root {
  /* 极简奶油风配色 */
  --bg: #FAF8F5;
  --bg-warm: #F5F0E8;
  --card: #FFFFFF;
  --card-hover: #FEFCF9;
  --text: #3D3229;
  --text-muted: #6B5B4F;
  --text-subtle: #9C8B7E;
  --border: #E8E0D5;
  --border-light: #F0EBE3;
  --primary: #8B5A2B;
  --primary-light: #A67C52;
  --primary-dark: #6B4423;
  --success: #7D9B76;
  --danger: #C17B6E;
  --danger-light: #E8A598;
  --accent: #D4A574;
  
  /* 间距系统 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 24px;
  --space-3xl: 32px;
  
  /* 圆角系统 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  /* 阴影系统 */
  --shadow-xs: 0 1px 2px rgba(139, 90, 43, 0.04);
  --shadow-sm: 0 2px 8px rgba(139, 90, 43, 0.06);
  --shadow-md: 0 4px 12px rgba(139, 90, 43, 0.08);
  --shadow-lg: 0 8px 24px rgba(139, 90, 43, 0.12);
  
  /* 字体系统 */
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 20px;
  --font-size-3xl: 24px;
  --font-size-4xl: 28px;
  
  /* 过渡动画 */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.35s ease;
}

/* 全局 box-sizing 设置 - 行业最佳实践 */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.page {
  min-height: 100vh;
  padding: var(--space-xl);
  box-sizing: border-box;
  background: var(--bg);
  padding-bottom: calc(var(--space-xl) + env(safe-area-inset-bottom));
}

.page-inner {
  max-width: 960px;
  margin: 0 auto;
}

.card {
  background: var(--card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.h1 {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.5px;
}

.h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
}

.body {
  font-size: var(--font-size-md);
  color: var(--text);
}

.caption {
  font-size: var(--font-size-sm);
  color: var(--text-subtle);
  font-weight: 500;
}

.text-muted {
  color: var(--text-muted);
}

.text-subtle {
  color: var(--text-subtle);
}

.btn {
  height: 48px;
  line-height: 48px;
  padding: 0 var(--space-xl);
  border-radius: var(--radius-full);
  font-size: var(--font-size-md);
  font-weight: 600;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  min-width: 72px;
  text-overflow: ellipsis;
  overflow: hidden;
  border: none;
  cursor: pointer;
  transition: all var(--transition-normal);
  letter-spacing: 0.3px;
}

.btn:active {
  transform: scale(0.98);
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(139, 90, 43, 0.25);
}

.btn-primary:hover {
  box-shadow: 0 6px 16px rgba(139, 90, 43, 0.35);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-danger {
  background: linear-gradient(135deg, var(--danger) 0%, var(--danger-light) 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(193, 123, 110, 0.25);
}

.btn-danger-ghost {
  background: var(--card);
  color: var(--danger);
  border: 1.5px solid var(--danger-light);
  box-shadow: var(--shadow-xs);
}

.btn-danger-ghost:hover {
  background: #FFF5F3;
  border-color: var(--danger);
}

.btn-ghost {
  background: var(--card);
  color: var(--text);
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-xs);
}

.btn-ghost:hover {
  background: var(--bg-warm);
  border-color: var(--primary-light);
  color: var(--primary);
}

.empty-state {
  text-align: center;
  margin-top: 80px;
  color: var(--text-subtle);
  padding: var(--space-3xl);
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-subtle);
}

/* 输入框全局样式 */
input, textarea, select {
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: var(--text);
}

input::placeholder, textarea::placeholder {
  color: var(--text-subtle);
  font-weight: 400;
}

.uni-tabbar {
  border-top: 1px solid #f7f7f7;
}
</style>
