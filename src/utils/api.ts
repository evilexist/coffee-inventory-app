import { CoffeeBean, InventoryLog, TastingRecord } from '../types';
import { handleApiResponse, ApiError } from './error';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = uni.getStorageSync('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export const api = {
  // 用户认证相关 - 使用JWT
  async login(username: string, password: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: '登录失败' }));
        return { success: false, error: error.error || '登录失败' };
      }
      
      const data = await res.json();
      return { success: true, token: data.token, user: data.user };
    } catch (error) {
      console.error('登录请求失败:', error);
      return { success: false, error: '网络错误，请检查连接' };
    }
  },

  async verifyToken(): Promise<any> {
    const token = uni.getStorageSync('auth_token');
    if (!token) {
      return { success: false };
    }
    
    try {
      const res = await fetch(`${API_BASE}/auth/verify-token`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        return { success: false };
      }
      
      const data = await res.json();
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Token验证失败:', error);
      return { success: false };
    }
  },

  // 咖啡豆相关
  async getBeans(): Promise<CoffeeBean[]> {
    const res = await fetch(`${API_BASE}/beans`, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse<CoffeeBean[]>(res);
  },

  async getBeanById(id: string): Promise<CoffeeBean> {
    const res = await fetch(`${API_BASE}/beans?id=${id}`, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse<CoffeeBean>(res);
  },

  async createBean(bean: CoffeeBean): Promise<CoffeeBean> {
    const res = await fetch(`${API_BASE}/beans`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bean),
    });
    return handleApiResponse<CoffeeBean>(res);
  },

  async updateBean(bean: CoffeeBean): Promise<CoffeeBean> {
    const res = await fetch(`${API_BASE}/beans?id=${bean.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bean),
    });
    return handleApiResponse<CoffeeBean>(res);
  },

  async deleteBean(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/beans?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, 'DELETE_FAILED', 'Failed to delete bean');
  },

  // 原子更新库存
  async updateBeanStock(beanId: string, amount: number): Promise<{ success: boolean; stock?: number; error?: string }> {
    const res = await fetch(`${API_BASE}/beans?id=${beanId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || '更新库存失败', stock: data.stock };
    }
    
    const data = await res.json();
    return { success: true, stock: data.stock };
  },

  // 出入库记录相关
  async getLogs(beanId?: string): Promise<InventoryLog[]> {
    const url = beanId
      ? `${API_BASE}/inventory?beanId=${beanId}`
      : `${API_BASE}/inventory`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse<InventoryLog[]>(res);
  },

  async createLog(log: InventoryLog): Promise<InventoryLog> {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(log),
    });
    return handleApiResponse<InventoryLog>(res);
  },

  async deleteLog(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/inventory?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, 'DELETE_LOG_FAILED', 'Failed to delete log');
  },

  // 品饮记录相关
  async getTastingRecords(beanId?: string): Promise<TastingRecord[]> {
    const url = beanId
      ? `${API_BASE}/tasting?beanId=${beanId}`
      : `${API_BASE}/tasting`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleApiResponse<TastingRecord[]>(res);
  },

  async createTastingRecord(record: TastingRecord): Promise<{ success: boolean; record?: TastingRecord; error?: string; stock?: number }> {
    const res = await fetch(`${API_BASE}/tasting`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(record),
    });
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Failed to create tasting record', stock: data.stock };
    }
    
    const data = await res.json();
    return { success: true, record: data.record || data };
  },

  async updateTastingRecord(record: TastingRecord): Promise<TastingRecord> {
    const res = await fetch(`${API_BASE}/tasting?id=${record.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(record),
    });
    return handleApiResponse<TastingRecord>(res);
  },

  async deleteTastingRecord(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasting?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, 'DELETE_TASTING_FAILED', 'Failed to delete tasting record');
  },
};
