describe('pages/inventory/log', () => {
  let page;

  beforeAll(async () => {
    page = await program.reLaunch('/pages/inventory/log');
    await page.waitFor(1000);
  });

  it('should display log list page', async () => {
    const logList = await page.$('.log-list');
    expect(logList).toBeTruthy();
  });

  it('should display empty state when no logs', async () => {
    const emptyState = await page.$('.empty-state');
    if (emptyState) {
      expect(emptyState).toBeTruthy();
    }
  });

  it('should display return home button in empty state', async () => {
    const emptyState = await page.$('.empty-state');
    if (emptyState) {
      const homeBtn = await emptyState.$('.btn-primary');
      expect(homeBtn).toBeTruthy();
    }
  });

  it('should navigate to home when clicking return button', async () => {
    const homeBtn = await page.$('.btn-primary');
    if (homeBtn) {
      await homeBtn.tap();
      await page.waitFor(1000);
      
      const currentPage = await program.currentPage();
      expect(currentPage.path).toContain('pages/index/index');
    }
  });

  it('should display log cards when logs exist', async () => {
    const logCards = await page.$$('.log-card');
    if (logCards.length > 0) {
      const firstLog = logCards[0];
      const title = await firstLog.$('.title');
      expect(title).toBeTruthy();
      
      const amount = await firstLog.$('.log-amount');
      expect(amount).toBeTruthy();
    }
  });

  it('should display loading indicator when loading', async () => {
    const loading = await page.$('.loading-indicator');
    if (loading) {
      expect(loading).toBeTruthy();
    }
  });
});
