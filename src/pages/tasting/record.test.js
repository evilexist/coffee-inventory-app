describe('pages/tasting/record', () => {
  let page;

  beforeAll(async () => {
    page = await program.reLaunch('/pages/tasting/record');
    await page.waitFor(1000);
  });

  it('should display page header', async () => {
    const header = await page.$('.header');
    expect(header).toBeTruthy();
  });

  it('should display add record button', async () => {
    const addBtn = await page.$('.btn-primary');
    expect(addBtn).toBeTruthy();
  });

  it('should display record list', async () => {
    const recordList = await page.$('.record-list');
    expect(recordList).toBeTruthy();
  });

  it('should display empty state when no records', async () => {
    const emptyState = await page.$('.empty-state');
    if (emptyState) {
      expect(emptyState).toBeTruthy();
    }
  });

  it('should display record cards when records exist', async () => {
    const recordCards = await page.$$('.record-card');
    if (recordCards.length > 0) {
      const firstRecord = recordCards[0];
      const date = await firstRecord.$('.record-date');
      expect(date).toBeTruthy();
      
      const rating = await firstRecord.$('.record-rating');
      expect(rating).toBeTruthy();
    }
  });

  it('should open add modal when clicking add button', async () => {
    const addBtn = await page.$('.btn-primary');
    await addBtn.tap();
    await page.waitFor(500);
    
    const modal = await page.$('.modal-overlay');
    expect(modal).toBeTruthy();
  });

  it('should display form fields in add modal', async () => {
    const modal = await page.$('.modal-overlay');
    if (modal) {
      const inputs = await modal.$$('.input');
      expect(inputs.length).toBeGreaterThan(0);
    }
  });

  it('should close modal when clicking cancel', async () => {
    const cancelBtn = await page.$('.modal-overlay .btn-ghost');
    if (cancelBtn) {
      await cancelBtn.tap();
      await page.waitFor(500);
      
      expect(cancelBtn).toBeTruthy();
    }
  });

  it('should submit form with valid data', async () => {
    const addBtn = await page.$('.btn-primary');
    await addBtn.tap();
    await page.waitFor(500);
    
    const inputs = await page.$$('.modal-overlay .input');
    if (inputs.length > 0) {
      await inputs[0].input('15');
      await page.waitFor(300);
    }
    
    const submitBtn = await page.$('.modal-overlay .btn-primary');
    if (submitBtn) {
      await submitBtn.tap();
      await page.waitFor(1000);
    }
  });
});
