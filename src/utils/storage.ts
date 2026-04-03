import { CoffeeBean, InventoryLog, TastingRecord, SyncResult } from '../types';
import { api } from './api';

const BEANS_KEY = 'COFFEE_BEANS';
const LOGS_KEY = 'INVENTORY_LOGS';
const TASTING_KEY = 'TASTING_RECORDS';

// 本地存储作为缓存
const localCache = {
  getBeans(): CoffeeBean[] {
    const raw = uni.getStorageSync(BEANS_KEY) || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeCoffeeBean).filter(b => b.id);
  },
  saveBeans(beans: CoffeeBean[]) {
    uni.setStorageSync(BEANS_KEY, beans);
  },
  getLogs(): InventoryLog[] {
    const raw = uni.getStorageSync(LOGS_KEY) || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeInventoryLog).filter(l => l.id);
  },
  saveLogs(logs: InventoryLog[]) {
    uni.setStorageSync(LOGS_KEY, logs);
  },
  getTastingRecords(): TastingRecord[] {
    const raw = uni.getStorageSync(TASTING_KEY) || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeTastingRecord).filter(r => r.id);
  },
  saveTastingRecords(records: TastingRecord[]) {
    uni.setStorageSync(TASTING_KEY, records);
  },
  clearAll() {
    uni.removeStorageSync(BEANS_KEY);
    uni.removeStorageSync(LOGS_KEY);
    uni.removeStorageSync(TASTING_KEY);
    uni.removeStorageSync('TARGET_BEAN_ID');
  }
};

export { localCache };

export const storage = {
  // 咖啡豆相关
  async getBeans(page = 1, limit = 20): Promise<{ data: CoffeeBean[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> {
    try {
      const result = await api.getBeans(page, limit);
      const normalized = result.data.map(normalizeCoffeeBean).filter(b => b.id);
      
      if (page === 1) {
        localCache.saveBeans(normalized);
      } else {
        const cached = localCache.getBeans();
        localCache.saveBeans([...cached, ...normalized]);
      }
      
      return { data: normalized, pagination: result.pagination };
    } catch (error) {
      console.warn('Failed to fetch from API, using local cache:', error);
      const cached = localCache.getBeans();
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        data: cached.slice(start, end),
        pagination: {
          page,
          limit,
          total: cached.length,
          totalPages: Math.ceil(cached.length / limit),
          hasMore: end < cached.length
        }
      };
    }
  },

  async getBeanById(id: string): Promise<CoffeeBean | null> {
    try {
      const result = await api.getBeans(1, 1000);
      const normalized = result.data.map(normalizeCoffeeBean).filter(b => b.id);
      localCache.saveBeans(normalized);
      const bean = normalized.find(b => b.id === id);
      return bean || null;
    } catch (error) {
      console.warn('Failed to fetch from API, using local cache:', error);
      const beans = localCache.getBeans();
      return beans.find(b => b.id === id) || null;
    }
  },

  async saveBeans(beans: CoffeeBean[]): Promise<void> {
    localCache.saveBeans(beans);
    // 同步到服务器
    for (const bean of beans) {
      try {
        await api.createBean(bean);
      } catch (error) {
        console.warn('Failed to sync bean to API:', error);
      }
    }
  },

  async createBean(bean: CoffeeBean): Promise<CoffeeBean> {
    try {
      const result = await api.createBean(bean);
      result._synced = true;
      result._syncError = undefined;
      
      const beans = localCache.getBeans();
      const index = beans.findIndex(b => b.id === result.id);
      if (index !== -1) {
        beans[index] = result;
      } else {
        beans.push(result);
      }
      localCache.saveBeans(beans);
      return result;
    } catch (error: any) {
      console.error('Failed to create bean via API:', error);
      
      const localBean = { 
        ...bean, 
        _synced: false, 
        _syncError: error.message || '同步失败' 
      };
      
      const beans = localCache.getBeans();
      const index = beans.findIndex(b => b.id === localBean.id);
      if (index !== -1) {
        beans[index] = localBean;
      } else {
        beans.push(localBean);
      }
      localCache.saveBeans(beans);
      
      throw error; // 抛出错误让UI处理
    }
  },

  async updateBean(bean: CoffeeBean): Promise<SyncResult<CoffeeBean>> {
    try {
      const result = await api.updateBean(bean);
      const beans = localCache.getBeans();
      const index = beans.findIndex(b => b.id === bean.id);
      if (index !== -1) {
        beans[index] = result;
        localCache.saveBeans(beans);
      }
      return { success: true, data: result, synced: true };
    } catch (error: any) {
      console.error('Failed to update bean via API:', error);
      
      const beans = localCache.getBeans();
      const index = beans.findIndex(b => b.id === bean.id);
      if (index !== -1) {
        beans[index] = { ...bean, _synced: false, _syncError: error.message || '同步失败' };
        localCache.saveBeans(beans);
      }
      
      return { 
        success: false, 
        data: bean, 
        error: error.message || '更新失败', 
        synced: false 
      };
    }
  },

  async deleteBean(id: string): Promise<SyncResult<void>> {
    try {
      await api.deleteBean(id);
      const beans = localCache.getBeans().filter(b => b.id !== id);
      localCache.saveBeans(beans);
      return { success: true, synced: true };
    } catch (error: any) {
      console.error('Failed to delete bean via API:', error);
      
      const beans = localCache.getBeans().filter(b => b.id !== id);
      localCache.saveBeans(beans);
      
      return { 
        success: false, 
        error: error.message || '删除失败', 
        synced: false 
      };
    }
  },

  // 原子更新库存（解决竞态条件）
  async updateBeanStock(beanId: string, amount: number): Promise<{ success: boolean; stock?: number; error?: string }> {
    try {
      const result = await api.updateBeanStock(beanId, amount);
      if (result.success) {
        // 更新本地缓存
        const beans = localCache.getBeans();
        const index = beans.findIndex(b => b.id === beanId);
        if (index !== -1 && result.stock !== undefined) {
          beans[index].stock = result.stock;
          localCache.saveBeans(beans);
        }
      }
      return result;
    } catch (error: any) {
      console.error('Failed to update bean stock:', error);
      // 尝试从错误响应中提取信息
      if (error.data && error.data.error) {
        return { success: false, error: error.data.error };
      }
      throw error;
    }
  },

  // 出入库记录相关
  async getLogs(beanId?: string, page = 1, limit = 20): Promise<{ data: InventoryLog[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> {
    try {
      const result = await api.getLogs(beanId, page, limit);
      const normalized = result.data.map(normalizeInventoryLog).filter(l => l.id);
      
      if (page === 1) {
        localCache.saveLogs(normalized);
      } else {
        const cached = localCache.getLogs();
        localCache.saveLogs([...cached, ...normalized]);
      }
      
      return { data: normalized, pagination: result.pagination };
    } catch (error) {
      console.warn('Failed to fetch logs from API, using local cache:', error);
      const logs = localCache.getLogs();
      const start = (page - 1) * limit;
      const end = start + limit;
      const filtered = beanId ? logs.filter(log => log.beanId === beanId) : logs;
      return {
        data: filtered.slice(start, end),
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / limit),
          hasMore: end < filtered.length
        }
      };
    }
  },

  async createLog(log: InventoryLog): Promise<SyncResult<InventoryLog>> {
    try {
      const result = await api.createLog(log);
      const logs = localCache.getLogs();
      logs.push(result);
      localCache.saveLogs(logs);
      return { success: true, data: result, synced: true };
    } catch (error: any) {
      console.error('Failed to create log via API:', error);
      
      const logs = localCache.getLogs();
      logs.push(log);
      localCache.saveLogs(logs);
      
      return { 
        success: false, 
        data: log, 
        error: error.message || '创建入库记录失败', 
        synced: false 
      };
    }
  },

  async deleteLog(id: string): Promise<SyncResult<void>> {
    try {
      await api.deleteLog(id);
      const logs = localCache.getLogs().filter(l => l.id !== id);
      localCache.saveLogs(logs);
      return { success: true, synced: true };
    } catch (error: any) {
      console.error('Failed to delete log via API:', error);
      
      const logs = localCache.getLogs().filter(l => l.id !== id);
      localCache.saveLogs(logs);
      
      return { 
        success: false, 
        error: error.message || '删除失败', 
        synced: false 
      };
    }
  },

  // 品饮记录相关
  async getTastingRecords(beanId?: string, page = 1, limit = 20): Promise<{ data: TastingRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean } }> {
    try {
      const result = await api.getTastingRecords(beanId, page, limit);
      const normalized = result.data.map(normalizeTastingRecord).filter(r => r.id);
      
      if (page === 1) {
        localCache.saveTastingRecords(normalized);
      } else {
        const cached = localCache.getTastingRecords();
        localCache.saveTastingRecords([...cached, ...normalized]);
      }
      
      return { data: normalized, pagination: result.pagination };
    } catch (error) {
      console.warn('Failed to fetch tasting records from API, using local cache:', error);
      const records = localCache.getTastingRecords();
      const start = (page - 1) * limit;
      const end = start + limit;
      return {
        data: records.slice(start, end),
        pagination: {
          page,
          limit,
          total: records.length,
          totalPages: Math.ceil(records.length / limit),
          hasMore: end < records.length
        }
      };
    }
  },

  async createTastingRecord(record: TastingRecord): Promise<{ success: boolean; record?: TastingRecord; error?: string; stock?: number }> {
    try {
      const result = await api.createTastingRecord(record);
      if (result.success && result.record) {
        const records = localCache.getTastingRecords();
        records.push(result.record);
        localCache.saveTastingRecords(records);
        return { success: true, record: result.record };
      }
      // API 返回失败
      return result;
    } catch (error: any) {
      console.warn('Failed to create tasting record via API:', error);
      // 尝试从错误响应中提取信息
      if (error.data && error.data.success === false) {
        return { success: false, error: error.data.error, stock: error.data.stock };
      }
      // 失败时保存到本地缓存（离线模式）
      const records = localCache.getTastingRecords();
      records.push(record);
      localCache.saveTastingRecords(records);
      return { success: false, error: error.message || '保存失败' };
    }
  },

  async updateTastingRecord(record: TastingRecord): Promise<SyncResult<TastingRecord>> {
    try {
      const result = await api.updateTastingRecord(record);
      const records = localCache.getTastingRecords();
      const index = records.findIndex(r => r.id === record.id);
      if (index !== -1) {
        records[index] = result;
        localCache.saveTastingRecords(records);
      }
      return { success: true, data: result, synced: true };
    } catch (error: any) {
      console.error('Failed to update tasting record via API:', error);
      
      const records = localCache.getTastingRecords();
      const index = records.findIndex(r => r.id === record.id);
      if (index !== -1) {
        records[index] = record;
        localCache.saveTastingRecords(records);
      }
      
      return { 
        success: false, 
        data: record, 
        error: error.message || '更新失败', 
        synced: false 
      };
    }
  },

  async deleteTastingRecord(id: string): Promise<SyncResult<void>> {
    try {
      await api.deleteTastingRecord(id);
      const records = localCache.getTastingRecords().filter(r => r.id !== id);
      localCache.saveTastingRecords(records);
      return { success: true, synced: true };
    } catch (error: any) {
      console.error('Failed to delete tasting record via API:', error);
      
      const records = localCache.getTastingRecords().filter(r => r.id !== id);
      localCache.saveTastingRecords(records);
      
      return { 
        success: false, 
        error: error.message || '删除失败', 
        synced: false 
      };
    }
  },

  clearAll() {
    localCache.clearAll();
  }
};

const normalizeString = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

const normalizeNumber = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeCoffeeBean = (raw: any): CoffeeBean => {
  const flavorNotes = normalizeString(raw?.flavor_notes || raw?.flavorNotes);
  const description = normalizeString(raw?.description);
  const brandRoaster = normalizeString(raw?.brand_roaster || raw?.brandRoaster) || normalizeString(raw?.roaster);
  const legacyOrigin = normalizeString(raw?.origin);
  const originCountry = normalizeString(raw?.origin_country || raw?.originCountry);
  const originRegion = normalizeString(raw?.origin_region || raw?.originRegion);
  const parsedOrigin = parseLegacyOrigin(legacyOrigin);

  return {
    id: normalizeString(raw?.id),
    name: normalizeString(raw?.name),
    originCountry: originCountry || parsedOrigin.originCountry,
    originRegion: originRegion || parsedOrigin.originRegion,
    origin: legacyOrigin,
    brandRoaster,
    producer: normalizeString(raw?.producer),
    altitude: normalizeString(raw?.altitude),
    variety: normalizeString(raw?.variety),
    flavorNotes,
    roastLevel: normalizeString(raw?.roast_level || raw?.roastLevel),
    agtron: normalizeOptionalNumber(raw?.agtron),
    process: normalizeString(raw?.process),
    roastDate: normalizeString(raw?.roast_date || raw?.roastDate),
    referencePrice: normalizeOptionalNumber(raw?.reference_price || raw?.referencePrice),
    stock: Math.round(normalizeNumber(raw?.stock) || 0),
    description
  };
};

const parseLegacyOrigin = (origin: string) => {
  const value = (origin || '').trim();
  if (!value) return { originCountry: '', originRegion: '' };
  const match = value.match(/\s*[·•\-|—]\s*/);
  if (!match || match.index === undefined) return { originCountry: value, originRegion: '' };
  const idx = match.index;
  const left = value.slice(0, idx).trim();
  const right = value.slice(idx + match[0].length).trim();
  return { originCountry: left || value, originRegion: right };
};

const normalizeInventoryLog = (raw: any): InventoryLog => {
  return {
    id: normalizeString(raw?.id),
    beanId: normalizeString(raw?.bean_id || raw?.beanId),
    type: raw?.type || 'IN',
    amount: Math.round(normalizeNumber(raw?.amount) || 0),
    date: normalizeString(raw?.date),
    roastDate: normalizeString(raw?.roast_date || raw?.roastDate),
    note: normalizeString(raw?.note)
  };
};

const normalizeTastingRecord = (raw: any): TastingRecord => {
  return {
    id: normalizeString(raw?.id),
    beanId: normalizeString(raw?.bean_id || raw?.beanId),
    date: normalizeString(raw?.date),
    dose: normalizeOptionalNumber(raw?.dose),
    brewMethod: normalizeString(raw?.brew_method || raw?.brewMethod),
    dripper: normalizeString(raw?.dripper || raw?.dripper),
    filterPaper: normalizeString(raw?.filter_paper || raw?.filterPaper),
    grinder: normalizeString(raw?.grinder || raw?.grinder),
    grindSize: normalizeString(raw?.grind_size || raw?.grindSize),
    waterTemp: Math.round(normalizeNumber(raw?.water_temp || raw?.waterTemp) || 0),
    waterQuality: normalizeString(raw?.water_quality || raw?.waterQuality),
    ratio: normalizeString(raw?.ratio),
    rating: Math.round(normalizeNumber(raw?.rating) || 0),
    notes: normalizeString(raw?.notes),
    improvement: normalizeString(raw?.improvement)
  };
};