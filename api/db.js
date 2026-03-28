"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_1 = require("@neondatabase/serverless");
const dotenv = __importStar(require("dotenv"));
// 加载环境变量
dotenv.config({ path: '.env.local' });
// 获取当前环境
function getCurrentEnvironment() {
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    if (process.env.VERCEL_ENV === 'production') {
        return 'production';
    }
    return 'development';
}
// 获取数据库连接URL
function getDatabaseUrl() {
    const env = getCurrentEnvironment();
    if (env === 'production') {
        return process.env.DATABASE_URL_PROD || process.env.DATABASE_URL || '';
    }
    else {
        return process.env.DATABASE_URL_DEV || process.env.DATABASE_URL || '';
    }
}
// 创建数据库连接
const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
    console.error('❌ 数据库连接URL未配置');
    console.error('请检查环境变量:');
    console.error('- 开发环境: DATABASE_URL_DEV');
    console.error('- 生产环境: DATABASE_URL_PROD');
    console.error('- 通用: DATABASE_URL');
}
// 使用neon创建SQL函数
const sql = (0, serverless_1.neon)(databaseUrl);
// 开发环境日志
if (getCurrentEnvironment() === 'development') {
    console.log('🔧 数据库环境配置:');
    console.log('  环境:', getCurrentEnvironment());
    console.log('  数据库URL:', databaseUrl.replace(/:[^@]+@/, ':***@'));
}
exports.default = sql;
//# sourceMappingURL=db.js.map