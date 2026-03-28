"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    return res.status(200).json({
        success: true,
        message: 'API测试成功',
        method: req.method,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
}
//# sourceMappingURL=test.js.map