import { VercelRequest, VercelResponse } from '@vercel/node';

// 扩展VercelRequest类型，添加认证中间件附加的属性
declare module '@vercel/node' {
  interface VercelRequest {
    userId?: string;
    user?: any;
  }
}

// 为neon sql函数提供更宽松的类型定义，避免模板字符串调用的类型错误
declare module '@neondatabase/serverless' {
  interface NeonQueryFunction<ArrayMode extends boolean = false, FullResults extends boolean = false> {
    (strings: TemplateStringsArray, ...params: any[]): any;
  }
}
