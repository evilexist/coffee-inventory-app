/**
 * 统一 API 错误类
 * 用于标准化 API 错误处理
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toString(): string {
    return `[${this.status}] ${this.code}: ${this.message}`;
  }
}

/**
 * 处理 HTTP 响应，统一错误抛出
 */
export async function handleApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type');
  let data: any = {};

  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok) {
    // 统一处理未认证：token 过期或无效时清理本地登录态并跳转登录页
    if (res.status === 401) {
      forceLogout();
    }

    const error = new ApiError(
      res.status,
      data.error_code || data.code || 'UNKNOWN_ERROR',
      data.error || data.message || res.statusText || '请求失败',
      data
    );
    throw error;
  }

  return data as T;
}

// 主动清除登录态并跳转登录页（避免与 auth.ts 循环依赖，直接使用 uni API）
function forceLogout(): void {
  try {
    uni.removeStorageSync('auth_token');
    uni.removeStorageSync('user_info');
  } catch (e) {
    console.error('清理登录态失败:', e);
  }

  // 只在非登录页时跳转，避免重复跳转
  try {
    const pages = getCurrentPages();
    const current: any = pages[pages.length - 1];
    const currentRoute = current?.route || '';
    if (currentRoute && currentRoute !== 'pages/login/index') {
      uni.reLaunch({ url: '/pages/login/index' });
    }
  } catch (e) {
    console.warn('自动跳转登录页失败:', e);
  }
}

/**
 * 安全地解析 JSON，失败时返回空对象
 */
export function safeJsonParse(text: string, fallback: any = {}): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
