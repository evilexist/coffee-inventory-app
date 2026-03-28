export interface CoffeeBean {
  id: string;
  name: string;
  originCountry: string;
  originRegion: string;
  origin?: string;
  brandRoaster?: string;
  producer?: string;
  altitude?: string;
  variety?: string;
  flavorNotes?: string;
  roastLevel: string;
  agtron?: number; // 烘焙色值 Agtron (0-100)
  process: string;
  roastDate: string;
  referencePrice?: number;
  stock: number; // in grams
  description?: string;
  // 同步状态字段（仅前端使用，不发送到服务器）
  _synced?: boolean;
  _syncError?: string;
}

export interface InventoryLog {
  id: string;
  beanId: string;
  type: 'IN' | 'OUT';
  amount: number;
  date: string;
  roastDate?: string;
  note?: string;
}

export interface TastingRecord {
  id: string;
  beanId: string;
  date: string;
  dose?: number;
  brewMethod: string;
  dripper?: string;
  filterPaper?: string;
  grinder?: string;
  grindSize: string;
  waterTemp: number;
  waterQuality?: string; // 水质描述，如"农夫山泉70ppm"
  ratio: string; // e.g., "1:15"
  rating: number; // 1-5
  notes: string;
  improvement?: string;
}
