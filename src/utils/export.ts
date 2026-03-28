import { storage } from './storage';
import type { CoffeeBean, InventoryLog, TastingRecord } from '../types';

type ExportFormat = 'json' | 'markdown';

const pad2 = (n: number) => String(n).padStart(2, '0');

const formatDateTimeForFileName = (d: Date) => {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
};

const formatDateTimeReadable = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const escapeMd = (text: string) => {
  return (text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
};

const safeText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const buildMarkdown = (beans: CoffeeBean[], logs: InventoryLog[], records: TastingRecord[]) => {
  const exportedAt = new Date();
  const totalStock = beans.reduce((sum, b) => sum + (Number.isFinite(b.stock) ? b.stock : 0), 0);

  const beanRows = beans
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(b => {
      const originCountry = (b.originCountry || '').trim();
      const originRegion = (b.originRegion || '').trim();
      const origin = originCountry && originRegion ? `${originCountry}·${originRegion}` : originCountry || originRegion || (b.origin || '').trim();
      const tags = [
        (b.brandRoaster || '').trim(),
        origin,
        (b.roastLevel || '').trim(),
        b.agtron !== undefined && b.agtron !== null ? `#${b.agtron}` : '',
        (b.process || '').trim(),
        (b.roastDate || '').trim() ? `烘焙 ${b.roastDate.trim()}` : '',
        typeof b.referencePrice === 'number' ? `参考价 ${b.referencePrice}元` : ''
      ].filter(Boolean);

      return `| ${escapeMd(b.name)} | ${escapeMd(tags.join(' / '))} | ${b.stock} |`;
    });

  const recentLogs = logs
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)
    .map(l => {
      const sign = l.type === 'IN' ? '+' : '-';
      const roastDate = l.roastDate ? `烘焙 ${escapeMd(l.roastDate)}` : '';
      const note = l.note ? escapeMd(l.note) : '';
      return `| ${escapeMd(l.beanId)} | ${l.type} | ${sign}${l.amount}g | ${escapeMd(formatDateTimeReadable(l.date))} | ${roastDate} ${note}`.trimEnd() + ' |';
    });

  const recentRecords = records
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50)
    .map(r => {
      const extras = [
        safeText(r.dripper).trim() ? `滤杯 ${escapeMd(safeText(r.dripper))}` : '',
        safeText(r.filterPaper).trim() ? `滤纸 ${escapeMd(safeText(r.filterPaper))}` : '',
        safeText(r.grinder).trim() ? `磨豆机 ${escapeMd(safeText(r.grinder))}` : '',
        safeText(r.grindSize).trim() ? `研磨度 ${escapeMd(safeText(r.grindSize))}` : '',
        safeText(r.waterQuality).trim() ? `水质 ${escapeMd(safeText(r.waterQuality))}` : ''
      ].filter(Boolean);

      const line2 = extras.length ? ` / ${extras.join(' · ')}` : '';
      return `| ${escapeMd(r.beanId)} | ${escapeMd(formatDateTimeReadable(r.date))} | ${r.dose ? r.dose + 'g' : '-'} | ${escapeMd(r.ratio || '-')} | ${escapeMd(r.brewMethod || '-')}${line2} | ${r.waterTemp ? r.waterTemp + '℃' : '-'} | ${r.waterQuality || '-'} | ${r.rating} |`;
    });

  return [
    '# 咖啡豆库存管理 - 数据导出',
    '',
    `导出时间：${exportedAt.getFullYear()}-${pad2(exportedAt.getMonth() + 1)}-${pad2(exportedAt.getDate())} ${pad2(exportedAt.getHours())}:${pad2(exportedAt.getMinutes())}:${pad2(exportedAt.getSeconds())}`,
    '',
    '## 概览',
    `- 咖啡豆：${beans.length} 款`,
    `- 总库存：${Math.round(totalStock)} g`,
    `- 出入库记录：${logs.length} 条`,
    `- 品饮记录：${records.length} 条`,
    '',
    '## 咖啡豆列表',
    '| 名称 | 标签 | 库存(g) |',
    '|---|---|---:|',
    ...(beanRows.length ? beanRows : ['| - | - | - |']),
    '',
    '## 最近 50 条出入库记录',
    '| beanId | 类型 | 数量 | 时间 | 备注 |',
    '|---|---|---:|---|---|',
    ...(recentLogs.length ? recentLogs : ['| - | - | - | - | - |']),
    '',
    '## 最近 50 条品饮记录',
    '| beanId | 时间 | 粉量 | 粉水比 | 冲煮 | 水温 | 水质 | 评分 |',
    '|---|---|---:|---|---|---:|---:|---:|',
    ...(recentRecords.length ? recentRecords : ['| - | - | - | - | - | - | - | - |'])
  ].join('\n');
};

const buildJson = (beans: CoffeeBean[], logs: InventoryLog[], records: TastingRecord[]) => {
  const payload = {
    schema: 'coffee-inventory-export-v1',
    exportedAt: new Date().toISOString(),
    data: {
      beans,
      logs,
      tastingRecords: records
    }
  };
  return JSON.stringify(payload, null, 2);
};

const downloadTextFile = (fileName: string, text: string, mime: string) => {
  // 使用类型断言处理 uni-app 环境
  const uniApp = uni as any;
  
  // 检查是否在浏览器环境中（H5）
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } else {
    // 在小程序环境中，复制到剪贴板
    uniApp.setClipboardData({
      data: text,
      success: () => {
        uniApp.showToast({ title: '已复制到剪贴板', icon: 'none' });
      }
    });
  }
};

export const exportDataToFile = async (format: ExportFormat) => {
  const beans = await storage.getBeans();
  const logs = await storage.getLogs();
  const records = await storage.getTastingRecords();

  const now = new Date();
  const ts = formatDateTimeForFileName(now);
  const base = `coffee-inventory-${ts}`;

  if (format === 'json') {
    const text = buildJson(beans, logs, records);
    downloadTextFile(`${base}.json`, text, 'application/json;charset=utf-8');
    return;
  }

  const text = buildMarkdown(beans, logs, records);
  downloadTextFile(`${base}.md`, text, 'text/markdown;charset=utf-8');
};
