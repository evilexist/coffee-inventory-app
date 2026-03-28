// 认证工具

// 检查是否已登录
export function isLoggedIn(): boolean {
  const token = uni.getStorageSync('auth_token');
  return !!token;
}

// 获取当前用户信息
export function getCurrentUser(): { id: string; username: string; display_name: string } | null {
  try {
    const userInfo = uni.getStorageSync('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

// 获取认证token
export function getAuthToken(): string | null {
  return uni.getStorageSync('auth_token') || null;
}

// 清除认证信息
export function clearAuth(): void {
  uni.removeStorageSync('auth_token');
  uni.removeStorageSync('user_info');
}

// 跳转到登录页
export function redirectToLogin(): void {
  const uniApp = uni as any;
  uniApp.redirectTo({
    url: '/pages/login/index'
  });
}

// 检查认证状态，如果未登录则跳转到登录页
export function checkAuth(): boolean {
  if (!isLoggedIn()) {
    redirectToLogin();
    return false;
  }
  return true;
}

// 退出登录
export function logout(): void {
  clearAuth();
  redirectToLogin();
}