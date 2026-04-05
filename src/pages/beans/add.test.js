describe('pages/beans/add', () => {
  let page;

  beforeAll(async () => {
    page = await program.reLaunch('/pages/beans/add');
    await page.waitFor(1000);
  });

  it('should display page title', async () => {
    const title = await page.$('.section-title');
    expect(title).toBeTruthy();
  });

  it('should display all form inputs', async () => {
    const inputs = await page.$$('.input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should display bean name input', async () => {
    const inputs = await page.$$('.input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should display roast level picker', async () => {
    const pickers = await page.$$('.picker');
    expect(pickers.length).toBeGreaterThan(0);
  });

  it('should display process method picker', async () => {
    const pickers = await page.$$('.picker');
    expect(pickers.length).toBeGreaterThan(1);
  });

  it('should display submit button', async () => {
    const submitBtn = await page.$('.btn-primary');
    expect(submitBtn).toBeTruthy();
  });

  it('should show validation error when submitting empty form', async () => {
    const submitBtn = await page.$('.btn-primary');
    await submitBtn.tap();
    await page.waitFor(500);
    
    const errors = await page.$$('.field-error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should successfully submit form with valid data', async () => {
    const inputs = await page.$$('.input');
    
    await inputs[0].input('测试咖啡豆');
    await page.waitFor(300);
    
    await inputs[1].input('测试品牌');
    await page.waitFor(300);
    
    const submitBtn = await page.$('.btn-primary');
    await submitBtn.tap();
    await page.waitFor(2000);
    
    const currentPage = await program.currentPage();
    expect(currentPage.path).toContain('pages/index/index');
  });
});
