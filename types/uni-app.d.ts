// uni-app 全局变量类型声明
declare const uni: {
  getStorageSync(key: string): any;
  setStorageSync(key: string, value: any): void;
  removeStorageSync(key: string): void;
  switchTab(options: { url: string }): void;
  navigateTo(options: { url: string }): void;
  navigateBack(options?: { delta: number }): void;
  showToast(options: { title: string; icon?: string }): void;
  showModal(options: {
    title: string;
    content: string;
    showCancel?: boolean;
    success?(res: { confirm: boolean }): void;
  }): void;
  getSystemInfoSync(): {
    platform: string;
    windowWidth: number;
    windowHeight: number;
  };
  request(options: {
    url: string;
    method?: string;
    header?: Record<string, string>;
    data?: any;
    success?(res: { data: any }): void;
    fail?(err: any): void;
  }): void;
};
