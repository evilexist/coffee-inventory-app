<template>
  <view class="login-page">
    <view class="login-container">
      <view class="login-header">
        <image class="logo" src="/static/logo_coffee_box.png" mode="aspectFit"></image>
      </view>
      
      <view class="login-form">
        <view class="form-group">
          <view class="error-container">
            <text v-if="error" class="error-message">{{ error }}</text>
          </view>
          <text class="label">用户名</text>
          <input 
            class="input" 
            type="text" 
            v-model="username" 
            placeholder="请输入用户名"
            :disabled="loading"
          />
        </view>
        
        <view class="form-group">
          <text class="label">密码</text>
          <input 
            class="input" 
            type="password" 
            v-model="password" 
            placeholder="请输入密码"
            :disabled="loading"
          />
        </view>
        
        <button 
          class="btn btn-primary login-btn" 
          @click="handleLogin"
          :disabled="loading || !username || !password"
        >
          <text v-if="loading">登录中...</text>
          <text v-else>登录</text>
        </button>
      </view>
      
      <view class="login-footer">
        <text class="caption" style="display:block;">没有账号？请联系管理员获取</text>
        <text class="caption" style="display:block; margin-top:6px;">Coffee Box v{{ version }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue';
import { api } from '../../utils/api';
import pkg from '../../../package.json';

export default {
  name: 'LoginPage',
  setup() {
    const username = ref('');
    const password = ref('');
    const loading = ref(false);
    const error = ref('');
    const version = ref(pkg.version);
    
    const handleLogin = async () => {
      if (!username.value || !password.value) {
        error.value = '请输入用户名和密码';
        return;
      }
      
      loading.value = true;
      error.value = '';
      
      try {
        // 调用登录API
        const result = await api.login(username.value, password.value);
        
        if (!result.success) {
          error.value = result.error || '登录失败，请稍后重试';
          loading.value = false;
          return;
        }
        
        // 保存token和用户信息到本地存储
        uni.setStorageSync('auth_token', result.token);
        uni.setStorageSync('user_info', result.user);
        
        // 跳转到首页
        uni.switchTab({
          url: '/pages/index/index'
        });
        
      } catch (err) {
        console.error('登录失败:', err);
        error.value = '登录失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    };
    
    return {
      username,
      password,
      loading,
      error,
      version,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  display: block;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  color: var(--text);
  background: var(--bg);
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-container {
  min-height: 24px;
  margin-bottom: 8px;
}

.error-message {
  /*
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px;
  */
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
}

.login-btn {
  width: 100%;
  height: 52px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: white !important;
  box-shadow: 0 4px 12px rgba(139, 90, 43, 0.25);
  margin-top: 32px;
}

.login-btn:disabled {
  color: white !important;
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.login-footer .caption {
  color: var(--text-muted);
  font-size: 11px;
  opacity: 0.6;
}
</style>