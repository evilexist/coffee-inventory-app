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
