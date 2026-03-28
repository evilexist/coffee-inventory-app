/**
 * 生成带前缀的唯一ID
 * @param prefix - ID前缀，如 'bean', 'log', 'tasting'
 * @returns 格式：{prefix}_{timestamp}_{random4}
 * 例如：log_1700000000000_abc1
 */
export const generateId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * 生成咖啡豆ID（纯数字时间戳）
 * 保持与历史数据兼容
 */
export const generateBeanId = (): string => {
  return Date.now().toString();
};
