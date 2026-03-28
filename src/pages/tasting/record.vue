<template>
  <view class="page">
    <view class="page-inner">
      <view class="header">
        <view class="header-left">
          <text class="h2">{{ selectedBean ? `品饮：${selectedBean.name}` : '所有品饮记录' }}</text>
          <text class="caption" style="margin-top: 4px; display: block">
            {{ selectedBean ? '当前为单豆筛选' : '当前为全量列表，可选择豆子筛选' }}
          </text>
        </view>
        <view class="header-actions">
          <button v-if="beans.length > 0" class="btn btn-ghost" @click="chooseBean" aria-label="选择豆子筛选">
            {{ selectedBean ? '切换豆子' : '选择豆子' }}
          </button>
          <button class="btn btn-primary" @click="openAdd" aria-label="添加品饮记录">✏️ 添加记录</button>
        </view>
      </view>

      <scroll-view scroll-y class="record-list" aria-label="品饮记录列表">
        <view v-if="filteredRecords.length === 0" class="empty-state">
          <text class="body">暂无品饮记录</text>
          <view v-if="beans.length === 0" style="margin-top: 10px">
            <text class="caption">先去库存页添加咖啡豆</text>
          </view>
        </view>
        <view v-for="record in filteredRecords" :key="record.id" class="record-card card" :aria-label="`品饮记录 ${formatDate(record.date)}`">
          <view class="record-header">
            <text class="record-date caption">{{ formatDate(record.date) }}</text>
            <text class="record-rating" aria-label="评分">{{ '⭐'.repeat(record.rating) }}</text>
          </view>
          <view class="record-details">
            <text class="body">
              {{ record.dose ? record.dose + 'g' : '-' }} · {{ record.ratio || '-' }} · {{ record.brewMethod || '-' }} · {{ record.waterTemp ? record.waterTemp + '℃' : '-' }}{{ record.waterQuality ? ' · ' + record.waterQuality : '' }}
            </text>
            <text v-if="formatExtras(record)" class="caption" style="margin-top: 6px; display: block">
              {{ formatExtras(record) }}
            </text>
          </view>
          <view class="record-notes" v-if="record.notes">
            <text class="body text-muted">{{ record.notes }}</text>
          </view>
          <view class="record-improvement" v-if="record.improvement">
            <text class="caption">改进意见</text>
            <text class="body text-muted" style="margin-top: 6px; display: block">{{ record.improvement }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="showAddModal" class="modal-overlay" @click="closeAddModal" aria-label="新增品饮记录弹窗遮罩">
      <view class="modal-content" @click.stop aria-label="新增品饮记录弹窗">
        <text class="modal-title">新增品饮记录</text>

        <scroll-view scroll-y class="modal-form">
          <view class="form-group">
            <text class="label">咖啡豆克重</text>
            <view class="input-with-suffix">
              <input class="input" type="number" v-model="form.dose" placeholder="例如：15" aria-label="咖啡豆克重（g）" />
              <text class="suffix">g</text>
            </view>
          </view>
          <view class="form-group">
            <text class="label">冲煮方式</text>
            <radio-group class="radio-group" @change="onBrewMethodChange" aria-label="冲煮方式选择">
              <label v-for="opt in brewMethodOptions" :key="opt" class="radio-item">
                <radio :value="opt" :checked="form.brewMethodChoice === opt" />
                <text class="radio-text">{{ opt }}</text>
              </label>
            </radio-group>
            <input
              v-if="form.brewMethodChoice === '其他'"
              class="input mt-10"
              v-model="form.brewMethodCustom"
              placeholder="请输入冲煮方式"
              aria-label="自定义冲煮方式"
            />
          </view>
          <view class="form-group">
            <text class="label">滤杯（选填）</text>
            <input class="input" v-model="form.dripper" placeholder="例如：V60 / Kalita / Origami" aria-label="滤杯" />
          </view>
          <view class="form-group">
            <text class="label">滤纸（选填）</text>
            <input class="input" v-model="form.filterPaper" placeholder="例如：锥形 / 扇形 / 155" aria-label="滤纸" />
          </view>
          <view class="form-group">
            <text class="label">粉水比</text>
            <view class="ratio-row" aria-label="粉水比选择">
              <text class="ratio-prefix">1:</text>
              <text class="ratio-value">{{ form.ratioWater }}</text>
            </view>
            <slider min="4" max="20" step="1" show-value :value="form.ratioWater" @change="onRatioChange" />
          </view>
          <view class="form-group">
            <text class="label">水温</text>
            <view class="input-with-suffix">
              <input class="input" type="number" v-model="form.waterTemp" placeholder="例如：92℃" aria-label="水温（℃）" />
              <text class="suffix">℃</text>
            </view>
          </view>
          <view class="form-group">
            <text class="label">水质</text>
            <input class="input" v-model="form.waterQuality" placeholder="例如：农夫山泉70ppm" aria-label="水质" />
          </view>
          <view class="form-group">
            <text class="label">磨豆机</text>
            <input class="input" v-model="form.grinder" placeholder="例如：EK43 / Niche Zero" aria-label="磨豆机" />
          </view>
          <view class="form-group">
            <text class="label">研磨度</text>
            <input class="input" v-model="form.grindSize" placeholder="例如：中细研磨" aria-label="研磨度" />
          </view>
          <view class="form-group">
            <text class="label">评分</text>
            <slider min="1" max="5" show-value :value="form.rating" @change="onRatingChange" />
          </view>
          <view class="form-group">
            <text class="label">感受</text>
            <textarea class="textarea" v-model="form.notes" placeholder="风味表现如何？" aria-label="感受" />
          </view>
          <view class="form-group">
            <text class="label">改进意见</text>
            <textarea class="textarea" v-model="form.improvement" placeholder="下次想怎么调整？" aria-label="改进意见" />
          </view>
        </scroll-view>

        <view class="modal-actions">
          <button class="btn btn-ghost" @click="closeAddModal" aria-label="取消新增">取消</button>
          <button 
            class="btn btn-primary" 
            @click="saveRecord" 
            :disabled="isSubmitting"
            aria-label="保存品饮记录"
          >
            {{ isSubmitting ? '保存中...' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { storage, localCache } from '../../utils/storage';
import { TastingRecord, CoffeeBean, InventoryLog } from '../../types';
import { generateId } from '../../utils/common';

const records = ref<TastingRecord[]>([]);
const beans = ref<CoffeeBean[]>([]);
const targetBeanId = ref('');
const showAddModal = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  dose: '',
  brewMethodChoice: '手冲',
  brewMethodCustom: '',
  dripper: '',
  filterPaper: '',
  ratioWater: 15,
  waterTemp: '',
  waterQuality: '',
  grinder: '',
  grindSize: '',
  rating: 5,
  notes: '',
  improvement: ''
});

const brewMethodOptions = ['手冲', '杯测', '聪明杯', '爱乐压', '法压壶', '冷萃', '冰滴', '其他'];

onLoad((options: any) => {
  if (options.beanId) {
    targetBeanId.value = options.beanId;
  }
});

const loadData = async () => {
  try {
    records.value = await storage.getTastingRecords();
    beans.value = await storage.getBeans();
  } catch (error) {
    console.error('Failed to load data:', error);
    records.value = localCache.getTastingRecords();
    beans.value = localCache.getBeans();
  }
};

onMounted(() => {
  loadData();
});

onShow(() => {
  const temp = uni.getStorageSync('TARGET_BEAN_ID');
  if (temp) {
    targetBeanId.value = temp;
    uni.removeStorageSync('TARGET_BEAN_ID');
  }
  loadData();
});

const selectedBean = computed(() => {
  return beans.value.find(b => b.id === targetBeanId.value);
});

const filteredRecords = computed(() => {
  let list = records.value;
  if (targetBeanId.value) {
    list = list.filter(r => r.beanId === targetBeanId.value);
  }
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const onRatingChange = (e: any) => {
  form.rating = e.detail.value;
};

const onRatioChange = (e: any) => {
  const v = Number(e.detail.value);
  if (Number.isFinite(v)) form.ratioWater = v;
};

const onBrewMethodChange = (e: any) => {
  form.brewMethodChoice = e.detail.value;
};

const resetForm = () => {
  form.dose = '';
  form.brewMethodChoice = '手冲';
  form.brewMethodCustom = '';
  form.dripper = '';
  form.filterPaper = '';
  form.ratioWater = 15;
  form.waterTemp = '';
  form.waterQuality = '';
  form.grinder = '';
  form.grindSize = '';
  form.rating = 5;
  form.notes = '';
  form.improvement = '';
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const saveRecord = async () => {
  // 防止重复提交
  if (isSubmitting.value) {
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    const doseNum = form.dose === '' ? undefined : Number(form.dose);
    const waterNum = form.waterTemp === '' ? undefined : Number(form.waterTemp);

    if (doseNum === undefined) {
      uni.showToast({ title: '请填写咖啡豆克重（用于扣减库存）', icon: 'none' });
      return;
    }

    if (!Number.isFinite(doseNum) || doseNum <= 0) {
      uni.showToast({ title: '克重需为大于0的数字', icon: 'none' });
      return;
    }

    if (waterNum !== undefined && (!Number.isFinite(waterNum) || waterNum < 0 || waterNum > 110)) {
      uni.showToast({ title: '水温请输入0-110之间的数字', icon: 'none' });
      return;
    }

    if (!targetBeanId.value) {
      uni.showToast({ title: '请先选择咖啡豆', icon: 'none' });
      return;
    }

    const allBeans = await storage.getBeans();
    const targetBean = allBeans.find(b => b.id === targetBeanId.value);
    if (!targetBean) {
      uni.showToast({ title: '未找到咖啡豆', icon: 'none' });
      return;
    }

    if ((targetBean.stock ?? 0) < doseNum) {
      uni.showToast({ title: '库存不足，无法记录品饮', icon: 'none' });
      return;
    }

    const brewMethod = form.brewMethodChoice === '其他'
      ? form.brewMethodCustom.trim()
      : form.brewMethodChoice;

    if (form.brewMethodChoice === '其他' && !brewMethod) {
      uni.showToast({ title: '请输入冲煮方式', icon: 'none' });
      return;
    }

    const newRecord: TastingRecord = {
      id: generateId('tasting'),
      beanId: targetBeanId.value,
      date: new Date().toISOString(),
      dose: doseNum,
      brewMethod,
      dripper: form.dripper.trim(),
      filterPaper: form.filterPaper.trim(),
      grinder: form.grinder.trim(),
      ratio: `1:${form.ratioWater}`,
      waterTemp: waterNum ?? 0,
      waterQuality: form.waterQuality.trim() || undefined,
      grindSize: form.grindSize.trim(),
      rating: form.rating,
      notes: form.notes.trim(),
      improvement: form.improvement.trim()
    };

    // 后端会自动处理库存扣减和出库记录创建
    await storage.createTastingRecord(newRecord);

    uni.showToast({ title: '记录成功' });
    resetForm();
    closeAddModal();
    loadData();
  } catch (error) {
    console.error('保存记录失败:', error);
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    isSubmitting.value = false;
  }
};

const closeAddModal = () => {
  showAddModal.value = false;
};

const chooseBean = () => {
  if (beans.value.length === 0) {
    uni.showToast({ title: '请先添加咖啡豆', icon: 'none' });
    return;
  }
  const list = ['全部', ...beans.value.map(b => b.name || '未命名')];
  (uni as any).showActionSheet({
    itemList: list,
    success: (res: any) => {
      if (res.tapIndex === 0) {
        targetBeanId.value = '';
      } else {
        const idx = res.tapIndex - 1;
        const bean = beans.value[idx];
        if (bean) targetBeanId.value = bean.id;
      }
    }
  });
};

const pickBeanForAdd = () => {
  if (beans.value.length === 0) {
    uni.showToast({ title: '请先添加咖啡豆', icon: 'none' });
    return;
  }
  (uni as any).showActionSheet({
    itemList: beans.value.map(b => b.name || '未命名'),
    success: (res: any) => {
      const bean = beans.value[res.tapIndex];
      if (bean) {
        targetBeanId.value = bean.id;
        resetForm();
        showAddModal.value = true;
      }
    }
  });
};

const openAdd = () => {
  if (!targetBeanId.value) {
    pickBeanForAdd();
    return;
  }
  resetForm();
  showAddModal.value = true;
};

const formatExtras = (record: TastingRecord) => {
  const parts: string[] = [];
  const grinder = (record.grinder || '').trim();
  const grindSize = (record.grindSize || '').trim();
  const dripper = (record.dripper || '').trim();
  const filterPaper = (record.filterPaper || '').trim();
  if (grinder) parts.push(`磨豆机：${grinder}`);
  if (grindSize) parts.push(`研磨度：${grindSize}`);
  if (dripper) parts.push(`滤杯：${dripper}`);
  if (filterPaper) parts.push(`滤纸：${filterPaper}`);
  return parts.join(' · ');
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

.record-list {
  height: calc(100vh - 160px);
}

.record-card {
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  transition: all var(--transition-normal);
}

.record-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.record-details {
  margin-bottom: var(--space-sm);
}

.record-notes {
  border-top: 1px solid var(--border-light);
  padding-top: var(--space-sm);
}

.record-improvement {
  border-top: 1px solid var(--border-light);
  padding-top: var(--space-sm);
  margin-top: var(--space-sm);
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm) var(--space-md);
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 48px;
  padding: 0 var(--space-md);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--card);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.radio-item:active {
  transform: scale(0.98);
}

.radio-text {
  font-size: var(--font-size-md);
  color: var(--text);
}

.mt-10 {
  margin-top: var(--space-md);
}

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
  z-index: 100;
  padding: var(--space-md);
  padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom));
}

.ratio-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--bg);
  border: 1.5px solid var(--border);
}

.ratio-prefix {
  font-size: var(--font-size-md);
  color: var(--text-muted);
}

.ratio-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text);
}

.modal-content {
  background: var(--card);
  width: 90%;
  max-height: 80%;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
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
  font-size: var(--font-size-xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-xl);
  color: var(--text);
}

.modal-form {
  flex: 1;
  overflow-y: auto;
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

.input, .textarea {
  background: var(--bg);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  width: 100%;
  box-sizing: border-box;
  font-size: var(--font-size-md);
  display: block;
  border: 1.5px solid var(--border);
  position: relative;
  z-index: 1;
  cursor: text;
  transition: all var(--transition-fast);
}

.input:focus, .textarea:focus {
  border-color: var(--primary-light);
  background: var(--card);
  box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.1);
}

.input {
  height: 48px;
}

.textarea {
  height: 120px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.modal-actions button {
  flex: 1;
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
