<template>
  <view class="page">
    <view class="page-inner">
      <scroll-view 
        scroll-y 
        class="log-list" 
        aria-label="出入库记录列表"
        @scrolltolower="loadMoreLogs"
        :lower-threshold="100"
      >
        <view v-if="logs.length === 0 && !loading" class="empty-state">
          <text class="body">暂无出入库记录</text>
          <view style="margin-top: 16px">
            <button class="btn btn-primary" @click="goHome" aria-label="返回库存页">返回库存</button>
          </view>
        </view>
        <view v-for="log in sortedLogs" :key="log.id" class="log-card card" :aria-label="`记录 ${getBeanName(log.beanId)} ${log.type === 'IN' ? '入库' : '出库'} ${log.amount}g`">
          <view class="log-info">
            <text class="title">{{ getBeanName(log.beanId) }}</text>
            <text class="log-date caption">{{ formatDate(log.date) }}</text>
            <text v-if="log.type === 'IN' && log.roastDate" class="log-date caption">烘焙 {{ log.roastDate }}</text>
          </view>
          <view class="log-amount" :class="log.type" aria-label="出入库数量">
            <text>{{ log.type === 'IN' ? '+' : '-' }}{{ log.amount }}g</text>
          </view>
        </view>
        
        <view v-if="loading" class="loading-indicator">
          <text class="caption">加载中...</text>
        </view>
        
        <view v-if="!hasMore && logs.length > 0" class="no-more-indicator">
          <text class="caption">已加载全部</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow, onLoad } from '@dcloudio/uni-app';
import { storage, localCache } from '../../utils/storage';
import { InventoryLog, CoffeeBean } from '../../types';

const logs = ref<InventoryLog[]>([]);
const beans = ref<CoffeeBean[]>([]);
const targetBeanId = ref<string | null>(null);

// 分页相关状态
const loading = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const PAGE_LIMIT = 20;

onLoad((options) => {
  if (options?.beanId) {
    targetBeanId.value = options.beanId as string;
  } else {
    const storedId = uni.getStorageSync('TARGET_BEAN_ID');
    if (storedId) {
      targetBeanId.value = storedId;
      uni.removeStorageSync('TARGET_BEAN_ID');
    }
  }
});

const loadData = async () => {
  loading.value = true;
  try {
    currentPage.value = 1;
    
    let beansResult: CoffeeBean | CoffeeBean[] | null;
    if (targetBeanId.value) {
      const bean = await storage.getBeanById(targetBeanId.value);
      beansResult = bean ? [bean] : [];
    } else {
      const result = await storage.getBeans(1, 1000);
      beansResult = result.data;
    }
    
    const logsResult = targetBeanId.value
      ? await storage.getLogs(targetBeanId.value, 1, PAGE_LIMIT)
      : await storage.getLogs(undefined, 1, PAGE_LIMIT);

    beans.value = Array.isArray(beansResult) ? beansResult : [];
    logs.value = logsResult.data;
    hasMore.value = logsResult.pagination.hasMore;
  } catch (error) {
    console.error('Failed to load data:', error);
    const cachedBeans = targetBeanId.value
      ? localCache.getBeans().filter(b => b.id === targetBeanId.value)
      : localCache.getBeans();
    const cachedLogs = targetBeanId.value
      ? localCache.getLogs().filter(log => log.beanId === targetBeanId.value)
      : localCache.getLogs();
    beans.value = cachedBeans;
    logs.value = cachedLogs.slice(0, PAGE_LIMIT);
    hasMore.value = cachedLogs.length > PAGE_LIMIT;
  } finally {
    loading.value = false;
  }
};

const loadMoreLogs = async () => {
  if (loading.value || !hasMore.value) return;
  
  loading.value = true;
  try {
    const nextPage = currentPage.value + 1;
    const logsPromise = targetBeanId.value
      ? storage.getLogs(targetBeanId.value, nextPage, PAGE_LIMIT)
      : storage.getLogs(undefined, nextPage, PAGE_LIMIT);
    
    const logsResult = await logsPromise;
    
    if (logsResult.data.length > 0) {
      logs.value = [...logs.value, ...logsResult.data];
      currentPage.value = nextPage;
      hasMore.value = logsResult.pagination.hasMore;
    } else {
      hasMore.value = false;
    }
  } catch (error) {
    console.error('Failed to load more logs:', error);
    hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

onShow(() => {
  loadData();
});

const sortedLogs = computed(() => {
  return [...logs.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const getBeanName = (id: string) => {
  const bean = beans.value.find(b => b.id === id);
  return bean ? bean.name : '未知咖啡豆';
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const goHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  });
};
</script>

<style scoped>
.log-list {
  height: calc(100vh - 60px);
}

.log-card {
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--transition-normal);
}

.log-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.log-info {
  min-width: 0;
  flex: 1;
}

.log-date {
  display: block;
  margin-top: var(--space-xs);
  color: var(--text-subtle);
}

.log-amount {
  font-size: var(--font-size-xl);
  font-weight: 700;
  padding-left: var(--space-md);
  border-left: 1px solid var(--border-light);
  margin-left: var(--space-md);
}

.log-amount.IN {
  color: var(--success);
}

.log-amount.OUT {
  color: var(--danger);
}

.loading-indicator,
.no-more-indicator {
  padding: var(--space-lg);
  text-align: center;
  color: var(--text-subtle);
}

.loading-indicator {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
