<template>
  <view class="page">
    <view class="page-inner">
      <text class="section-title">📋 基础信息</text>
      <view class="form-group" @click="focusName = true">
        <text class="label">咖啡豆名称</text>
        <input
          class="input"
          v-model="form.name"
          :focus="focusName"
          placeholder="例如：耶加雪菲"
          aria-label="咖啡豆名称"
          @blur="focusName = false"
        />
        <text v-if="errors.name" class="field-error" role="alert">{{ errors.name }}</text>
      </view>

      <view class="form-group" @click="focusBrandRoaster = true">
        <text class="label">品牌/烘焙者</text>
        <input
          class="input"
          v-model="form.brandRoaster"
          :focus="focusBrandRoaster"
          placeholder="例如：Seesaw"
          aria-label="品牌/烘焙者"
          @blur="focusBrandRoaster = false"
        />
      </view>

      <view class="form-group" @click="focusOriginCountry = true">
        <text class="label">产地国</text>
        <input
          class="input"
          v-model="form.originCountry"
          :focus="focusOriginCountry"
          placeholder="例如：埃塞俄比亚"
          aria-label="产地国"
          @blur="focusOriginCountry = false"
        />
      </view>

      <view class="form-group" @click="focusOriginRegion = true">
        <text class="label">产区</text>
        <input
          class="input"
          v-model="form.originRegion"
          :focus="focusOriginRegion"
          placeholder="例如：耶加雪菲"
          aria-label="产区"
          @blur="focusOriginRegion = false"
        />
      </view>

      <view class="form-group" @click="focusProducer = true">
        <text class="label">庄园/生产者/处理商</text>
        <input
          class="input"
          v-model="form.producer"
          :focus="focusProducer"
          placeholder="例如：Gedeo Zone Cooperative"
          aria-label="庄园/生产者/处理商"
          @blur="focusProducer = false"
        />
      </view>

      <view class="form-group" @click="focusAltitude = true">
        <text class="label">种植海拔</text>
        <input
          class="input"
          v-model="form.altitude"
          :focus="focusAltitude"
          placeholder="例如：1800-2000m"
          aria-label="种植海拔"
          @blur="focusAltitude = false"
        />
      </view>

      <view class="form-group" @click="focusVariety = true">
        <text class="label">豆种</text>
        <input
          class="input"
          v-model="form.variety"
          :focus="focusVariety"
          placeholder="例如：Heirloom"
          aria-label="豆种"
          @blur="focusVariety = false"
        />
      </view>

      <view class="form-group">
        <text class="label">烘焙程度</text>
        <view class="picker-container" aria-label="烘焙程度选择">
          <picker @change="onRoastChange" :value="roastIndex" :range="roastLevels">
            <view class="picker">
              {{ roastLevels[roastIndex] }}
            </view>
          </picker>
        </view>
      </view>

      <view class="form-group" @click="focusAgtron = true">
        <text class="label">烘焙色值 Agtron</text>
        <view class="input-with-suffix">
          <input
            class="input"
            type="number"
            v-model="form.agtron"
            :focus="focusAgtron"
            placeholder="例如：85（0-100，数值越小烘焙度越深）"
            aria-label="烘焙色值 Agtron（0-100）"
            @blur="focusAgtron = false"
          />
          <text class="suffix"></text>
        </view>
      </view>

      <view class="form-group" @click="processOptions[processIndex] === '其他' ? (focusProcess = true) : undefined">
        <text class="label">处理方式</text>
        <view class="picker-container" aria-label="处理方式选择">
          <picker @change="onProcessChange" :value="processIndex" :range="processOptions">
            <view class="picker">
              {{ processOptions[processIndex] }}
            </view>
          </picker>
        </view>
        <input
          v-if="processOptions[processIndex] === '其他'"
          class="input mt-10"
          v-model="customProcess"
          :focus="focusProcess"
          placeholder="请输入处理方式"
          aria-label="自定义处理方式"
          @blur="focusProcess = false"
        />
        <text v-if="errors.process" class="field-error" role="alert">{{ errors.process }}</text>
      </view>

      <text class="section-title" style="margin-top: 6px">📦 批次信息</text>

      <view class="form-group">
        <text class="label">烘焙日期</text>
        <view class="picker-container" aria-label="烘焙日期选择">
          <picker mode="date" :value="form.roastDate" @change="onRoastDateChange">
            <view class="picker">
              {{ form.roastDate || '请选择烘焙日期' }}
            </view>
          </picker>
        </view>
        <text v-if="errors.roastDate" class="field-error" role="alert">{{ errors.roastDate }}</text>
      </view>

      <view class="form-group" @click="focusPrice = true">
        <text class="label">参考价格</text>
        <view class="input-with-suffix">
          <input
            class="input"
            type="number"
            v-model="form.referencePrice"
            :focus="focusPrice"
            placeholder="例如：98"
            aria-label="参考价格（元）"
            @blur="focusPrice = false"
          />
          <text class="suffix">元</text>
        </view>
        <text v-if="errors.referencePrice" class="field-error" role="alert">{{ errors.referencePrice }}</text>
      </view>

      <view class="form-group" @click="focusStock = true">
        <text class="label">初始重量</text>
        <view class="input-with-suffix">
          <input
            class="input"
            type="number"
            v-model="form.stock"
            :focus="focusStock"
            placeholder="例如：250"
            aria-label="初始重量（克）"
            @blur="focusStock = false"
          />
          <text class="suffix">g</text>
        </view>
        <text v-if="errors.stock" class="field-error" role="alert">{{ errors.stock }}</text>
      </view>

      <view class="form-group" @click="focusFlavorNotes = true">
        <text class="label">风味描述</text>
        <textarea
          class="textarea"
          v-model="form.flavorNotes"
          :focus="focusFlavorNotes"
          placeholder="例如：茉莉花香、柑橘、白桃、蜂蜜"
          aria-label="风味描述"
          @blur="focusFlavorNotes = false"
        />
      </view>

      <view class="form-group" @click="focusDesc = true">
        <text class="label">备注</text>
        <textarea
          class="textarea"
          v-model="form.description"
          :focus="focusDesc"
          placeholder="其他补充信息..."
          aria-label="备注"
          @blur="focusDesc = false"
        />
      </view>

      <button class="btn btn-primary save-btn" :disabled="isSaving" @click="save" aria-label="保存咖啡豆">
        {{ isSaving ? '保存中…' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { storage } from '../../utils/storage';
import { CoffeeBean } from '../../types';
import { generateBeanId, generateId } from '../../utils/common';

const roastLevels = ['极浅烘焙', '浅度烘焙', '浅中度烘焙', '中度烘焙', '中深度烘焙', '深烘焙', '极深烘焙'];
const roastIndex = ref(3); // 默认为中度烘焙

const processOptions = ['日晒', '水洗', '蜜处理', '湿刨法', '其他'];
const processIndex = ref(0);
const customProcess = ref('');

const focusName = ref(false);
const focusBrandRoaster = ref(false);
const focusOriginCountry = ref(false);
const focusOriginRegion = ref(false);
const focusProducer = ref(false);
const focusAltitude = ref(false);
const focusVariety = ref(false);
const focusAgtron = ref(false);
const focusProcess = ref(false);
const focusStock = ref(false);
const focusPrice = ref(false);
const focusFlavorNotes = ref(false);
const focusDesc = ref(false);
const isSaving = ref(false);

const errors = reactive({
  name: '',
  process: '',
  roastDate: '',
  referencePrice: '',
  stock: ''
});

const form = reactive({
  name: '',
  brandRoaster: '',
  originCountry: '',
  originRegion: '',
  producer: '',
  altitude: '',
  variety: '',
  agtron: '',
  roastDate: '',
  stock: '',
  referencePrice: '',
  flavorNotes: '',
  description: ''
});

const onRoastChange = (e: any) => {
  roastIndex.value = e.detail.value;
};

const onProcessChange = (e: any) => {
  processIndex.value = e.detail.value;
  errors.process = '';
};

const onRoastDateChange = (e: any) => {
  form.roastDate = e.detail.value;
  errors.roastDate = '';
};

const save = async () => {
  if (isSaving.value) return;
  errors.name = '';
  errors.process = '';
  errors.roastDate = '';
  errors.referencePrice = '';
  errors.stock = '';

  if (!form.name.trim()) {
    errors.name = '咖啡豆名称不能为空';
    uni.showToast({ title: '请完善必填信息', icon: 'none' });
    return;
  }

  const finalProcess = processOptions[processIndex.value] === '其他'
    ? customProcess.value.trim()
    : processOptions[processIndex.value];

  if (processOptions[processIndex.value] === '其他' && !finalProcess) {
    errors.process = '请输入处理方式';
    uni.showToast({ title: '请完善必填信息', icon: 'none' });
    return;
  }

  const roastDate = form.roastDate.trim();
  const stockRaw = String(form.stock ?? '').trim();
  const stockProvided = stockRaw !== '';
  const roastDateProvided = roastDate !== '';

  if (stockProvided && !roastDateProvided) {
    errors.roastDate = '请填写烘焙日期（与重量关联）';
    uni.showToast({ title: '请完善批次信息', icon: 'none' });
    return;
  }

  if (roastDateProvided && !stockProvided) {
    errors.stock = '请填写重量（与烘焙日期关联）';
    uni.showToast({ title: '请完善批次信息', icon: 'none' });
    return;
  }

  const stockNum = stockProvided ? Math.round(Number(stockRaw)) : 0;
  if (stockProvided && (!Number.isFinite(stockNum) || stockNum < 0)) {
    errors.stock = '重量需为不小于0的数字';
    uni.showToast({ title: '请检查数字输入', icon: 'none' });
    return;
  }

  const priceRaw = String(form.referencePrice ?? '').trim();
  const priceProvided = priceRaw !== '';
  const priceNum = priceProvided ? Number(priceRaw) : undefined;
  if (priceProvided && (!Number.isFinite(priceNum) || (priceNum as number) < 0)) {
    errors.referencePrice = '参考价格需为不小于0的数字';
    uni.showToast({ title: '请检查数字输入', icon: 'none' });
    return;
  }

  const agtronRaw = String(form.agtron ?? '').trim();
  const agtronProvided = agtronRaw !== '';
  const agtronNum = agtronProvided ? Number(agtronRaw) : undefined;
  if (agtronProvided && agtronNum !== undefined) {
    if (!Number.isFinite(agtronNum) || agtronNum < 0 || agtronNum > 100) {
      uni.showToast({ title: 'Agtron值请在0-100之间', icon: 'none' });
      return;
    }
  }

  isSaving.value = true;

  const newBean: CoffeeBean = {
    id: generateBeanId(),
    name: form.name.trim(),
    originCountry: form.originCountry.trim(),
    originRegion: form.originRegion.trim(),
    origin: [form.originCountry.trim(), form.originRegion.trim()].filter(Boolean).join('·'),
    brandRoaster: form.brandRoaster.trim(),
    producer: form.producer.trim(),
    altitude: form.altitude.trim(),
    variety: form.variety.trim(),
    flavorNotes: form.flavorNotes.trim(),
    roastLevel: roastLevels[roastIndex.value],
    agtron: agtronNum as number | undefined,
    process: finalProcess,
    roastDate,
    referencePrice: priceNum as number | undefined,
    stock: stockNum,
    description: form.description.trim()
  };

  try {
    const savedBean = await storage.createBean(newBean);

    // 如果初始库存大于0，自动创建入库记录
    if (stockNum > 0) {
      try {
        await storage.createLog({
          id: generateId('log'),
          beanId: savedBean.id,  // 使用服务器返回的真实ID
          type: 'IN',
          amount: stockNum,
          date: new Date().toISOString(),
          roastDate: roastDate || undefined,
          note: '由系统初始化入库'
        });
      } catch (logError) {
        console.warn('创建入库记录失败:', logError);
        // 不阻断流程，只是警告用户
        uni.showToast({
          title: '咖啡豆已保存，但入库记录创建失败',
          icon: 'none'
        });
      }
    }

    uni.showToast({ title: '保存成功' });
    setTimeout(() => {
      isSaving.value = false;
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error('保存失败:', error);
    isSaving.value = false;
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
};
</script>

<style scoped>
.section-title {
  display: block;
  margin: var(--space-lg) 0 var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-subtle);
  letter-spacing: 0.8px;
  font-weight: 600;
  text-transform: uppercase;
}

.form-group {
  margin-bottom: var(--space-xl);
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

.mt-10 {
  margin-top: var(--space-md);
}

.picker {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
  font-size: var(--font-size-md);
}

.textarea {
  height: 120px;
  padding: var(--space-md);
  line-height: 1.6;
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

.save-btn {
  width: 100%;
  margin-top: var(--space-2xl);
  height: 52px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.save-btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-error {
  display: block;
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--danger);
  font-weight: 500;
}
</style>
