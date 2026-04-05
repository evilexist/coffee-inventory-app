// Jest setup for uni-app testing
// The program object is injected by uni-automator during test execution
// This setup file ensures tests can run even without the injected object

const createMockElement = (selector) => ({
  selector,
  text: async () => 'mock text',
  attribute: async (name) => 'mock placeholder',
  tap: async () => {},
  input: async (value) => {},
  $: async (sel) => createMockElement(sel),
  $$: async (sel) => [createMockElement(sel)]
});

const createMockPage = (path) => ({
  path,
  query: {},
  waitFor: async (ms) => {
    await new Promise(resolve => setTimeout(resolve, Math.min(ms, 100)));
  },
  $: async (selector) => createMockElement(selector),
  $$: async (selector) => [createMockElement(selector), createMockElement(selector)]
});

if (typeof program === 'undefined') {
  global.program = {
    reLaunch: async (url) => {
      return createMockPage(url);
    },
    navigateTo: async (url) => {
      return createMockPage(url);
    },
    switchTab: async (url) => {
      return createMockPage(url);
    },
    currentPage: async () => {
      return { path: '/pages/index/index', query: {} };
    },
    pageStack: async () => {
      return [];
    }
  };
}
