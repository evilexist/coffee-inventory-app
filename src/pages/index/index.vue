<template>
  <view class="page">
    <view class="page-inner">
      <view class="header">
        <view class="header-left">
          <text class="h1"><image class="logo" src="/static/logo_coffee_box.png" mode="aspectFit" style="display: inline-block; width:36px; height:36px; vertical-align: middle;"></image> 咖啡盒</text>
        </view>
        <view class="header-actions">
          <button class="btn btn-ghost" @click="openExport" aria-label="导出数据">导出</button>
          <button class="btn btn-primary" @click="goToAdd" aria-label="新增咖啡豆">新增豆子</button>
        </view>
      </view>

      <view class="overview">
        <view class="overview-card card" aria-label="豆子数量概览">
          <text class="caption">🫘 豆子数量</text>
          <view class="overview-value">
            <text class="h2" style="color: var(--primary)">{{ beans.length }}</text>
          </view>
        </view>
        <view class="overview-card card" aria-label="总库存克重概览">
          <text class="caption">📦 总库存</text>
          <view class="overview-value">
            <text class="h2" style="color: var(--primary)">{{ totalStock }}</text>
            <text class="caption" style="margin-left: 6px">g</text>
          </view>
        </view>
      </view>

      <scroll-view scroll-y class="bean-list" aria-label="咖啡豆列表">
        <view v-if="beans.length === 0" class="empty-state">
          <text class="body">暂无咖啡豆</text>
          <view style="margin-top: 16px">
            <button class="btn btn-primary" @click="goToAdd" aria-label="去添加咖啡豆">去添加</button>
          </view>
        </view>
        <view
          v-for="bean in beans"
          :key="bean.id"
          class="bean-card card"
          role="button"
          :aria-label="`打开 ${bean.name} 的快捷操作`"
          @click="openActions(bean)"
        >
          <view class="bean-info">
            <text class="title">{{ bean.name }}</text>
            <text class="bean-meta text-muted">{{ getBeanMeta(bean) }}</text>
            <text v-if="getBeanBatchMeta(bean)" class="bean-submeta caption">{{ getBeanBatchMeta(bean) }}</text>
          </view>
          <view class="bean-stock" aria-label="库存克重">
            <text class="stock-num">{{ bean.stock }}</text>
            <text class="unit">g</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="showActions" class="sheet-overlay" @click="closeActions" aria-label="快捷操作面板遮罩">
      <view class="sheet" @click.stop aria-label="快捷操作面板">
        <view class="sheet-header">
          <!-- #ifdef H5 -->
          <span class="sheet-span-block">
            <span class="sheet-span-title">{{ activeBean?.name }}</span>
            <span class="sheet-span-meta">{{ activeBean ? getSheetSummarySpan(activeBean) : '' }}</span>
            <span v-if="activeBean?.flavorNotes?.trim()" class="sheet-span-meta">风味： {{ activeBean.flavorNotes.trim() }}</span>
            <span v-if="activeBean?.description?.trim()" class="sheet-span-meta">备注： {{ activeBean.description.trim() }}</span>
          </span>
          <span class="sheet-span-actions">
            <span class="sheet-span-action" role="button" tabindex="0" @click="closeActions">关闭</span>
          </span>
          <!-- #endif -->

          <!-- #ifndef H5 -->
          <view>
            <text class="title">{{ activeBean?.name }}</text>
            <text v-if="activeBean ? getSheetSummarySpan(activeBean) : ''" class="caption" style="margin-top: 4px; display: block">
              {{ activeBean ? getSheetSummarySpan(activeBean) : '' }}
            </text>
            <text v-if="activeBean?.flavorNotes?.trim()" class="caption" style="margin-top: 4px; display: block">
              风味： {{ activeBean.flavorNotes.trim() }}
            </text>
            <text v-if="activeBean?.description?.trim()" class="caption" style="margin-top: 4px; display: block">
              备注： {{ activeBean.description.trim() }}
            </text>
          </view>
          <view class="sheet-header-actions">
            <button class="btn btn-ghost" @click="closeActions" aria-label="关闭快捷操作">关闭</button>
          </view>
          <!-- #endif -->
        </view>

        <view class="sheet-grid">
          <button class="btn btn-primary" @click="handleStock(activeBean!, 'IN')" aria-label="入库">入库</button>
          <button
            class="btn btn-ghost"
            :disabled="(activeBean?.stock ?? 0) <= 0"
            @click="handleStock(activeBean!, 'OUT')"
            aria-label="出库"
          >
            出库
          </button>
          <button class="btn btn-ghost" @click="goToTasting(activeBean!)" aria-label="查看品饮记录">品饮记录</button>
          <button class="btn btn-ghost" @click="goToLogs(activeBean!)" aria-label="查看出入库记录">出入库记录</button>
        </view>

        <view class="sheet-footer">
          <text class="caption">删除后豆子将从库存移除，相关记录将保留。</text>
          <button class="btn btn-danger-ghost" @click="deleteBean(activeBean!.id)" aria-label="删除咖啡豆">
            删除豆子
          </button>
        </view>
      </view>
    </view>

    <view v-if="showInModal" class="modal-overlay" @click="closeInModal" aria-label="入库弹窗遮罩">
      <view class="modal-content" @click.stop aria-label="入库弹窗">
        <text class="modal-title">入库</text>
        <text class="caption" style="margin-top: 6px; display: block">{{ inBean ? inBean.name : '' }}</text>

        <view class="modal-form">
          <view class="form-group">
            <text class="label">烘焙日期</text>
            <view class="picker-container" aria-label="烘焙日期选择">
              <picker mode="date" :value="inRoastDate" @change="onInRoastDateChange">
                <view class="picker">
                  {{ inRoastDate || '请选择烘焙日期' }}
                </view>
              </picker>
            </view>
          </view>

          <view class="form-group">
            <text class="label">入库重量</text>
            <view class="input-with-suffix">
              <input class="input" type="number" v-model="inAmount" placeholder="例如：250" aria-label="入库重量（克）" />
              <text class="suffix">g</text>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <button class="btn btn-ghost" @click="closeInModal" aria-label="取消入库">取消</button>
          <button class="btn btn-primary" @click="confirmIn" aria-label="确认入库">确认入库</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { CoffeeBean, InventoryLog } from '../../types';
import { storage, localCache } from '../../utils/storage';
import { exportDataToFile } from '../../utils/export';
import { onShow } from '@dcloudio/uni-app';
import { checkAuth } from '../../utils/auth';
import { generateId } from '../../utils/common';

const beans = ref<CoffeeBean[]>([]);
const showActions = ref(false);
const activeBean = ref<CoffeeBean | null>(null);
const showInModal = ref(false);
const inBean = ref<CoffeeBean | null>(null);
const inRoastDate = ref('');
const inAmount = ref('');

const totalStock = computed(() => {
  const total = beans.value.reduce((sum, b) => sum + (Number.isFinite(b.stock) ? b.stock : 0), 0);
  return Math.max(0, Math.round(total));
});

const loadData = async () => {
  try {
    beans.value = await storage.getBeans();
  } catch (error) {
    console.error('Failed to load beans:', error);
    // 回退到本地缓存（已标准化）
    beans.value = localCache.getBeans();
  }
};

onMounted(() => {
  // 检查认证状态
  if (!checkAuth()) {
    return;
  }
  loadData();
});

// Refresh data when coming back to this page
onShow(() => {
  // 检查认证状态
  if (!checkAuth()) {
    return;
  }
  loadData();
});

const goToAdd = () => {
  uni.navigateTo({
    url: '/pages/beans/add'
  });
};

const openExport = () => {
  (uni as any).showActionSheet({
    itemList: ['导出 JSON（备份）', '导出 Markdown（可阅读）', '清空本地数据', '退出登录'],
    success: async (res: any) => {
      if (res.tapIndex === 0) await exportDataToFile('json');
      if (res.tapIndex === 1) await exportDataToFile('markdown');
      if (res.tapIndex === 2) {
        (uni as any).showModal({
          title: '清空本地数据',
          content: '将删除本设备上的咖啡豆、出入库与品饮记录。建议先导出备份。',
          confirmText: '清空',
          confirmColor: '#DD524D',
          success: (r: any) => {
            if (r.confirm) {
              storage.clearAll();
              loadData();
              uni.showToast({ title: '已清空', icon: 'none' });
            }
          }
        });
      }
      if (res.tapIndex === 3) {
        (uni as any).showModal({
          title: '退出登录',
          content: '确定要退出登录吗？',
          confirmText: '退出',
          confirmColor: '#DD524D',
          success: (r: any) => {
            if (r.confirm) {
              uni.removeStorageSync('auth_token');
              uni.removeStorageSync('user_info');
              (uni as any).reLaunch({
                url: '/pages/login/index'
              });
            }
          }
        });
      }
    }
  });
};

const openActions = (bean: CoffeeBean) => {
  activeBean.value = bean;
  showActions.value = true;
};

const closeActions = () => {
  showActions.value = false;
  activeBean.value = null;
};

const getSheetSummarySpan = (bean: CoffeeBean) => {
  const parts: string[] = [];
  const brandRoaster = (bean.brandRoaster || '').trim();
  const originCountry = (bean.originCountry || '').trim();
  const originRegion = (bean.originRegion || '').trim();
  const producer = (bean.producer || '').trim();
  const process = (bean.process || '').trim();
  const variety = (bean.variety || '').trim();
  const altitude = (bean.altitude || '').trim();

  if (brandRoaster) parts.push(brandRoaster);
  if (originCountry) parts.push(originCountry);
  if (originRegion) parts.push(originRegion);
  if (producer) parts.push(producer);
  if (process) parts.push(process);
  if (variety) parts.push(variety);
  if (altitude) parts.push(`种植海拔 ${altitude}`);
  return parts.join(' · ');
};

const getBeanMeta = (bean: CoffeeBean) => {
  const parts: string[] = [];
  const brandRoaster = (bean.brandRoaster || '').trim();
  const originCountry = (bean.originCountry || '').trim();
  const originRegion = (bean.originRegion || '').trim();
  const process = (bean.process || '').trim();
  const variety = (bean.variety || '').trim();

  if (brandRoaster) parts.push(brandRoaster);
  if (originCountry) parts.push(originCountry);
  if (originRegion) parts.push(originRegion);
  if (process) parts.push(process);
  if (variety) parts.push(variety);
  return parts.length ? parts.join(' · ') : '未填写基础信息';
};


const getBeanBatchMeta = (bean: CoffeeBean) => {
  const parts: string[] = [];
  const roastLevel = (bean.roastLevel || '').trim();
  const roastDate = (bean.roastDate || '').trim();
  const price = typeof bean.referencePrice === 'number' ? bean.referencePrice : undefined;

  if (roastLevel) {
    const agtronDisplay = bean.agtron !== undefined && bean.agtron !== null ? `#${bean.agtron}` : '';
    parts.push(agtronDisplay ? `${roastLevel}${agtronDisplay}` : roastLevel);
  }
  if (roastDate) parts.push(`${roastDate}烘焙`);
  if (price !== undefined) parts.push(`参考价 ${price}元`);
  return parts.join(' · ');
};

const goToLogs = (bean: CoffeeBean) => {
  closeActions();
  uni.setStorageSync('TARGET_BEAN_ID', bean.id);
  uni.navigateTo({
    url: '/pages/inventory/log'
  });
};

const goToTasting = (bean: CoffeeBean) => {
  closeActions();
  uni.setStorageSync('TARGET_BEAN_ID', bean.id);
  uni.switchTab({
    url: '/pages/tasting/record'
  });
};

const handleStock = (bean: CoffeeBean, type: 'IN' | 'OUT') => {
  closeActions();
  if (type === 'IN') {
    openInModal(bean);
    return;
  }
  if (type === 'OUT' && (bean.stock ?? 0) <= 0) {
    uni.showToast({ title: '库存为0，无法出库', icon: 'none' });
    return;
  }
  (uni as any).showModal({
    title: '出库',
    content: '',
    editable: true,
    placeholderText: '请输入重量(g)',
    success: async (res: any) => {
      if (res.confirm && res.content) {
        const amount = parseFloat(res.content);
        if (!Number.isFinite(amount) || amount <= 0) {
          uni.showToast({ title: '请输入大于0的数字', icon: 'none' });
          return;
        }

        try {
          // 使用原子操作扣减库存，避免竞态条件
          const result = await storage.updateBeanStock(bean.id, -amount);

          if (!result.success) {
            if (result.error === '库存不足') {
              uni.showToast({ title: `库存不足，当前库存：${result.stock || 0}`, icon: 'none' });
            } else {
              uni.showToast({ title: result.error || '出库失败', icon: 'none' });
            }
            return;
          }

          // 创建出库记录
          await storage.createLog({
            id: generateId('log'),
            beanId: bean.id,
            type: 'OUT',
            amount,
            date: new Date().toISOString()
          } as InventoryLog);

          uni.showToast({ title: '出库成功', icon: 'success' });
          loadData();
        } catch (error) {
          console.error('出库失败:', error);
          uni.showToast({ title: '出库失败', icon: 'none' });
        }
      }
    }
  });
};

const openInModal = (bean: CoffeeBean) => {
  inBean.value = bean;
  inRoastDate.value = '';
  inAmount.value = '';
  showInModal.value = true;
};

const closeInModal = () => {
  showInModal.value = false;
  inBean.value = null;
  inRoastDate.value = '';
  inAmount.value = '';
};

const onInRoastDateChange = (e: any) => {
  inRoastDate.value = e.detail.value;
};

const confirmIn = async () => {
  if (!inBean.value) return;
  const roastDate = inRoastDate.value.trim();
  const amountRaw = String(inAmount.value ?? '').trim();
  const amount = Number(amountRaw);

  if (!roastDate) {
    uni.showToast({ title: '请填写烘焙日期', icon: 'none' });
    return;
  }

  if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
    uni.showToast({ title: '请输入大于0的重量', icon: 'none' });
    return;
  }

  try {
    const allBeans = await storage.getBeans();
    const target = allBeans.find(b => b.id === inBean.value!.id);
    if (!target) {
      uni.showToast({ title: '未找到咖啡豆', icon: 'none' });
      closeInModal();
      return;
    }

    target.stock = Math.max(0, Math.round(target.stock + amount));
    target.roastDate = roastDate;
    await storage.updateBean(target);

    await storage.createLog({
      id: generateId('log'),
      beanId: target.id,
      type: 'IN',
      amount,
      date: new Date().toISOString(),
      roastDate
    });

    uni.showToast({ title: '入库成功' });
    closeInModal();
    loadData();
  } catch (error) {
    console.error('入库失败:', error);
    uni.showToast({ title: '入库失败', icon: 'none' });
  }
};

const deleteBean = (id: string) => {
  closeActions();
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这款咖啡豆吗？相关记录将保留。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await storage.deleteBean(id);
          loadData();
        } catch (error) {
          console.error('删除失败:', error);
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  gap: var(--space-md);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--border-light);
}

.header-left {
  min-width: 0;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.overview {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.overview-card {
  flex: 1;
  padding: var(--space-lg);
  background: linear-gradient(135deg, var(--card) 0%, var(--bg-warm) 100%);
  border: 1px solid var(--border-light);
}

.overview-value {
  display: flex;
  align-items: baseline;
  margin-top: var(--space-xs);
}

.bean-list {
  height: calc(100vh - 220px);
}

.bean-card {
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.bean-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.bean-card:active {
  transform: translateY(0);
}

.bean-info {
  min-width: 0;
  flex: 1;
}

.bean-meta {
  font-size: var(--font-size-md);
  margin-top: var(--space-xs);
  display: block;
  color: var(--text-muted);
}

.bean-submeta {
  display: block;
  margin-top: var(--space-xs);
  color: var(--text-subtle);
}

.bean-stock {
  text-align: right;
  margin-left: var(--space-md);
  padding-left: var(--space-md);
  border-left: 1px solid var(--border-light);
}

.stock-num {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.5px;
}

.unit {
  font-size: var(--font-size-xs);
  color: var(--text-subtle);
  margin-left: 2px;
  font-weight: 500;
}

/* 底部弹出面板 */
.sheet-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(61, 50, 41, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: var(--space-md);
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom) + 56px);
  z-index: 200;
}

.sheet {
  width: 100%;
  max-width: 960px;
  background: var(--card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 24px - env(safe-area-inset-bottom) - 56px);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border-light);
}

.sheet-header-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.sheet-span-block {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sheet-span-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
}

.sheet-span-meta {
  display: block;
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--text-subtle);
  line-height: 1.5;
  word-break: break-word;
}

.sheet-span-actions {
  display: inline-flex;
  align-items: center;
}

.sheet-span-action {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--card);
  transition: all var(--transition-fast);
}

.sheet-span-action:hover {
  background: var(--bg-warm);
  border-color: var(--primary-light);
}

.sheet-body {
  flex: 1;
  margin-top: var(--space-md);
  margin-bottom: var(--space-md);
}

.text-block {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-md);
}

.sheet-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

@media (max-width: 380px) {
  .sheet-grid {
    grid-template-columns: 1fr;
  }
}

.sheet-grid .btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.sheet-footer {
  margin-top: var(--space-lg);
  border-top: 1px solid var(--border-light);
  padding-top: var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.sheet-footer .caption {
  flex: 1;
  line-height: 1.5;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(61, 50, 41, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 220;
  padding: var(--space-md);
}

.modal-content {
  width: 100%;
  max-width: 560px;
  background: var(--card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-title {
  display: block;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text);
}

.modal-form {
  margin-top: var(--space-lg);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: flex-end;
  margin-top: var(--space-xl);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-md);
  color: var(--text);
  font-weight: 600;
}

.input {
  background: var(--bg);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  width: 100%;
  box-sizing: border-box;
  font-size: var(--font-size-md);
  display: block;
  border: 1.5px solid var(--border);
  height: 48px;
  transition: all var(--transition-fast);
}

.input:focus {
  border-color: var(--primary-light);
  background: var(--card);
  box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.1);
}

.picker-container {
  background: var(--bg);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border);
  transition: all var(--transition-fast);
}

.picker-container:focus-within {
  border-color: var(--primary-light);
  background: var(--card);
  box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.1);
}

.picker {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
  font-size: var(--font-size-md);
}

.input-with-suffix {
  position: relative;
}

.suffix {
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--font-size-sm);
  color: var(--text-subtle);
  font-weight: 500;
}
</style>
