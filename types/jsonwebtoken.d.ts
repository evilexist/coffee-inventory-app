// 为 jsonwebtoken 提供类型声明
// 因为 jsonwebtoken 包本身不包含TypeScript类型定义

declare module 'jsonwebtoken' {
  export function sign(
    payload: object | string,
    secret: string | Buffer,
    options?: jwt.SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: jwt.VerifyOptions
  ): any;

  export function decode(
    token: string,
    options?: jwt.DecodeOptions
  ): jwt.JwtPayload | null;

  export namespace jwt {
    export interface SignOptions {
      algorithm?: string;
      expiresIn?: string | number;
      notBefore?: string | number;
      audience?: string | string[];
      issuer?: string;
      subject?: string;
      noTimestamp?: boolean;
      header?: object;
    }

    export interface VerifyOptions {
      algorithms?: string[];
      audience?: string | string[];
      issuer?: string | string[];
      subject?: string;
      clockTimestamp?: number;
      clockTolerance?: number;
      maxAge?: string | number;
      nonce?: string;
    }

    export interface DecodeOptions {
      complete?: boolean;
    }

    export interface JwtPayload {
      [key: string]: any;
      userId?: string;
      username?: string;
      iat?: number;
      exp?: number;
      iss?: string;
      aud?: string;
      sub?: string;
    }
  }
}

export {};