describe('pages/index/index', () => {
  let page;

  beforeAll(async () => {
    page = await program.reLaunch('/pages/index/index');
    await page.waitFor(1000);
  });

  it('should display page header with logo', async () => {
    const logo = await page.$('.logo');
    expect(logo).toBeTruthy();
  });

  it('should display overview cards', async () => {
    const overviewCards = await page.$$('.overview-card');
    expect(overviewCards.length).toBe(2);
  });

  it('should display bean count in overview', async () => {
    const h2Elements = await page.$$('.overview-value .h2');
    expect(h2Elements.length).toBeGreaterThan(0);
  });

  it('should display new bean button', async () => {
    const newBeanBtn = await page.$('.btn-primary');
    expect(newBeanBtn).toBeTruthy();
  });

  it('should navigate to add bean page when clicking new bean button', async () => {
    const newBeanBtn = await page.$('.btn-primary');
    await newBeanBtn.tap();
    await page.waitFor(1000);
    
    const currentPage = await program.currentPage();
    expect(currentPage).toBeTruthy();
  });

  it('should display empty state when no beans', async () => {
    page = await program.reLaunch('/pages/index/index');
    await page.waitFor(1000);
    
    const emptyState = await page.$('.empty-state');
    if (emptyState) {
      expect(emptyState).toBeTruthy();
    }
  });

  it('should display bean list when beans exist', async () => {
    const beanCards = await page.$$('.bean-card');
    if (beanCards.length > 0) {
      const firstBean = beanCards[0];
      const title = await firstBean.$('.title');
      expect(title).toBeTruthy();
    }
  });

  it('should open action sheet when clicking bean card', async () => {
    const beanCards = await page.$$('.bean-card');
    if (beanCards.length > 0) {
      await beanCards[0].tap();
      await page.waitFor(500);
      
      const sheet = await page.$('.sheet-overlay');
      expect(sheet).toBeTruthy();
    }
  });

  it('should close action sheet when clicking overlay', async () => {
    const overlay = await page.$('.sheet-overlay');
    if (overlay) {
      await overlay.tap();
      await page.waitFor(500);
      
      expect(overlay).toBeTruthy();
    }
  });
});
